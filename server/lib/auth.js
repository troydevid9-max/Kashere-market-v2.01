import jwt from 'jsonwebtoken'
import { config } from '../config.js'
import { AppError, asyncH } from './http.js'

const COOKIE = 'kt'
export const signToken = (userId) => jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: '7d' })

export const setAuthCookie = (res, userId) =>
  res.cookie(COOKIE, signToken(userId), { httpOnly: true, sameSite: 'lax', secure: config.prod, maxAge: 7 * 86400000, path: '/' })
export const clearAuthCookie = (res) => res.clearCookie(COOKIE, { path: '/' })

/** Attaches req.user (full DB row) when a valid cookie is present. */
export const loadUser = (db) => asyncH(async (req, _res, next) => {
  const token = req.cookies?.[COOKIE]
  if (token) {
    try {
      const { sub } = jwt.verify(token, config.jwtSecret)
      const u = await db('users').where({ id: sub }).first()
      if (u && !u.banned) req.user = u
    } catch { /* invalid or expired token: treat as signed out */ }
  }
  next()
})

export const requireAuth = (req, _res, next) => (req.user ? next() : next(new AppError(401, 'Please log in.', 'AUTH')))
export const requireAdmin = (req, _res, next) => (req.user?.is_admin ? next() : next(new AppError(403, 'Admins only.', 'FORBIDDEN')))
export const requireVerified = (req, _res, next) => {
  if (config.requireVerification && req.user.verification_status !== 'approved' && !req.user.is_admin) {
    return next(new AppError(403, 'Verify your student status first.', 'NOT_VERIFIED'))
  }
  next()
}
export const isVendorActive = (u) => !!u.vendor_expires_at && u.vendor_expires_at > new Date().toISOString()
