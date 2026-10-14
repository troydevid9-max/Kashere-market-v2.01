import { Router } from 'express'
import crypto from 'node:crypto'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { config } from '../config.js'
import { asyncH, AppError, validate, z, now } from '../lib/http.js'
import { requireAuth, requireVerified } from '../lib/auth.js'
import * as ledger from '../lib/ledger.js'
import { notify } from '../lib/notify.js'
import { startPayment } from '../lib/paymentsInit.js'
import { MATRIC_RE } from '../lib/constants.js'

const money = z.coerce.number().int().min(100).max(1_000_000)
const sendLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip), message: { error: 'Slow down. Too many wallet actions.' } })

export default function walletRoutes(db) {
  const r = Router()
  r.use(requireAuth)

  r.get('/', asyncH(async (req, res) => {
    const u = await db('users').where({ id: req.user.id }).first('wallet_balance')
    const rows = await db('ledger').where({ user_id: req.user.id }).orderBy('id', 'desc').limit(60)
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0)
    const net = rows.filter((x) => x.created_at >= monthStart.toISOString()).reduce((s, x) => s + x.amount, 0)
    const base = u.wallet_balance - net
    const held = await db('orders').where({ seller_id: req.user.id }).whereIn('status', ['paid', 'shipped', 'delivered']).select('subtotal', 'delivery_fee')
    const pending = held.reduce((s, o) => s + o.subtotal - Math.round((o.subtotal * config.commissionPercent) / 100) + o.delivery_fee, 0)
    res.json({
      balance: u.wallet_balance, pendingEscrow: pending, monthNet: net, monthPercent: base > 0 ? Math.round((net / base) * 1000) / 10 : null,
      transactions: rows.map((x) => ({ id: x.id, type: x.type, amount: x.amount, balanceAfter: x.balance_after, description: x.description, createdAt: x.created_at }))
    })
  }))

  r.post('/topup', requireVerified, validate(z.object({ amount: money })), asyncH(async (req, res) => {
    const reference = 'KSP-' + crypto.randomBytes(8).toString('hex')
    await db('payments').insert({ id: crypto.randomUUID(), reference, kind: 'topup', user_id: req.user.id, amount: req.valid.amount, status: 'pending', provider: config.mockPayments ? 'mock' : 'paystack', meta: '{}', created_at: now() })
    res.status(201).json(await startPayment(req.user, { reference, amount: req.valid.amount }))
  }))

  // Student-to-student transfer. One DB transaction: both ledger rows or neither.
  r.post('/send', requireVerified, sendLimiter, validate(z.object({ matric: z.string().trim().regex(MATRIC_RE).transform((s) => s.toUpperCase()), amount: money, note: z.string().trim().max(80).optional() })), asyncH(async (req, res) => {
    const to = await db('users').where({ matric: req.valid.matric }).first()
    if (!to || to.banned) throw new AppError(404, 'No student found with that matric number.', 'NOT_FOUND')
    if (to.id === req.user.id) throw new AppError(400, 'You cannot send money to yourself.', 'SELF')
    const bal = await db.transaction(async (trx) => {
      const b = await ledger.post(trx, { userId: req.user.id, type: 'transfer_out', amount: -req.valid.amount, refType: 'user', refId: to.id, description: `Sent to ${to.name}${req.valid.note ? ` · ${req.valid.note}` : ''}` })
      await ledger.post(trx, { userId: to.id, type: 'transfer_in', amount: req.valid.amount, refType: 'user', refId: req.user.id, description: `Received from ${req.user.name}${req.valid.note ? ` · ${req.valid.note}` : ''}` })
      await notify(trx, to.id, 'You received money', `${req.user.name} sent you ₦${req.valid.amount.toLocaleString('en-NG')}.`, '/wallet')
      return b
    })
    res.json({ balance: bal })
  }))

  r.post('/withdraw', requireVerified, sendLimiter, validate(z.object({
    amount: z.coerce.number().int().min(config.minWithdrawal).max(1_000_000), bankName: z.string().trim().min(2).max(60),
    accountNumber: z.string().regex(/^\d{10}$/, 'must be 10 digits'), accountName: z.string().trim().min(3).max(80)
  })), asyncH(async (req, res) => {
    const d = req.valid, id = crypto.randomUUID()
    const bal = await db.transaction(async (trx) => {
      const b = await ledger.post(trx, { userId: req.user.id, type: 'withdrawal', amount: -d.amount, refType: 'withdrawal', refId: id, description: `Withdrawal to ${d.bankName} ${d.accountNumber.slice(-4).padStart(10, '*')}` })
      await trx('withdrawals').insert({ id, user_id: req.user.id, amount: d.amount, bank_name: d.bankName, account_number: d.accountNumber, account_name: d.accountName, status: 'pending', created_at: now() })
      return b
    })
    res.status(201).json({ balance: bal, withdrawalId: id })
  }))

  r.get('/withdrawals', asyncH(async (req, res) => {
    const rows = await db('withdrawals').where({ user_id: req.user.id }).orderBy('created_at', 'desc').limit(30)
    res.json({ items: rows.map((w) => ({ id: w.id, amount: w.amount, bankName: w.bank_name, accountNumber: '******' + w.account_number.slice(-4), status: w.status, note: w.note, createdAt: w.created_at })) })
  }))
  return r
}
