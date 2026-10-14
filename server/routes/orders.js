import { Router } from 'express'
import crypto from 'node:crypto'
import fs from 'node:fs'
import { config } from '../config.js'
import { asyncH, AppError, validate, z, now } from '../lib/http.js'
import { requireAuth, requireVerified } from '../lib/auth.js'
import { createCheckout, releaseOrder, refundOrder, cancelPending, markShipped } from '../lib/orders.js'
import { settlePayment, failPayment } from '../lib/payments.js'
import { startPayment } from '../lib/paymentsInit.js'
import * as paystack from '../lib/paystack.js'
import { notify } from '../lib/notify.js'
import { uploadPrivate, checkImages, removeFiles, privateName, privatePath } from '../lib/uploads.js'
import { COMPLAINT_TYPES } from '../lib/constants.js'

const checkoutSchema = z.object({
  items: z.array(z.object({ productId: z.string().min(1).max(60), qty: z.coerce.number().int().min(1).max(20) })).min(1).max(20),
  delivery: z.enum(['delivery', 'pickup']),
  name: z.string().trim().min(3).max(80), phone: z.string().trim().regex(/^0[789][01]\d{8}$/, 'enter an 11-digit Nigerian number'),
  place: z.string().trim().max(120).optional(), detail: z.string().trim().max(160).optional(), note: z.string().trim().max(100).optional()
}).refine((d) => d.delivery === 'pickup' || !!d.place, { message: 'place: choose a delivery location', path: ['place'] })

const ACTIVE = ['paid', 'shipped', 'delivered']

/** What the signed-in viewer is allowed to do next on this order. */
function actionsFor(o, viewerId, isAdmin, hasReview) {
  const a = []
  const buyer = o.buyer_id === viewerId, seller = o.seller_id === viewerId
  if (seller && o.status === 'paid') a.push('ship')
  if (seller && ['paid', 'shipped'].includes(o.status)) a.push('deliver')
  if (buyer && ACTIVE.includes(o.status)) a.push('confirm', 'complain')
  if ((buyer || seller) && o.status === 'paid') a.push('cancel')
  if (buyer && o.status === 'confirmed' && !hasReview) a.push('review')
  if (isAdmin && o.status === 'disputed') a.push('resolve')
  return a
}

export function paystackWebhook(db) {
  return asyncH(async (req, res) => {
    if (!paystack.validSignature(req.body, req.get('x-paystack-signature'))) return res.status(401).end()
    let evt; try { evt = JSON.parse(req.body.toString('utf8')) } catch { return res.status(400).end() }
    if (evt.event === 'charge.success' && evt.data?.reference) {
      try { await settlePayment(db, evt.data.reference, Math.round(Number(evt.data.amount) / 100)) } catch (e) { if (!(e instanceof AppError)) throw e }
    }
    res.status(200).end() // always 200 once the signature is valid so Paystack stops retrying
  })
}

