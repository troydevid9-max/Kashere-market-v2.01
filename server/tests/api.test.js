import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { startServer, client, login, image } from './helpers.js'
import { config } from '../config.js'
import { runJobs } from '../jobs.js'
import { addDays, now } from '../lib/http.js'

const MUSA = 'FUK/ME/23/0056', AISHA = 'FUK/CS/21/0045', IBRAHIM = 'FUK/EE/22/0112', FATIMA = 'FUK/BS/21/0089', ZAINAB = 'FUK/CH/22/0078'
const pickup = (productId, qty = 1) => ({ items: [{ productId, qty }], delivery: 'delivery', name: 'Test Buyer', phone: '08012345678', place: 'Hostel A' })

let S
const as = async (id, pw) => { const c = client(S.base); await login(c, id, pw); return c }
const productId = async (c, q) => (await c.get(`/api/products?q=${encodeURIComponent(q)}`)).data.items[0].id
const wallet = async (c) => (await c.get('/api/wallet')).data.balance
const stock = async (id) => (await S.db('products').where({ id }).first()).quantity
const buy = async (buyer, pid, qty = 1) => {
  const r = await buyer.post('/api/checkout', pickup(pid, qty)); assert.equal(r.status, 201, JSON.stringify(r.data))
  const p = await buyer.post(`/api/payments/${r.data.reference}/mock-pay`); assert.equal(p.status, 200, JSON.stringify(p.data))
  const o = await S.db('orders').where({ code: r.data.orders[0] }).first()
  return { ...r.data, orderId: o.id }
}

before(async () => { S = await startServer() })
after(async () => { await S.close() })

describe('auth and permissions', () => {
  test('signup validates, logs in, and exposes only safe fields publicly', async () => {
    const c = client(S.base)
    assert.equal((await c.post('/api/auth/signup', { name: 'X', matric: 'bad' })).status, 400)
    const ok = await c.post('/api/auth/signup', { name: 'New Student', matric: 'fuk/cs/2024/001', email: 'NEW@x.com', phone: '08011112222', password: 'longenough1' })
    assert.equal(ok.status, 201); assert.equal(ok.data.user.matric, 'FUK/CS/2024/001'); assert.equal(ok.data.user.email, 'new@x.com')
    assert.equal((await c.get('/api/auth/me')).data.user.email, 'new@x.com')
    assert.equal((await client(S.base).post('/api/auth/signup', { name: 'Dup', matric: 'FUK/CS/2024/001', email: 'other@x.com', phone: '08011112222', password: 'longenough1' })).status, 409)
    const store = await client(S.base).get(`/api/stores/${ok.data.user.id}`)
    assert.ok(!JSON.stringify(store.data).includes('new@x.com'), 'store page must not leak email')
    assert.ok(!JSON.stringify(store.data).includes('08011112222'), 'store page must not leak phone')
  })
  test('wrong password and unknown user get the same generic error', async () => {
    const a = await client(S.base).post('/api/auth/login', { identifier: AISHA, password: 'nope' })
    const b = await client(S.base).post('/api/auth/login', { identifier: 'ghost@x.com', password: 'nope' })
    assert.equal(a.status, 401); assert.equal(b.status, 401); assert.equal(a.data.error, b.data.error)
  })
  test('blocks requests without the CSRF header, anonymous access, and non-admins', async () => {
    const c = client(S.base)
    assert.equal((await c.call('POST', '/api/auth/login', { identifier: AISHA, password: 'password123' }, { headers: { 'x-requested-with': '' } })).status, 403)
    assert.equal((await c.get('/api/orders')).status, 401)
    assert.equal((await c.get('/api/wallet')).status, 401)
    const m = await as(MUSA); assert.equal((await m.get('/api/admin/stats')).status, 403)
  })
  test('unverified students cannot sell or buy', async () => {
    const z = await as(ZAINAB)
    const f = new FormData(); f.append('images', image(), 'a.png'); f.append('title', 'Test item'); f.append('description', 'A long enough description'); f.append('price', '1000'); f.append('quantity', '1'); f.append('category', 'academic'); f.append('condition', 'good')
    const r = await z.upload('/api/products', f); assert.equal(r.status, 403); assert.equal(r.data.code, 'NOT_VERIFIED')
    const pid = await productId(z, 'Calculus')
    assert.equal((await z.post('/api/checkout', pickup(pid))).status, 403)
  })
})

