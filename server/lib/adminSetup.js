import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { now } from './http.js'

/**
 * Makes sure an admin account exists.
 *  - no such email: creates it
 *  - email exists but is not admin: promotes it (password untouched)
 *  - email exists and is admin: does nothing, unless reset=true (then the password is replaced)
 * Returns what it did so the caller can log it.
 */
export async function ensureAdmin(db, { email, password, reset = false }) {
  email = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('ADMIN_EMAIL is not a valid email address.')
  if (String(password || '').length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters.')
  const existing = await db('users').where({ email }).first()
  if (!existing) {
    await db('users').insert({
      id: crypto.randomUUID(), name: 'Admin', email, matric: 'ADMIN-' + crypto.randomBytes(3).toString('hex').toUpperCase(), phone: null,
      password_hash: await bcrypt.hash(password, 12), is_admin: 1, verification_status: 'approved', created_at: now()
    })
    return 'created'
  }
  if (!existing.is_admin) { await db('users').where({ id: existing.id }).update({ is_admin: 1, verification_status: 'approved' }); return 'promoted' }
  if (reset) { await db('users').where({ id: existing.id }).update({ password_hash: await bcrypt.hash(password, 12) }); return 'password reset' }
  return 'already exists'
}
