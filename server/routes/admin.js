import { Router } from 'express'
import fs from 'node:fs'
import { config } from '../config.js'
import { asyncH, AppError, validate, z, now } from '../lib/http.js'
import { requireAuth, requireAdmin, isVendorActive } from '../lib/auth.js'
import { releaseOrder, refundOrder } from '../lib/orders.js'
import * as ledger from '../lib/ledger.js'
import { notify } from '../lib/notify.js'
import { privatePath } from '../lib/uploads.js'

export default function adminRoutes(db) {
  const r = Router()
  r.use(requireAuth, requireAdmin)
  const log = (adminId, action, target, detail) => db('admin_logs').insert({ admin_id: adminId, action, target, detail: detail || null, created_at: now() })
  const count = async (q) => Number((await q.count({ c: '*' }).first()).c)

  r.get('/stats', asyncH(async (_req, res) => {
    const month = new Date(); month.setDate(1); month.setHours(0, 0, 0, 0)
    const escrow = await db('orders').whereIn('status', ['paid', 'shipped', 'delivered', 'disputed']).sum({ s: 'total' }).first()
    const revenue = await db('ledger').whereNull('user_id').where({ type: 'commission' }).sum({ s: 'amount' }).first()
    res.json({
      users: await count(db('users')), verifiedUsers: await count(db('users').where({ verification_status: 'approved' })),
      pendingVerifications: await count(db('users').where({ verification_status: 'pending' })),
      activeListings: await count(db('products').where({ status: 'active' })), completedOrders: await count(db('orders').where({ status: 'confirmed' })),
      openDisputes: await count(db('complaints').where({ status: 'open' })), pendingWithdrawals: await count(db('withdrawals').where({ status: 'pending' })),
      activeVendors: await count(db('users').where('vendor_expires_at', '>', now())), escrowHeld: Number(escrow.s || 0), platformRevenue: Number(revenue.s || 0),
      newUsersThisMonth: await count(db('users').where('created_at', '>=', month.toISOString()))
    })
  }))

  r.get('/users', validate(z.object({ q: z.string().max(60).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }), 'query'), asyncH(async (req, res) => {
    const q = db('users').orderBy('created_at', 'desc').limit(req.valid.limit)
    if (req.valid.q) { const like = `%${req.valid.q.toLowerCase()}%`; q.where((b) => b.whereRaw('lower(name) like ?', [like]).orWhereRaw('lower(email) like ?', [like]).orWhereRaw('lower(matric) like ?', [like])) }
    res.json({ items: (await q).map((u) => ({ id: u.id, name: u.name, email: u.email, matric: u.matric, phone: u.phone, isAdmin: !!u.is_admin, isVendor: isVendorActive(u), verificationStatus: u.verification_status, banned: !!u.banned, walletBalance: u.wallet_balance, createdAt: u.created_at })) })
  }))
  r.post('/users/:id/ban', validate(z.object({ banned: z.boolean() })), asyncH(async (req, res) => {
    const u = await db('users').where({ id: req.params.id }).first()
    if (!u) throw new AppError(404, 'User not found.', 'NOT_FOUND')
    if (u.is_admin) throw new AppError(400, 'Admins cannot be banned here.', 'FORBIDDEN')
    await db('users').where({ id: u.id }).update({ banned: req.valid.banned ? 1 : 0 })
    await log(req.user.id, req.valid.banned ? 'ban' : 'unban', u.id)
    res.json({ ok: true })
  }))

  // ---- student verification queue ----
  r.get('/verifications', validate(z.object({ status: z.enum(['pending', 'approved', 'rejected']).default('pending') }), 'query'), asyncH(async (req, res) => {
    const rows = await db('users').where({ verification_status: req.valid.status }).whereNotNull('id_photo').orderBy('created_at', 'asc').limit(100)
    res.json({ items: rows.map((u) => ({ id: u.id, name: u.name, matric: u.matric, email: u.email, status: u.verification_status, note: u.verification_note, createdAt: u.created_at })) })
  }))
  r.get('/verifications/:id/photo', asyncH(async (req, res) => {
    const u = await db('users').where({ id: req.params.id }).first()
    if (!u?.id_photo) throw new AppError(404, 'No ID photo.', 'NOT_FOUND')
    const p = privatePath(u.id_photo)
    if (!fs.existsSync(p)) throw new AppError(404, 'Photo missing.', 'NOT_FOUND')
    res.set('Cache-Control', 'private, no-store').sendFile(p)
  }))
  r.post('/verifications/:id/decision', validate(z.object({ approve: z.boolean(), note: z.string().trim().max(200).optional() })), asyncH(async (req, res) => {
    const u = await db('users').where({ id: req.params.id }).first()
    if (!u || u.verification_status !== 'pending') throw new AppError(409, 'No pending request for this student.', 'STATE')
    const d = req.valid
    await db('users').where({ id: u.id }).update({ verification_status: d.approve ? 'approved' : 'rejected', verification_note: d.approve ? null : d.note || 'ID could not be verified.' })
    await notify(db, u.id, d.approve ? 'You are verified' : 'Verification declined', d.approve ? 'You can now buy and sell on Kashere.' : d.note || 'Please upload a clearer photo of your student ID.', '/verify')
    await log(req.user.id, d.approve ? 'verify_approve' : 'verify_reject', u.id, d.note)
    res.json({ ok: true })
  }))

  // ---- listings ----
  r.get('/listings', asyncH(async (_req, res) => {
    const rows = await db('products as p').join('users as u', 'u.id', 'p.seller_id').whereNot('p.status', 'removed').orderBy('p.created_at', 'desc').limit(100).select('p.id', 'p.title', 'p.price', 'p.quantity', 'p.views', 'p.status', 'p.created_at', 'u.name as seller')
    res.json({ items: rows })
  }))

  // ---- disputes ----
  r.get('/complaints', asyncH(async (_req, res) => {
    const rows = await db('complaints as c').join('orders as o', 'o.id', 'c.order_id').join('users as b', 'b.id', 'c.buyer_id').join('users as s', 's.id', 'c.seller_id')
      .orderByRaw("case when c.status = 'open' then 0 else 1 end").orderBy('c.created_at', 'desc').limit(100)
      .select('c.*', 'o.code', 'o.total', 'o.status as orderStatus', 'b.name as buyerName', 's.name as sellerName')
    res.json({ items: rows.map((c) => ({ id: c.id, orderId: c.order_id, code: c.code, total: c.total, orderStatus: c.orderStatus, type: c.type, description: c.description, status: c.status, resolution: c.resolution, resolutionNote: c.resolution_note, buyerName: c.buyerName, sellerName: c.sellerName, createdAt: c.created_at })) })
  }))
  r.post('/complaints/:id/resolve', validate(z.object({ resolution: z.enum(['release', 'refund']), note: z.string().trim().max(300).optional() })), asyncH(async (req, res) => {
    const c = await db('complaints').where({ id: req.params.id }).first()
    if (!c || c.status !== 'open') throw new AppError(409, 'This complaint is already resolved.', 'STATE')
    await db.transaction(async (trx) => {
      const o = await trx('orders').where({ id: c.order_id }).first()
      if (req.valid.resolution === 'release') await releaseOrder(trx, o, { byAdmin: true })
      else await refundOrder(trx, o, 'dispute resolved for buyer')
      await trx('complaints').where({ id: c.id }).update({ status: 'resolved', resolution: req.valid.resolution, resolution_note: req.valid.note || null, resolved_by: req.user.id, resolved_at: now() })
      await trx('admin_logs').insert({ admin_id: req.user.id, action: `dispute_${req.valid.resolution}`, target: c.order_id, detail: req.valid.note || null, created_at: now() })
    })
    res.json({ ok: true })
  }))

  // ---- withdrawals ----
  r.get('/withdrawals', asyncH(async (_req, res) => {
    const rows = await db('withdrawals as w').join('users as u', 'u.id', 'w.user_id').orderByRaw("case when w.status = 'pending' then 0 else 1 end").orderBy('w.created_at', 'desc').limit(100)
      .select('w.*', 'u.name as userName', 'u.matric')
    res.json({ items: rows.map((w) => ({ id: w.id, amount: w.amount, bankName: w.bank_name, accountNumber: w.account_number, accountName: w.account_name, status: w.status, note: w.note, userName: w.userName, matric: w.matric, createdAt: w.created_at })) })
  }))
  r.post('/withdrawals/:id/decision', validate(z.object({ pay: z.boolean(), note: z.string().trim().max(200).optional() })), asyncH(async (req, res) => {
    await db.transaction(async (trx) => {
      const w = await trx('withdrawals').where({ id: req.params.id }).first()
      const n = w ? await trx('withdrawals').where({ id: w.id, status: 'pending' }).update({ status: req.valid.pay ? 'paid' : 'rejected', note: req.valid.note || null, processed_at: now() }) : 0
      if (!n) throw new AppError(409, 'This withdrawal was already processed.', 'STATE')
      if (!req.valid.pay) await ledger.post(trx, { userId: w.user_id, type: 'withdrawal_refund', amount: w.amount, refType: 'withdrawal', refId: w.id, description: 'Withdrawal rejected, money returned' })
      await notify(trx, w.user_id, req.valid.pay ? 'Withdrawal paid' : 'Withdrawal rejected', req.valid.pay ? `₦${w.amount.toLocaleString('en-NG')} was sent to your bank account.` : (req.valid.note || 'The money was returned to your wallet.'), '/wallet')
      await trx('admin_logs').insert({ admin_id: req.user.id, action: req.valid.pay ? 'withdrawal_paid' : 'withdrawal_rejected', target: w.id, detail: null, created_at: now() })
    })
    res.json({ ok: true })
  }))

  r.get('/vendors', asyncH(async (_req, res) => {
    const rows = await db('users').where('account_type', 'vendor').orderBy('created_at', 'desc').limit(100)
    res.json({ items: rows.map((u) => ({ id: u.id, name: u.name, businessName: u.business_name, matric: u.matric, active: isVendorActive(u), expiresAt: u.vendor_expires_at })) })
  }))
  void config
  return r
}