describe('listings and uploads', () => {
  test('creates a product with photos; rejects non-images and fake images', async () => {
    const a = await as(AISHA)
    const mk = (blob, name) => { const f = new FormData(); f.append('images', blob, name); f.append('title', 'Desk Lamp'); f.append('description', 'Bright LED desk lamp, barely used'); f.append('price', '3500'); f.append('quantity', '2'); f.append('category', 'electronics'); f.append('condition', 'good'); return f }
    const ok = await a.upload('/api/products', mk(image(), 'lamp.png')); assert.equal(ok.status, 201, JSON.stringify(ok.data))
    assert.match(ok.data.product.images[0], /^\/uploads\/.+\.png$/)
    assert.equal((await a.upload('/api/products', mk(new Blob(['hello'], { type: 'text/plain' }), 'x.txt'))).status, 400)
    assert.equal((await a.upload('/api/products', mk(new Blob(['<script>alert(1)</script>'], { type: 'image/png' }), 'evil.png'))).status, 400, 'content-type lies must be caught by the signature check')
    const bad = new FormData(); bad.append('images', image(), 'a.png'); bad.append('title', 'x')
    assert.equal((await a.upload('/api/products', bad)).status, 400)
  })
  test('search, filter, sorting and ownership', async () => {
    const c = client(S.base)
    assert.ok((await c.get('/api/products?q=nike')).data.items.length >= 2)
    assert.equal((await c.get('/api/products?category=bogus')).status, 400)
    const cheap = (await c.get('/api/products?max=5000&sort=low')).data.items; assert.ok(cheap.every((p) => p.price <= 5000))
    const m = await as(MUSA), pid = await productId(c, 'Calculus')
    assert.equal((await m.patch(`/api/products/${pid}`, { price: 5000 })).status, 403, 'only the owner can edit')
    assert.equal((await m.del(`/api/products/${pid}`)).status, 403)
  })
  test('favourites toggle and the public store page', async () => {
    const m = await as(MUSA), pid = await productId(m, 'Calculus')
    assert.equal((await m.call('PUT', `/api/favorites/${pid}`)).status, 200)
    assert.deepEqual((await m.get('/api/favorites/ids')).data.ids, [pid])
    await m.del(`/api/favorites/${pid}`); assert.deepEqual((await m.get('/api/favorites/ids')).data.ids, [])
    const aisha = (await (await as(AISHA)).get('/api/auth/me')).data.user
    const st = await client(S.base).get(`/api/stores/${aisha.id}`)
    assert.equal(st.status, 200); assert.ok(st.data.store.reviewCount >= 2); assert.ok(st.data.products.length >= 4)
  })
})

