/* Create (or reset) a real admin account:  ADMIN_EMAIL=you@x.com ADMIN_PASSWORD=... npm run create-admin */
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { createDb } from './db.js'
import { ensureSchema } from './schema.js'
import { now } from './lib/http.js'

const email = (process.env.ADMIN_EMAIL || '').toLowerCase()
const password = process.env.ADMIN_PASSWORD || ''
if (!email || password.length < 12) { console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD (at least 12 characters).'); process.exit(1) }
const db = createDb(); await ensureSchema(db)
const hash = await bcrypt.hash(password, 12)
const existing = await db('users').where({ email }).first()
if (existing) await db('users').where({ id: existing.id }).update({ password_hash: hash, is_admin: 1 })
else await db('users').insert({ id: crypto.randomUUID(), name: 'Admin', email, matric: 'ADMIN-' + crypto.randomBytes(3).toString('hex').toUpperCase(), phone: null, password_hash: hash, is_admin: 1, verification_status: 'approved', created_at: now() })
console.log('Admin ready:', email); await db.destroy()
