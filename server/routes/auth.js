import { Router } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'
import rateLimit from 'express-rate-limit'
import { config } from '../config.js'
import { asyncH, AppError, validate, z, now } from '../lib/http.js'
import { setAuthCookie, clearAuthCookie, requireAuth } from '../lib/auth.js'
import { privateUser, ratingFor } from '../lib/serialize.js'
import { MATRIC_RE, PHONE_RE, CATEGORY_IDS } from '../lib/constants.js'

// Used so a login for an unknown account costs the same time as a real one (no account enumeration by timing).
const DUMMY = bcrypt.hashSync('not-a-real-password', 10)

const signupSchema = z.object({
  name: z.string().trim().min(3).max(80),
  matric: z.string().trim().regex(MATRIC_RE, 'use the format FUK/CS/2023/001').transform((s) => s.toUpperCase()),
  email: z.string().trim().toLowerCase().email().max(120),
  phone: z.string().trim().regex(PHONE_RE, 'enter an 11-digit Nigerian number'),
  password: z.string().min(8).max(100),
  accountType: z.enum(['student', 'vendor']).default('student'),
  businessName: z.string().trim().max(80).optional(),
  storeCategory: z.enum(CATEGORY_IDS).optional(),
  deliveryLocation: z.string().trim().max(120).optional()
})

export default function authRoutes(db) {
  const r = Router()
  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: config.authRateLimit, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } })

  r.post('/signup', limiter, validate(signupSchema), asyncH(async (req, res) => {
    const d = req.valid
    if (d.accountType === 'vendor' && !d.businessName) throw new AppError(400, 'businessName: required for vendor accounts', 'VALIDATION')
    const dup = await db('users').where({ email: d.email }).orWhere({ matric: d.matric }).first()
    if (dup) throw new AppError(409, 'An account with that email or matric number already exists.', 'DUPLICATE')
    const id = crypto.randomUUID()
    await db('users').insert({
      id, name: d.name, email: d.email, matric: d.matric, phone: d.phone, password_hash: await bcrypt.hash(d.password, 10),
      account_type: d.accountType, business_name: d.businessName || null, store_category: d.storeCategory || null,
      delivery_location: d.deliveryLocation || null, created_at: now()
    })
    setAuthCookie(res, id)
    const u = await db('users').where({ id }).first()
    res.status(201).json({ user: privateUser(u) })
  }))

  r.post('/login', limiter, validate(z.object({ identifier: z.string().trim().min(1).max(120), password: z.string().min(1).max(100) })), asyncH(async (req, res) => {
    const id = req.valid.identifier
    const u = await db('users').where({ email: id.toLowerCase() }).orWhere({ matric: id.toUpperCase() }).first()
    const ok = await bcrypt.compare(req.valid.password, u?.password_hash || DUMMY)
    if (!u || !ok || u.banned) throw new AppError(401, 'Wrong matric/email or password.', 'AUTH')
    setAuthCookie(res, u.id)
    res.json({ user: privateUser(u, await ratingFor(db, u.id)) })
  }))

  r.post('/logout', (_req, res) => { clearAuthCookie(res); res.json({ ok: true }) })

  r.get('/me', asyncH(async (req, res) => {
    if (!req.user) return res.json({ user: null })
    res.json({ user: privateUser(req.user, await ratingFor(db, req.user.id)) })
  }))

  r.patch('/me', requireAuth, validate(z.object({
    name: z.string().trim().min(3).max(80).optional(), phone: z.string().trim().regex(PHONE_RE).optional(),
    businessName: z.string().trim().max(80).optional(), storeCategory: z.enum(CATEGORY_IDS).optional(), deliveryLocation: z.string().trim().max(120).optional()
  })), asyncH(async (req, res) => {
    const d = req.valid, patch = {}
    if (d.name) patch.name = d.name
    if (d.phone) patch.phone = d.phone
    if (d.businessName !== undefined) patch.business_name = d.businessName
    if (d.storeCategory) patch.store_category = d.storeCategory
    if (d.deliveryLocation !== undefined) patch.delivery_location = d.deliveryLocation
    if (Object.keys(patch).length) await db('users').where({ id: req.user.id }).update(patch)
    const u = await db('users').where({ id: req.user.id }).first()
    res.json({ user: privateUser(u, await ratingFor(db, u.id)) })
  }))

  r.post('/change-password', requireAuth, limiter, validate(z.object({ current: z.string().min(1), next: z.string().min(8).max(100) })), asyncH(async (req, res) => {
    if (!(await bcrypt.compare(req.valid.current, req.user.password_hash))) throw new AppError(400, 'Current password is wrong.', 'AUTH')
    await db('users').where({ id: req.user.id }).update({ password_hash: await bcrypt.hash(req.valid.next, 10) })
    res.json({ ok: true })
  }))
  return r
}