describe('escrow: happy path', () => {
  test('pay -> ship -> confirm with photo -> seller paid, commission taken, nothing lost', async () => {
    const musa = await as(MUSA), aisha = await as(AISHA), admin = await as('ADMIN', 'Admin@12345')
    const pid = await productId(musa, 'Samsung 25W')
    const stock0 = await stock(pid), wallet0 = await wallet(aisha)
    const rev0 = (await admin.get('/api/admin/stats')).data.platformRevenue

    const co = await musa.post('/api/checkout', pickup(pid)); assert.equal(co.status, 201)
    assert.equal(co.data.amount, 7000); assert.equal(await stock(pid), stock0 - 1, 'stock is reserved at checkout')
    assert.equal((await aisha.get('/api/orders?role=seller')).data.items.find((o) => o.code === co.data.orders[0]), undefined, 'unpaid orders are hidden')
    await musa.post(`/api/payments/${co.data.reference}/mock-pay`)
    assert.equal((await musa.post(`/api/payments/${co.data.reference}/mock-pay`)).status, 200, 'paying twice is harmless')
    const o = await S.db('orders').where({ code: co.data.orders[0] }).first(); assert.equal(o.status, 'paid')
    assert.equal(await wallet(aisha), wallet0, 'seller is NOT paid yet: money is held in escrow')

    assert.equal((await musa.post(`/api/orders/${o.id}/ship`)).status, 403, 'buyer cannot ship')
    assert.equal((await aisha.post(`/api/orders/${o.id}/ship`)).data.order.status, 'shipped')
    const noPhoto = await musa.post(`/api/orders/${o.id}/confirm`); assert.equal(noPhoto.status, 400)
    const fake = new FormData(); fake.append('photo', new Blob(['not an image'], { type: 'image/png' }), 'p.png')
    assert.equal((await musa.upload(`/api/orders/${o.id}/confirm`, fake)).status, 400)
    assert.equal(await wallet(aisha), wallet0, 'bad confirmations must not release money')

    const f = new FormData(); f.append('photo', image(), 'received.png')
    assert.equal((await aisha.upload(`/api/orders/${o.id}/confirm`, f)).status, 403, 'seller cannot confirm their own sale')
    const f2 = new FormData(); f2.append('photo', image(), 'received.png')
    const done = await musa.upload(`/api/orders/${o.id}/confirm`, f2); assert.equal(done.status, 200, JSON.stringify(done.data))
    assert.equal(done.data.order.status, 'confirmed')
    const commission = Math.round(6000 * 0.06), payout = 6000 - commission + 1000
    assert.equal(done.data.order.commission, commission); assert.equal(done.data.order.sellerPayout, payout)
    assert.equal(commission + payout, 7000, 'commission + payout equals what the buyer paid')
    assert.equal(await wallet(aisha), wallet0 + payout)
    assert.equal((await admin.get('/api/admin/stats')).data.platformRevenue, rev0 + commission)

    const f3 = new FormData(); f3.append('photo', image(), 'again.png')
    assert.equal((await musa.upload(`/api/orders/${o.id}/confirm`, f3)).status, 409, 'cannot release twice')
    assert.equal(await wallet(aisha), wallet0 + payout, 'double confirm must not double pay')

    assert.equal((await musa.get(`/api/orders/${o.id}/receipt`)).res.status, 200)
    assert.equal((await aisha.get(`/api/orders/${o.id}/receipt`)).res.status, 200)
    const ibrahim = await as(IBRAHIM); assert.equal((await ibrahim.get(`/api/orders/${o.id}`)).status, 404, 'strangers cannot see an order')
    assert.equal((await ibrahim.get(`/api/orders/${o.id}/receipt`)).status, 404)

    assert.equal((await musa.post(`/api/orders/${o.id}/review`, { rating: 5, comment: 'Great' })).status, 201)
    assert.equal((await musa.post(`/api/orders/${o.id}/review`, { rating: 1 })).status, 409)
    assert.equal((await ibrahim.post(`/api/orders/${o.id}/review`, { rating: 1 })).status, 404)
  })
  test('buying rules: own items, stock, delivery mode, multi-seller carts', async () => {
    const aisha = await as(AISHA), musa = await as(MUSA)
    assert.equal((await aisha.post('/api/checkout', pickup(await productId(aisha, 'Samsung 25W')))).status, 400, 'cannot buy your own item')
    const laptop = await productId(musa, 'HP Pavilion')
    assert.equal((await musa.post('/api/checkout', pickup(laptop, 2))).data.code, 'STOCK')
    const a = await productId(musa, 'Backpack'), b = await productId(musa, 'Ankara')
    const multi = await musa.post('/api/checkout', { ...pickup(a), items: [{ productId: a, qty: 1 }, { productId: b, qty: 1 }] })
    assert.equal(multi.status, 201); assert.equal(multi.data.orders.length, 2, 'one order per seller'); assert.equal(multi.data.amount, 15000 + 4500 + 2000)
    await musa.post(`/api/payments/${multi.data.reference}/mock-pay`)
    assert.equal((await S.db('orders').whereIn('code', multi.data.orders)).every((o) => o.status === 'paid'), true)
    const pk = await musa.post('/api/checkout', { ...pickup(a), delivery: 'pickup' }); assert.equal(pk.status, 201); assert.equal(pk.data.amount, 15000, 'pickup has no delivery fee')
  })
})

