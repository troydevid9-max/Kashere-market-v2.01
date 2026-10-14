import { Router } from 'express'
import crypto from 'node:crypto'
import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
import { asyncH, AppError, validate, z, now } from '../lib/http.js'
import { requireAuth } from '../lib/auth.js'
import { notify } from '../lib/notify.js'

const sendLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: true, legacyHeaders: false, keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip), message: { error: 'You are sending messages too fast.' } })
const body = z.string().trim().min(1).max(1000)

export default function messageRoutes(db) {
  const r = Router()
  r.use('/conversations', requireAuth)

  const mine = async (id, userId) => {
    const c = await db('conversations').where({ id }).first()
    if (!c || (c.user_a !== userId && c.user_b !== userId)) throw new AppError(404, 'Conversation not found.', 'NOT_FOUND')
    return c
  }
  const addMessage = async (trx, conv, sender, text) => {
    await trx('messages').insert({ conversation_id: conv.id, sender_id: sender.id, body: text, created_at: now() })
    await trx('conversations').where({ id: conv.id }).update({ last_message_at: now() })
    const other = conv.user_a === sender.id ? conv.user_b : conv.user_a
    await notify(trx, other, `New message from ${sender.name}`, text.slice(0, 80), `/messages?c=${conv.id}`)
  }

  r.get('/conversations', asyncH(async (req, res) => {
    const convs = await db('conversations').where((b) => b.where('user_a', req.user.id).orWhere('user_b', req.user.id)).orderBy('last_message_at', 'desc').limit(60)
    const out = []
    for (const c of convs) {
      const otherId = c.user_a === req.user.id ? c.user_b : c.user_a
      const other = await db('users').where({ id: otherId }).first('id', 'name')
      const last = await db('messages').where({ conversation_id: c.id }).orderBy('id', 'desc').first()
      const unread = Number((await db('messages').where({ conversation_id: c.id }).whereNot({ sender_id: req.user.id }).whereNull('read_at').count({ c: '*' }).first()).c)
      out.push({ id: c.id, other, lastMessage: last?.body || '', lastAt: c.last_message_at, unread, productId: c.product_id })
    }
    res.json({ items: out, unread: out.reduce((s, c) => s + c.unread, 0) })
  }))

  r.post('/conversations', sendLimiter, validate(z.object({ userId: z.string().min(1).max(60), productId: z.string().max(60).optional(), body })), asyncH(async (req, res) => {
    if (req.valid.userId === req.user.id) throw new AppError(400, 'You cannot message yourself.', 'SELF')
    const other = await db('users').where({ id: req.valid.userId }).first()
    if (!other || other.banned) throw new AppError(404, 'User not found.', 'NOT_FOUND')
    const id = await db.transaction(async (trx) => {
      let c = await trx('conversations').where((b) => b.where({ user_a: req.user.id, user_b: other.id }).orWhere({ user_a: other.id, user_b: req.user.id })).first()
      if (!c) { c = { id: crypto.randomUUID(), user_a: req.user.id, user_b: other.id, product_id: req.valid.productId || null, last_message_at: now(), created_at: now() }; await trx('conversations').insert(c) }
      await addMessage(trx, c, req.user, req.valid.body)
      return c.id
    })
    res.status(201).json({ id })
  }))

  r.get('/conversations/:id', asyncH(async (req, res) => {
    const c = await mine(req.params.id, req.user.id)
    await db('messages').where({ conversation_id: c.id }).whereNot({ sender_id: req.user.id }).whereNull('read_at').update({ read_at: now() })
    const msgs = await db('messages').where({ conversation_id: c.id }).orderBy('id', 'asc').limit(300)
    const other = await db('users').where({ id: c.user_a === req.user.id ? c.user_b : c.user_a }).first('id', 'name')
    res.json({ id: c.id, other, productId: c.product_id, messages: msgs.map((m) => ({ id: m.id, mine: m.sender_id === req.user.id, body: m.body, createdAt: m.created_at })) })
  }))

  r.post('/conversations/:id/messages', sendLimiter, validate(z.object({ body })), asyncH(async (req, res) => {
    const c = await mine(req.params.id, req.user.id)
    await db.transaction((trx) => addMessage(trx, c, req.user, req.valid.body))
    res.status(201).json({ ok: true })
  }))
  return r
}
