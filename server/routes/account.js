import { Router } from 'express'
import crypto from 'node:crypto'
import { config } from '../config.js'
import { asyncH, AppError, validate, z, now, addDays } from '../lib/http.js'
import { requireAuth, requireVerified, isVendorActive } from '../lib/auth.js'
import { startPayment } from '../lib/paymentsInit.js'
import { uploadPrivate, checkImages, removeFiles, privateName } from '../lib/uploads.js'
import { notify } from '../lib/notify.js'

export default function accountRoutes(db) {
  const r = Router()
  r.use(['/me', '/vendor', '/notifications'], requireAuth)

  // ---- student verification ----
  r.post('/me/verification', uploadPrivate.single('idPhoto'), asyncH(async (req, res) => {
    const file = req.file
    try {
      if (req.user.verification_status === 'approved') throw new AppError(409, 'You are already verified.', 'STATE')
      if (!file) throw new AppError(400, 'idPhoto: upload a photo of your student ID card', 'VALIDATION')
      checkImages([file])
      await db('users').where({ id: req.user.id }).update({ id_photo: privateName(file), verification_status: 'pending', verification_note: null })
      for (const a of await db('users').where({ is_admin: 1 }).select('id')) await notify(db, a.id, 'Verification request', `${req.user.name} submitted a student ID.`, '/admin')
      res.status(201).json({ verificationStatus: 'pending' })
    } catch (e) { if (file) removeFiles([file]); throw e }
  }))

  // ---- vendor badge ----
  const badgeInfo = async (u) => {
    const used = Number((await db('users').where({ launch_offer_used: 1 }).count({ c: '*' }).first()).c)
    const launchAvailable = used < config.launchSlots && !u.launch_offer_used
    return {
      active: isVendorActive(u), expiresAt: u.vendor_expires_at, boostActive: !!u.boost_until && u.boost_until > now(), boostUntil: u.boost_until,
      price: launchAvailable ? config.badgeLaunchPrice : config.badgePrice, regularPrice: config.badgePrice, launchAvailable, launchSlotsLeft: Math.max(0, config.launchSlots - used), days: config.badgeDays
    }
  }
  r.get('/vendor/badge', asyncH(async (req, res) => {
    const info = await badgeInfo(req.user)
    const pays = await db('payments').where({ user_id: req.user.id, kind: 'badge', status: 'success' }).orderBy('paid_at', 'desc').limit(10)
    res.json({ ...info, payments: pays.map((p) => ({ reference: p.reference, amount: p.amount, paidAt: p.paid_at })) })
  }))
  r.post('/vendor/badge/checkout', requireVerified, asyncH(async (req, res) => {
    const info = await badgeInfo(req.user)
    const reference = 'KSP-' + crypto.randomBytes(8).toString('hex')
    await db('payments').insert({ id: crypto.randomUUID(), reference, kind: 'badge', user_id: req.user.id, amount: info.price, status: 'pending', provider: config.mockPayments ? 'mock' : 'paystack', meta: JSON.stringify({ launch: info.launchAvailable }), created_at: now() })
    res.status(201).json(await startPayment(req.user, { reference, amount: info.price }))
  }))

  // ---- vendor dashboard numbers ----
  r.get('/vendor/stats', asyncH(async (req, res) => {
    if (req.user.account_type !== 'vendor' && !isVendorActive(req.user)) throw new AppError(403, 'Vendors only.', 'FORBIDDEN')
    const uid = req.user.id
    const real = ['paid', 'shipped', 'delivered', 'confirmed']
    const day = (n) => addDays(now(), -n)
    const sumSince = async (from, to) => Number((await db('orders').where({ seller_id: uid }).whereIn('status', real).andWhere('paid_at', '>=', from).andWhere('paid_at', '<', to).sum({ s: 'subtotal' }).first()).s || 0)
    const cntSince = async (from, to) => Number((await db('orders').where({ seller_id: uid }).whereIn('status', real).andWhere('paid_at', '>=', from).andWhere('paid_at', '<', to).count({ c: '*' }).first()).c)
    const thisSales = await sumSince(day(7), addDays(now(), 1)), prevSales = await sumSince(day(14), day(7))
    const thisOrders = await cntSince(day(7), addDays(now(), 1)), prevOrders = await cntSince(day(14), day(7))
    const pct = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : null)
    const series = []
    for (let i = 6; i >= 0; i--) {
      const d0 = new Date(); d0.setHours(0, 0, 0, 0); d0.setDate(d0.getDate() - i)
      const from = d0.toISOString(), to = new Date(d0.getTime() + 86400000).toISOString()
      series.push({ date: from.slice(0, 10), value: await sumSince(from, to) })
    }
    const held = await db('orders').where({ seller_id: uid }).whereIn('status', ['paid', 'shipped', 'delivered']).select('subtotal', 'delivery_fee')
    const pending = held.reduce((s, o) => s + o.subtotal - Math.round((o.subtotal * config.commissionPercent) / 100) + o.delivery_fee, 0)
    const active = Number((await db('products').where({ seller_id: uid, status: 'active' }).count({ c: '*' }).first()).c)
    const newThisWeek = Number((await db('products').where({ seller_id: uid, status: 'active' }).andWhere('created_at', '>=', day(7)).count({ c: '*' }).first()).c)
    const toShip = Number((await db('orders').where({ seller_id: uid, status: 'paid' }).count({ c: '*' }).first()).c)
    const recent = await db('orders').where({ seller_id: uid }).whereIn('status', [...real, 'disputed']).orderBy('created_at', 'desc').limit(5)
    const items = recent.length ? await db('order_items').whereIn('order_id', recent.map((o) => o.id)) : []
    res.json({
      totalSales: thisSales, salesChange: pct(thisSales, prevSales), totalOrders: thisOrders, ordersChange: pct(thisOrders, prevOrders),
      activeProducts: active, newProductsThisWeek: newThisWeek, availableBalance: req.user.wallet_balance, pendingBalance: pending, ordersToShip: toShip, series,
      recentOrders: recent.map((o) => ({ id: o.id, code: o.code, status: o.status, total: o.total, createdAt: o.created_at, items: items.filter((i) => i.order_id === o.id).map((i) => ({ title: i.title, qty: i.qty, image: i.image })) }))
    })
  }))

  // ---- notifications ----
  r.get('/notifications', asyncH(async (req, res) => {
    const rows = await db('notifications').where({ user_id: req.user.id }).orderBy('id', 'desc').limit(50)
    const unread = Number((await db('notifications').where({ user_id: req.user.id, is_read: 0 }).count({ c: '*' }).first()).c)
    res.json({ unread, items: rows.map((n) => ({ id: n.id, title: n.title, body: n.body, link: n.link, read: !!n.is_read, createdAt: n.created_at })) })
  }))
  r.get('/notifications/count', asyncH(async (req, res) => {
    res.json({ unread: Number((await db('notifications').where({ user_id: req.user.id, is_read: 0 }).count({ c: '*' }).first()).c) })
  }))
  r.post('/notifications/read', validate(z.object({ ids: z.array(z.coerce.number().int()).max(100).optional() })), asyncH(async (req, res) => {
    const q = db('notifications').where({ user_id: req.user.id })
    if (req.valid.ids?.length) q.whereIn('id', req.valid.ids)
    await q.update({ is_read: 1 })
    res.json({ ok: true })
  }))
  return r
}