describe('escrow: cancel, refund and disputes', () => {
  test('seller cancels a paid order -> buyer refunded to wallet, stock restored; cannot cancel after shipping', async () => {
    const ibrahim = await as(IBRAHIM), fatima = await as(FATIMA)
    const pid = await productId(ibrahim, 'Rice'), s0 = await stock(pid), w0 = await wallet(ibrahim)
    const o = await buy(ibrahim, pid)
    assert.equal(await stock(pid), s0 - 1)
    assert.equal((await fatima.post(`/api/orders/${o.orderId}/cancel`)).data.order.status, 'refunded')
    assert.equal(await wallet(ibrahim), w0 + 43000); assert.equal(await stock(pid), s0)
    assert.equal((await fatima.post(`/api/orders/${o.orderId}/cancel`)).status, 409, 'cannot refund twice')
    const o2 = await buy(ibrahim, pid); await fatima.post(`/api/orders/${o2.orderId}/ship`)
    assert.equal((await ibrahim.post(`/api/orders/${o2.orderId}/cancel`)).status, 409)
  })
  test('abandoned checkout is cancelled by the job and stock comes back', async () => {
    const musa = await as(MUSA), pid = await productId(musa, 'Rice'), s0 = await stock(pid)
    const co = await musa.post('/api/checkout', pickup(pid)); assert.equal(await stock(pid), s0 - 1)
    await S.db('orders').where({ code: co.data.orders[0] }).update({ created_at: addDays(now(), -1) })
    await S.db('payments').where({ reference: co.data.reference }).update({ created_at: addDays(now(), -1) })
    await runJobs(S.db)
    assert.equal((await S.db('orders').where({ code: co.data.orders[0] }).first()).status, 'cancelled'); assert.equal(await stock(pid), s0)
    assert.equal((await musa.post(`/api/payments/${co.data.reference}/mock-pay`)).status, 200)
    assert.equal((await S.db('orders').where({ code: co.data.orders[0] }).first()).status, 'cancelled', 'late payment must not revive a cancelled order')
  })
  test('dispute: money stays frozen; admin refund and admin release both settle correctly', async () => {
    const musa = await as(MUSA), aisha = await as(AISHA), admin = await as('ADMIN', 'Admin@12345')
    const pid = await productId(musa, 'Backpack')
    const o1 = await buy(musa, pid), w0 = await wallet(aisha), m0 = await wallet(musa)
    assert.equal((await musa.post(`/api/orders/${o1.orderId}/complaint`, { type: 'damaged', description: 'short' })).status, 400)
    assert.equal((await musa.post(`/api/orders/${o1.orderId}/complaint`, { type: 'damaged', description: 'The strap arrived torn and stained.' })).status, 201)
    assert.equal((await aisha.post(`/api/orders/${o1.orderId}/ship`)).status, 409, 'disputed orders cannot be shipped')
    assert.equal(await wallet(aisha), w0)
    const c1 = (await admin.get('/api/admin/complaints')).data.items.find((c) => c.orderId === o1.orderId)
    assert.equal((await aisha.post(`/api/admin/complaints/${c1.id}/resolve`, { resolution: 'refund' })).status, 403)
    assert.equal((await admin.post(`/api/admin/complaints/${c1.id}/resolve`, { resolution: 'refund' })).status, 200)
    assert.equal(await wallet(musa), m0 + 16000); assert.equal(await wallet(aisha), w0)
    assert.equal((await admin.post(`/api/admin/complaints/${c1.id}/resolve`, { resolution: 'release' })).status, 409, 'cannot resolve twice')

    const o2 = await buy(musa, pid)
    await musa.post(`/api/orders/${o2.orderId}/complaint`, { type: 'other', description: 'Changed my mind, but filing anyway.' })
    const c2 = (await admin.get('/api/admin/complaints')).data.items.find((c) => c.orderId === o2.orderId)
    await admin.post(`/api/admin/complaints/${c2.id}/resolve`, { resolution: 'release', note: 'Item was fine' })
    assert.equal(await wallet(aisha), w0 + (15000 - 900 + 1000))
  })
  test('delivered orders auto-release after the window; disputed ones never do', async () => {
    const musa = await as(MUSA), aisha = await as(AISHA)
    const pid = await productId(musa, 'Samsung 25W')
    const o = await buy(musa, pid); await aisha.post(`/api/orders/${o.orderId}/deliver`)
    const w0 = await wallet(aisha)
    await runJobs(S.db); assert.equal(await wallet(aisha), w0, 'not due yet')
    await S.db('orders').where({ id: o.orderId }).update({ auto_release_at: addDays(now(), -1) })
    await runJobs(S.db); assert.equal(await wallet(aisha), w0 + 6640)
    await runJobs(S.db); assert.equal(await wallet(aisha), w0 + 6640, 'jobs are idempotent')
    const o2 = await buy(musa, pid); await aisha.post(`/api/orders/${o2.orderId}/deliver`)
    await S.db('orders').where({ id: o2.orderId }).update({ auto_release_at: addDays(now(), -1) })
    await musa.post(`/api/orders/${o2.orderId}/complaint`, { type: 'wrong-item', description: 'This is not the charger I ordered.' })
    const w1 = await wallet(aisha); await runJobs(S.db); assert.equal(await wallet(aisha), w1)
  })
})

