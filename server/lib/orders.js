import crypto from 'node:crypto'
import { config } from '../config.js'
import { AppError, now, addDays } from './http.js'
import * as ledger from './ledger.js'
import { notify } from './notify.js'

const code = () => 'KS-' + (100000 + crypto.randomInt(900000))

/** Escrow release: seller is paid (item subtotal minus commission, plus the delivery fee). */
export async function releaseOrder(trx, order, { auto = false, byAdmin = false } = {}) {
  const n = await trx('orders').where({ id: order.id }).whereIn('status', ['paid', 'shipped', 'delivered', 'disputed'])
    .update({ status: 'confirmed', confirmed_at: now(), updated_at: now() })
  if (!n) throw new AppError(409, 'This order can no longer be released.', 'STATE')
  const commission = Math.round((order.subtotal * config.commissionPercent) / 100)
  const payout = order.subtotal - commission + order.delivery_fee
  await trx('orders').where({ id: order.id }).update({ commission, seller_payout: payout })
  await ledger.post(trx, { userId: order.seller_id, type: 'sale', amount: payout, refType: 'order', refId: order.id, description: `Payout for ${order.code}` })
  if (commission) await ledger.post(trx, { userId: null, type: 'commission', amount: commission, refType: 'order', refId: order.id, description: `Commission ${order.code}` })
  await notify(trx, order.seller_id, 'You have been paid', `${order.code}: ₦${payout.toLocaleString('en-NG')} added to your wallet${auto ? ' (auto-released)' : ''}.`, `/orders/${order.id}`)
  if (auto || byAdmin) await notify(trx, order.buyer_id, 'Payment released to seller', `${order.code} was released to the seller.`, `/orders/${order.id}`)
  return { commission, payout }
}

/** Refund a paid order into the buyer's wallet and put the stock back. */
export async function refundOrder(trx, order, reason = 'refunded') {
  const n = await trx('orders').where({ id: order.id }).whereIn('status', ['paid', 'shipped', 'delivered', 'disputed'])
    .update({ status: 'refunded', cancelled_at: now(), updated_at: now() })
  if (!n) throw new AppError(409, 'This order can no longer be refunded.', 'STATE')
  await restock(trx, order.id)
  await ledger.post(trx, { userId: order.buyer_id, type: 'refund', amount: order.total, refType: 'order', refId: order.id, description: `Refund for ${order.code} (${reason})` })
  await notify(trx, order.buyer_id, 'Refund issued', `${order.code}: ₦${order.total.toLocaleString('en-NG')} was returned to your wallet.`, `/orders/${order.id}`)
  await notify(trx, order.seller_id, 'Order refunded', `${order.code} was refunded to the buyer.`, `/orders/${order.id}`)
}

export async function restock(trx, orderId) {
  const items = await trx('order_items').where({ order_id: orderId })
  for (const it of items) await trx('products').where({ id: it.product_id }).increment('quantity', it.qty)
}

/** Unpaid checkout that was abandoned: cancel and release the reserved stock. */
export async function cancelPending(trx, order) {
  const n = await trx('orders').where({ id: order.id, status: 'pending_payment' }).update({ status: 'cancelled', cancelled_at: now(), updated_at: now() })
  if (n) await restock(trx, order.id)
  return n
}

export async function createCheckout(db, buyer, { items, delivery, address, note }) {
  const want = new Map()
  for (const i of items) want.set(i.productId, (want.get(i.productId) || 0) + i.qty)
  return db.transaction(async (trx) => {
    const products = await trx('products').whereIn('id', [...want.keys()]).where({ status: 'active' })
    if (products.length !== want.size) throw new AppError(409, 'One of the items is no longer available.', 'GONE')
    const sellers = await trx('users').whereIn('id', [...new Set(products.map((p) => p.seller_id))])
    const banned = new Set(sellers.filter((s) => s.banned).map((s) => s.id))
    const imgs = await trx('product_images').whereIn('product_id', products.map((p) => p.id)).orderBy('position')
    const firstImg = {}; for (const im of imgs) firstImg[im.product_id] ??= im.url

    const bySeller = new Map()
    for (const p of products) {
      if (p.seller_id === buyer.id) throw new AppError(400, 'You cannot buy your own item.', 'OWN_ITEM')
      if (banned.has(p.seller_id)) throw new AppError(409, 'That seller is unavailable.', 'GONE')
      if (delivery === 'delivery' && p.delivery === 'pickup') throw new AppError(400, `"${p.title}" is pickup only.`, 'DELIVERY')
      if (delivery === 'pickup' && p.delivery === 'delivery') throw new AppError(400, `"${p.title}" is delivery only.`, 'DELIVERY')
      const qty = want.get(p.id)
      const upd = await trx('products').where({ id: p.id, status: 'active' }).andWhere('quantity', '>=', qty).decrement('quantity', qty)
      if (!upd) throw new AppError(409, `Not enough stock for "${p.title}".`, 'STOCK')
      if (!bySeller.has(p.seller_id)) bySeller.set(p.seller_id, [])
      bySeller.get(p.seller_id).push({ p, qty })
    }

    const groupRef = crypto.randomUUID()
    const orderIds = [], codes = []
    let total = 0
    for (const [sellerId, lines] of bySeller) {
      const subtotal = lines.reduce((s, l) => s + l.p.price * l.qty, 0)
      const fee = delivery === 'delivery' ? config.deliveryFee : 0
      const id = crypto.randomUUID(); let c = code()
      while (await trx('orders').where({ code: c }).first()) c = code()
      await trx('orders').insert({
        id, code: c, group_ref: groupRef, buyer_id: buyer.id, seller_id: sellerId, status: 'pending_payment',
        subtotal, delivery_fee: fee, total: subtotal + fee, delivery_method: delivery, address: address || null, note: note || null,
        created_at: now(), updated_at: now()
      })
      await trx('order_items').insert(lines.map((l) => ({ order_id: id, product_id: l.p.id, title: l.p.title, price: l.p.price, qty: l.qty, image: firstImg[l.p.id] || null })))
      orderIds.push(id); codes.push(c); total += subtotal + fee
    }
    const reference = 'KSP-' + crypto.randomBytes(8).toString('hex')
    await trx('payments').insert({
      id: crypto.randomUUID(), reference, kind: 'order', user_id: buyer.id, amount: total, status: 'pending',
      provider: config.mockPayments ? 'mock' : 'paystack', meta: JSON.stringify({ groupRef, orderIds }), created_at: now()
    })
    return { reference, amount: total, orders: codes, orderIds }
  })
}

export async function markShipped(trx, order, status) {
  const patch = status === 'shipped' ? { status, shipped_at: now() } : { status, delivered_at: now(), auto_release_at: addDays(now(), config.autoReleaseDays) }
  const from = status === 'shipped' ? ['paid'] : ['paid', 'shipped']
  const n = await trx('orders').where({ id: order.id }).whereIn('status', from).update({ ...patch, updated_at: now() })
  if (!n) throw new AppError(409, `Order cannot move to "${status}" from "${order.status}".`, 'STATE')
  const msg = status === 'shipped' ? 'is on its way' : `was marked delivered. Confirm with a photo, or it auto-releases in ${config.autoReleaseDays} days.`
  await notify(trx, order.buyer_id, status === 'shipped' ? 'Your order is on its way' : 'Your order was delivered', `${order.code} ${msg}`, `/orders/${order.id}`)
}
