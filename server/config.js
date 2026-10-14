import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const env = process.env
const prod = env.NODE_ENV === 'production'
if (prod && !env.JWT_SECRET) throw new Error('JWT_SECRET must be set in production')

export const config = {
  prod,
  port: Number(env.PORT || 3001),
  jwtSecret: env.JWT_SECRET || 'dev-only-secret-change-me',
  databaseUrl: env.DATABASE_URL || '',
  sqliteFile: env.SQLITE_FILE || path.join(here, 'data', 'kashere.db'),
  uploadDir: env.UPLOAD_DIR || path.join(here, 'uploads'),
  appUrl: env.APP_URL || 'http://localhost:5173',
  paystackSecret: env.PAYSTACK_SECRET_KEY || '',
  // Mock payments exist ONLY outside production and only when no Paystack key is set.
  get mockPayments() { return !this.paystackSecret && !this.prod },
  commissionPercent: Number(env.COMMISSION_PERCENT ?? 6),
  requireVerification: env.REQUIRE_VERIFICATION !== 'false',
  autoReleaseDays: Number(env.AUTO_RELEASE_DAYS ?? 3),
  pendingPaymentMinutes: Number(env.PENDING_PAYMENT_MINUTES ?? 30),
  deliveryFee: Number(env.DELIVERY_FEE ?? 1000),
  badgePrice: Number(env.BADGE_PRICE ?? 5000),
  badgeLaunchPrice: Number(env.BADGE_LAUNCH_PRICE ?? 3500),
  launchSlots: Number(env.LAUNCH_SLOTS ?? 100),
  badgeDays: 90,
  boostDays: 30,
  authRateLimit: Number(env.AUTH_RATE_LIMIT ?? 20),
  minWithdrawal: Number(env.MIN_WITHDRAWAL ?? 1000)
}