describe('wallet', () => {
  test('top-up, send, insufficient funds, validation', async () => {
    const ibrahim = await as(IBRAHIM), aisha = await as(AISHA)
    const t = await ibrahim.post('/api/wallet/topup', { amount: 5000 }); assert.equal(t.status, 201); assert.equal(t.data.mock, true)
    const b0 = await wallet(ibrahim); await ibrahim.post(`/api/payments/${t.data.reference}/mock-pay`); await ibrahim.post(`/api/payments/${t.data.reference}/mock-pay`)
    assert.equal(await wallet(ibrahim), b0 + 5000, 'top-up credited exactly once')
    const a0 = await wallet(aisha)
    assert.equal((await ibrahim.post('/api/wallet/send', { matric: AISHA, amount: 1000 })).status, 200)
    assert.equal(await wallet(aisha), a0 + 1000); assert.equal(await wallet(ibrahim), b0 + 4000)
    for (const bad of [{ matric: AISHA, amount: -5 }, { matric: AISHA, amount: 0 }, { matric: AISHA, amount: 1.5 }, { matric: 'nope', amount: 500 }, { matric: IBRAHIM, amount: 500 }])
      assert.ok([400].includes((await ibrahim.post('/api/wallet/send', bad)).status), JSON.stringify(bad))
    assert.equal((await ibrahim.post('/api/wallet/send', { matric: AISHA, amount: 900000 })).data.code, 'INSUFFICIENT')
    assert.equal((await ibrahim.post('/api/wallet/send', { matric: 'FUK/XX/20/999', amount: 500 })).status, 404)
  })
  test('parallel sends can never overdraw a wallet', async () => {
    const musa = await as(MUSA), aisha = await as(AISHA)
    const m0 = await wallet(musa)
    const t = await musa.post('/api/wallet/topup', { amount: 10000 }); await musa.post(`/api/payments/${t.data.reference}/mock-pay`)
    const start = await wallet(musa); assert.equal(start, m0 + 10000)
    const results = await Promise.all(Array.from({ length: 8 }, () => musa.post('/api/wallet/send', { matric: AISHA, amount: 3000 })))
    const ok = results.filter((r) => r.status === 200).length
    assert.ok(ok >= 1)
    assert.ok((await wallet(musa)) >= 0, 'balance never negative')
    assert.equal((await wallet(musa)) + ok * 3000, start, 'every successful send is fully accounted for')
    void aisha
  })
  test('withdrawals hold funds; admin can pay or reject (reject returns the money)', async () => {
    const aisha = await as(AISHA), admin = await as('ADMIN', 'Admin@12345')
    const body = { amount: 5000, bankName: 'GTBank', accountNumber: '0123456789', accountName: 'Aisha Mohammed' }
    assert.equal((await aisha.post('/api/wallet/withdraw', { ...body, amount: 500 })).status, 400, 'below minimum')
    assert.equal((await aisha.post('/api/wallet/withdraw', { ...body, accountNumber: '123' })).status, 400)
    const w0 = await wallet(aisha), r = await aisha.post('/api/wallet/withdraw', body); assert.equal(r.status, 201)
    assert.equal(await wallet(aisha), w0 - 5000)
    assert.equal((await aisha.post(`/api/admin/withdrawals/${r.data.withdrawalId}/decision`, { pay: true })).status, 403)
    assert.equal((await admin.post(`/api/admin/withdrawals/${r.data.withdrawalId}/decision`, { pay: false, note: 'Name mismatch' })).status, 200)
    assert.equal(await wallet(aisha), w0); assert.equal((await admin.post(`/api/admin/withdrawals/${r.data.withdrawalId}/decision`, { pay: true })).status, 409)
    const r2 = await aisha.post('/api/wallet/withdraw', body); await admin.post(`/api/admin/withdrawals/${r2.data.withdrawalId}/decision`, { pay: true })
    assert.equal(await wallet(aisha), w0 - 5000)
    assert.ok((await aisha.get('/api/wallet/withdrawals')).data.items[0].accountNumber.startsWith('******'))
  })
  test('ledger always sums to the balance', async () => {
    const rows = await S.db('users').whereNot({ is_admin: 1 }).select('id', 'name', 'wallet_balance')
    for (const u of rows) {
      const last = await S.db('ledger').where({ user_id: u.id }).orderBy('id', 'desc').first()
      if (last) assert.equal(last.balance_after, u.wallet_balance, `${u.name}: last ledger balance matches wallet`)
    }
  })
})

