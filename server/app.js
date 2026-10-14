import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import helmet from 'helmet'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import { fileURLToPath } from 'node:url'
import { config } from './config.js'
import { AppError } from './lib/http.js'
import { loadUser } from './lib/auth.js'
import { publicDir } from './lib/uploads.js'
import authRoutes from './routes/auth.js'
import catalogRoutes from './routes/catalog.js'
import orderRoutes, { paystackWebhook } from './routes/orders.js'
import walletRoutes from './routes/wallet.js'
import accountRoutes from './routes/account.js'
import messageRoutes from './routes/messages.js'
import adminRoutes from './routes/admin.js'

export function createApp(db) {
  const app = express()
  app.disable('x-powered-by')
  if (config.prod) app.set('trust proxy', 1)
  app.use(helmet({
    contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], imgSrc: ["'self'", 'data:', 'blob:'], styleSrc: ["'self'", "'unsafe-inline'"], scriptSrc: ["'self'"], connectSrc: ["'self'"], fontSrc: ["'self'", 'data:'], frameAncestors: ["'none'"], objectSrc: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'same-site' }
  }))

  // Paystack webhook needs the RAW body to check the signature, so it is mounted before express.json().
  app.post('/api/paystack/webhook', express.raw({ type: '*/*', limit: '200kb' }), paystackWebhook(db))

  app.use(express.json({ limit: '100kb' }))
  app.use(cookieParser())
  // Cookies are SameSite=Lax; this extra header check blocks cross-site form posts as defence in depth.
  app.use('/api', (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next()
    if (req.get('x-requested-with') !== 'kashere') return next(new AppError(403, 'Bad request origin.', 'CSRF'))
    next()
  })
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 600, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests.' } }))
  app.use('/api', loadUser(db))

  app.get('/api/health', (_req, res) => res.json({ ok: true, mockPayments: config.mockPayments }))
  app.use('/api/auth', authRoutes(db))
  app.use('/api/wallet', walletRoutes(db))
  app.use('/api/admin', adminRoutes(db))
  app.use('/api', messageRoutes(db))
  app.use('/api', accountRoutes(db))
  app.use('/api', catalogRoutes(db))
  app.use('/api', orderRoutes(db))
  app.use('/api', (_req, _res, next) => next(new AppError(404, 'Not found.', 'NOT_FOUND')))

  app.use('/uploads', express.static(publicDir, { maxAge: '7d', index: false, dotfiles: 'deny' }))

  // Production: serve the built frontend from the same origin (so cookies just work).
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false, maxAge: '1h' }))
    app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => res.sendFile(path.join(dist, 'index.html')))
  }

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err instanceof AppError) return res.status(err.status).json({ error: err.message, code: err.code })
    if (err instanceof multer.MulterError) return res.status(400).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Each photo must be under 5MB.' : 'Upload problem: ' + err.message, code: 'BAD_FILE' })
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON.', code: 'VALIDATION' })
    console.error(err)
    res.status(500).json({ error: 'Something went wrong on our side.', code: 'SERVER' })
  })
  return app
}