export default function orderRoutes(db) {
  const r = Router()

  const loadOrder = async (id, user) => {
    const o = await db('orders').where({ id }).first()
    if (!o || (o.buyer_id !== user.id && o.seller_id !== user.id && !user.is_admin)) throw new AppError(404, 'Order not found.', 'NOT_FOUND')
    return o
  }

  const dto = async (o, viewer) => {
    const [items, buyer, seller, complaint, review] = await Promise.all([
      db('order_items').where({ order_id: o.id }),
      db('users').where({ id: o.buyer_id }).first('id', 'name'), db('users').where({ id: o.seller_id }).first('id', 'name'),
      db('complaints').where({ order_id: o.id }).orderBy('created_at', 'desc').first(), db('reviews').where({ order_id: o.id }).first()
    ])
    return {
      id: o.id, code: o.code, status: o.status, subtotal: o.subtotal, deliveryFee: o.delivery_fee, total: o.total, commission: o.commission, sellerPayout: o.seller_payout,
      deliveryMethod: o.delivery_method, address: o.address, note: o.note, hasReceipt: !!o.receipt_photo,
      createdAt: o.created_at, paidAt: o.paid_at, shippedAt: o.shipped_at, deliveredAt: o.delivered_at, confirmedAt: o.confirmed_at, autoReleaseAt: o.auto_release_at, cancelledAt: o.cancelled_at,
      items: items.map((i) => ({ productId: i.product_id, title: i.title, price: i.price, qty: i.qty, image: i.image })),
      buyer, seller,
      complaint: complaint ? { id: complaint.id, type: complaint.type, description: complaint.description, status: complaint.status, resolution: complaint.resolution, resolutionNote: complaint.resolution_note, createdAt: complaint.created_at } : null,
      review: review ? { rating: review.rating, comment: review.comment } : null,
      role: o.buyer_id === viewer.id ? 'buyer' : o.seller_id === viewer.id ? 'seller' : 'admin',
      actions: actionsFor(o, viewer.id, !!viewer.is_admin, !!review)
    }
  }

  r.post('/checkout', requireAuth, requireVerified, validate(checkoutSchema), asyncH(async (req, res) => {
    const d = req.valid
    const address = [d.name, d.phone, d.delivery === 'delivery' ? [d.place, d.detail].filter(Boolean).join(', ') : 'Pickup'].join(' · ')
    const out = await createCheckout(db, req.user, { items: d.items, delivery: d.delivery, address, note: d.note })
    try {
      const pay = await startPayment(req.user, { reference: out.reference, amount: out.amount })
      res.status(201).json({ ...pay, orders: out.orders })
    } catch (e) {
      // Provider refused to start the payment: undo the reservation right away.
      await db.transaction(async (trx) => { for (const id of out.orderIds) { const o = await trx('orders').where({ id }).first(); await cancelPending(trx, o) } })
      await failPayment(db, out.reference)
      throw e
    }
  }))

  // ---- payments ----
  r.post('/payments/:reference/mock-pay', requireAuth, asyncH(async (req, res) => {
    if (!config.mockPayments) throw new AppError(404, 'Not found.', 'NOT_FOUND')
    const p = await db('payments').where({ reference: req.params.reference, user_id: req.user.id }).first()
    if (!p) throw new AppError(404, 'Payment not found.', 'NOT_FOUND')
    await settlePayment(db, p.reference, p.amount)
    res.json({ status: 'success', kind: p.kind })
  }))

  r.post('/payments/:reference/verify', requireAuth, asyncH(async (req, res) => {
    const p = await db('payments').where({ reference: req.params.reference, user_id: req.user.id }).first()
    if (!p) throw new AppError(404, 'Payment not found.', 'NOT_FOUND')
    if (p.status === 'success') return res.json({ status: 'success', kind: p.kind })
    if (p.provider === 'mock') return res.json({ status: p.status, kind: p.kind })
    const d = await paystack.verify(p.reference)
    if (d.status === 'success') { await settlePayment(db, p.reference, Math.round(Number(d.amount) / 100)); return res.json({ status: 'success', kind: p.kind }) }
    if (['failed', 'abandoned', 'reversed'].includes(d.status)) await failPayment(db, p.reference)
    res.json({ status: d.status === 'success' ? 'success' : p.status, kind: p.kind })
  }))

  r.get('/payments/:reference', requireAuth, asyncH(async (req, res) => {
    const p = await db('payments').where({ reference: req.params.reference, user_id: req.user.id }).first()
    if (!p) throw new AppError(404, 'Payment not found.', 'NOT_FOUND')
    const meta = p.meta ? JSON.parse(p.meta) : {}
    const orders = meta.orderIds?.length ? await db('orders').whereIn('id', meta.orderIds).select('id', 'code') : []
    res.json({ status: p.status, kind: p.kind, amount: p.amount, orders })
  }))

  // ---- orders ----
  r.get('/orders', requireAuth, validate(z.object({ role: z.enum(['buyer', 'seller']).default('buyer'), status: z.string().max(30).optional() }), 'query'), asyncH(async (req, res) => {
    const col = req.valid.role === 'seller' ? 'seller_id' : 'buyer_id'
    const q = db('orders').where({ [col]: req.user.id }).whereNot({ status: 'pending_payment' }).orderBy('created_at', 'desc').limit(100)
    if (req.valid.status) q.andWhere({ status: req.valid.status })
    const rows = await q
    const items = rows.length ? await db('order_items').whereIn('order_id', rows.map((o) => o.id)) : []
    const by = {}; for (const i of items) (by[i.order_id] ??= []).push(i)
    const names = Object.fromEntries((await db('users').whereIn('id', rows.map((o) => (col === 'seller_id' ? o.buyer_id : o.seller_id))).select('id', 'name')).map((u) => [u.id, u.name]))
    res.json({
      items: rows.map((o) => ({
        id: o.id, code: o.code, status: o.status, total: o.total, subtotal: o.subtotal, sellerPayout: o.seller_payout, createdAt: o.created_at,
        counterpart: names[col === 'seller_id' ? o.buyer_id : o.seller_id], items: (by[o.id] || []).map((i) => ({ title: i.title, qty: i.qty, image: i.image, productId: i.product_id }))
      }))
    })
  }))

  r.get('/orders/:id', requireAuth, asyncH(async (req, res) => res.json({ order: await dto(await loadOrder(req.params.id, req.user), req.user) })))

  r.post('/orders/:id/ship', requireAuth, asyncH(async (req, res) => {
    const o = await loadOrder(req.params.id, req.user)
    if (o.seller_id !== req.user.id) throw new AppError(403, 'Only the seller can do this.', 'FORBIDDEN')
    await db.transaction((trx) => markShipped(trx, o, 'shipped'))
    res.json({ order: await dto(await loadOrder(o.id, req.user), req.user) })
  }))
  r.post('/orders/:id/deliver', requireAuth, asyncH(async (req, res) => {
    const o = await loadOrder(req.params.id, req.user)
    if (o.seller_id !== req.user.id) throw new AppError(403, 'Only the seller can do this.', 'FORBIDDEN')
    await db.transaction((trx) => markShipped(trx, o, 'delivered'))
    res.json({ order: await dto(await loadOrder(o.id, req.user), req.user) })
  }))

  // Buyer confirms receipt WITH a photo -> escrow releases to the seller.
  r.post('/orders/:id/confirm', requireAuth, uploadPrivate.single('photo'), asyncH(async (req, res) => {
    const file = req.file
    try {
      const o = await loadOrder(req.params.id, req.user)
      if (o.buyer_id !== req.user.id) throw new AppError(403, 'Only the buyer can confirm receipt.', 'FORBIDDEN')
      if (!ACTIVE.includes(o.status)) throw new AppError(409, `This order is "${o.status}" and cannot be confirmed.`, 'STATE')
      if (!file) throw new AppError(400, 'photo: upload a photo of the item you received', 'VALIDATION')
      checkImages([file])
      await db.transaction(async (trx) => {
        await trx('orders').where({ id: o.id }).update({ receipt_photo: privateName(file) })
        await releaseOrder(trx, o)
      })
      res.json({ order: await dto(await loadOrder(o.id, req.user), req.user) })
    } catch (e) { if (file) removeFiles([file]); throw e }
  }))

  r.get('/orders/:id/receipt', requireAuth, asyncH(async (req, res) => {
    const o = await loadOrder(req.params.id, req.user)
    if (!o.receipt_photo) throw new AppError(404, 'No photo for this order.', 'NOT_FOUND')
    const p = privatePath(o.receipt_photo)
    if (!fs.existsSync(p)) throw new AppError(404, 'Photo missing.', 'NOT_FOUND')
    res.set('Cache-Control', 'private, max-age=300').sendFile(p)
  }))

  r.post('/orders/:id/cancel', requireAuth, asyncH(async (req, res) => {
    const o = await loadOrder(req.params.id, req.user)
    if (o.buyer_id !== req.user.id && o.seller_id !== req.user.id) throw new AppError(403, 'Not your order.', 'FORBIDDEN')
    await db.transaction(async (trx) => {
      if (o.status === 'pending_payment' && o.buyer_id === req.user.id) { await cancelPending(trx, o) }
      else if (o.status === 'paid') await refundOrder(trx, o, req.user.id === o.seller_id ? 'cancelled by seller' : 'cancelled by buyer')
      else throw new AppError(409, 'This order can no longer be cancelled. If something is wrong, file a complaint.', 'STATE')
    })
    res.json({ order: await dto(await loadOrder(o.id, req.user), req.user) })
  }))

  r.post('/orders/:id/complaint', requireAuth, validate(z.object({ type: z.enum(COMPLAINT_TYPES), description: z.string().trim().min(15).max(1000) })), asyncH(async (req, res) => {
    const o = await loadOrder(req.params.id, req.user)
    if (o.buyer_id !== req.user.id) throw new AppError(403, 'Only the buyer can file a complaint.', 'FORBIDDEN')
    await db.transaction(async (trx) => {
      const n = await trx('orders').where({ id: o.id }).whereIn('status', ACTIVE).update({ status: 'disputed', updated_at: now() })
      if (!n) throw new AppError(409, 'A complaint can only be filed on an active order.', 'STATE')
      await trx('complaints').insert({ id: crypto.randomUUID(), order_id: o.id, buyer_id: o.buyer_id, seller_id: o.seller_id, type: req.valid.type, description: req.valid.description, created_at: now() })
      await notify(trx, o.seller_id, 'Buyer reported a problem', `${o.code}: the payment stays in escrow while we review.`, `/orders/${o.id}`)
      for (const a of await trx('users').where({ is_admin: 1 }).select('id')) await notify(trx, a.id, 'New dispute', `${o.code} needs review.`, '/admin')
    })
    res.status(201).json({ order: await dto(await loadOrder(o.id, req.user), req.user) })
  }))

  r.post('/orders/:id/review', requireAuth, validate(z.object({ rating: z.coerce.number().int().min(1).max(5), comment: z.string().trim().max(500).optional() })), asyncH(async (req, res) => {
    const o = await loadOrder(req.params.id, req.user)
    if (o.buyer_id !== req.user.id) throw new AppError(403, 'Only the buyer can review.', 'FORBIDDEN')
    if (o.status !== 'confirmed') throw new AppError(409, 'You can review after the order is confirmed.', 'STATE')
    if (await db('reviews').where({ order_id: o.id }).first()) throw new AppError(409, 'You already reviewed this order.', 'DUPLICATE')
    const first = await db('order_items').where({ order_id: o.id }).first()
    await db('reviews').insert({ id: crypto.randomUUID(), order_id: o.id, product_id: first?.product_id || null, buyer_id: o.buyer_id, seller_id: o.seller_id, rating: req.valid.rating, comment: req.valid.comment || null, created_at: now() })
    await notify(db, o.seller_id, 'New review', `${o.code}: ${req.valid.rating}/5`, `/orders/${o.id}`)
    res.status(201).json({ order: await dto(await loadOrder(o.id, req.user), req.user) })
  }))

  r.get('/complaints', requireAuth, asyncH(async (req, res) => {
    const rows = await db('complaints as c').join('orders as o', 'o.id', 'c.order_id').where((b) => b.where('c.buyer_id', req.user.id).orWhere('c.seller_id', req.user.id))
      .orderBy('c.created_at', 'desc').select('c.*', 'o.code', 'o.total')
    res.json({ items: rows.map((c) => ({ id: c.id, orderId: c.order_id, code: c.code, total: c.total, type: c.type, description: c.description, status: c.status, resolution: c.resolution, resolutionNote: c.resolution_note, createdAt: c.created_at, role: c.buyer_id === req.user.id ? 'buyer' : 'seller' })) })
  }))

  r.get('/reviews/received', requireAuth, asyncH(async (req, res) => {
    const rows = await db('reviews as r').join('users as b', 'b.id', 'r.buyer_id').leftJoin('products as p', 'p.id', 'r.product_id').where('r.seller_id', req.user.id).orderBy('r.created_at', 'desc').limit(50)
      .select('r.id', 'r.rating', 'r.comment', 'r.created_at', 'b.name as buyerName', 'p.title as productTitle', 'p.id as productId', 'p.category as category')
    res.json({ items: rows.map((x) => ({ id: x.id, rating: x.rating, comment: x.comment, createdAt: x.created_at, buyerName: x.buyerName, product: x.productId ? { id: x.productId, title: x.productTitle, category: x.category } : null })) })
  }))
  return r
}