describe('payments from Paystack', () => {
  test('webhook: rejects bad signatures, credits once, ignores replays', async () => {
    const prev = config.paystackSecret; config.paystackSecret = 'sk_test_secret'
    try {
      const musa = await as(MUSA), u = (await musa.get('/api/auth/me')).data.user
      const ref = 'KSP-webhooktest'
      await S.db('payments').insert({ id: crypto.randomUUID(), reference: ref, kind: 'topup', user_id: u.id, amount: 2000, status: 'pending', provider: 'paystack', meta: '{}', created_at: now() })
      const body = JSON.stringify({ event: 'charge.success', data: { reference: ref, amount: 200000 } })
      const sign = (b, k = 'sk_test_secret') => crypto.createHmac('sha512', k).update(b).digest('hex')
      const send = (b, sig) => fetch(S.base + '/api/paystack/webhook', { method: 'POST', headers: { 'content-type': 'application/json', 'x-paystack-signature': sig }, body: b })
      const w0 = await wallet(musa)
      assert.equal((await send(body, 'deadbeef')).status, 401); assert.equal((await send(body, sign(body, 'wrong'))).status, 401)
      assert.equal(await wallet(musa), w0, 'unsigned webhook must do nothing')
      assert.equal((await send(body, sign(body))).status, 200); assert.equal(await wallet(musa), w0 + 2000)
      assert.equal((await send(body, sign(body))).status, 200); assert.equal(await wallet(musa), w0 + 2000, 'replay does not double credit')
      const short = JSON.stringify({ event: 'charge.success', data: { reference: 'KSP-short', amount: 100 } })
      await S.db('payments').insert({ id: crypto.randomUUID(), reference: 'KSP-short', kind: 'topup', user_id: u.id, amount: 2000, status: 'pending', provider: 'paystack', meta: '{}', created_at: now() })
      await send(short, sign(short)); assert.equal(await wallet(musa), w0 + 2000, 'underpayment is not credited')
      assert.equal((await musa.post('/api/payments/KSP-x/mock-pay')).status, 404, 'mock endpoint is disabled when a Paystack key is set')
    } finally { config.paystackSecret = prev }
  })
})

describe('verification, vendor badge, notifications, messages', () => {
  test('student ID flow: upload -> admin queue -> private photo -> approve -> can sell', async () => {
    const z = await as(ZAINAB), admin = await as('ADMIN', 'Admin@12345'), musa = await as(MUSA)
    assert.equal((await z.upload('/api/me/verification', new FormData())).status, 400)
    const f = new FormData(); f.append('idPhoto', image(), 'id.png')
    assert.equal((await z.upload('/api/me/verification', f)).status, 201)
    assert.equal((await z.get('/api/auth/me')).data.user.verificationStatus, 'pending')
    const q = await admin.get('/api/admin/verifications'); const row = q.data.items.find((x) => x.matric === ZAINAB); assert.ok(row)
    assert.equal((await admin.get(`/api/admin/verifications/${row.id}/photo`)).res.status, 200)
    assert.equal((await musa.get(`/api/admin/verifications/${row.id}/photo`)).status, 403, 'ID photos are admin-only')
    assert.equal((await client(S.base).get(`/api/admin/verifications/${row.id}/photo`)).status, 401)
    assert.equal((await z.post(`/api/admin/verifications/${row.id}/decision`, { approve: true })).status, 403)
    assert.equal((await admin.post(`/api/admin/verifications/${row.id}/decision`, { approve: true })).status, 200)
    const fresh = await as(ZAINAB); assert.equal((await fresh.get('/api/auth/me')).data.user.verificationStatus, 'approved')
    assert.ok((await fresh.get('/api/notifications')).data.items.some((n) => /verified/i.test(n.title)))
  })
  test('vendor badge: launch price once, 90 days, boost, dashboard stats', async () => {
    const ibrahim = await as(IBRAHIM)
    assert.equal((await ibrahim.get('/api/vendor/stats')).status, 403)
    const info = (await ibrahim.get('/api/vendor/badge')).data; assert.equal(info.price, 3500); assert.equal(info.launchAvailable, true)
    const co = await ibrahim.post('/api/vendor/badge/checkout'); assert.equal(co.data.amount, 3500)
    await ibrahim.post(`/api/payments/${co.data.reference}/mock-pay`)
    const me = (await ibrahim.get('/api/auth/me')).data.user
    assert.equal(me.isVendor, true); assert.equal(me.boostActive, true)
    const days = Math.round((new Date(me.vendorExpiry) - Date.now()) / 86400000); assert.ok(days >= 89 && days <= 90)
    const again = (await ibrahim.get('/api/vendor/badge')).data; assert.equal(again.price, 5000, 'launch price is one-time')
    await ibrahim.post(`/api/payments/${(await ibrahim.post('/api/vendor/badge/checkout')).data.reference}/mock-pay`)
    assert.ok(Math.round((new Date((await ibrahim.get('/api/auth/me')).data.user.vendorExpiry) - Date.now()) / 86400000) >= 179, 'renewal adds to remaining time')
    const st = await (await as(AISHA)).get('/api/vendor/stats'); assert.equal(st.status, 200); assert.equal(st.data.series.length, 7)
  })
  test('messages: start, unread counts, read marks, strangers locked out', async () => {
    const musa = await as(MUSA), aisha = await as(AISHA), fatima = await as(FATIMA)
    const aid = (await aisha.get('/api/auth/me')).data.user.id
    const start = await musa.post('/api/conversations', { userId: aid, body: 'Is the charger still available?' }); assert.equal(start.status, 201)
    assert.equal((await musa.post('/api/conversations', { userId: aid, body: '' })).status, 400)
    assert.equal((await musa.post('/api/conversations', { userId: (await musa.get('/api/auth/me')).data.user.id, body: 'hi' })).status, 400)
    const list = (await aisha.get('/api/conversations')).data; assert.equal(list.unread, 1)
    const thread = await aisha.get(`/api/conversations/${start.data.id}`); assert.equal(thread.data.messages.length, 1)
    assert.equal((await aisha.get('/api/conversations')).data.unread, 0)
    assert.equal((await fatima.get(`/api/conversations/${start.data.id}`)).status, 404)
    assert.equal((await fatima.post(`/api/conversations/${start.data.id}/messages`, { body: 'hello' })).status, 404)
    const n = (await aisha.get('/api/notifications')).data; assert.ok(n.unread >= 1)
    await aisha.post('/api/notifications/read', {}); assert.equal((await aisha.get('/api/notifications/count')).data.unread, 0)
  })
  test('admin can ban users; banned users are locked out', async () => {
    const admin = await as('ADMIN', 'Admin@12345'), mus = await as(MUSA)
    const id = (await mus.get('/api/auth/me')).data.user.id
    await admin.post(`/api/admin/users/${id}/ban`, { banned: true })
    assert.equal((await mus.get('/api/auth/me')).data.user, null, 'existing session stops working')
    assert.equal((await client(S.base).post('/api/auth/login', { identifier: MUSA, password: 'password123' })).status, 401)
    await admin.post(`/api/admin/users/${id}/ban`, { banned: false })
  })
})

describe('abuse protection', () => {
  test('repeated bad logins are rate limited', async () => {
    const prev = config.authRateLimit; config.authRateLimit = 4
    const T = await startServer({ withSeed: false })
    try {
      const c = client(T.base); const codes = []
      for (let i = 0; i < 7; i++) codes.push((await c.post('/api/auth/login', { identifier: 'a@b.com', password: 'wrong-password' })).status)
      assert.deepEqual(codes.slice(0, 4), [401, 401, 401, 401]); assert.ok(codes.slice(4).every((x) => x === 429), 'attempts after the limit get 429: ' + codes)
    } finally { config.authRateLimit = prev; await T.close() }
  })
})
