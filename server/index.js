import { config } from './config.js'
import { createDb } from './db.js'
import { ensureSchema } from './schema.js'
import { createApp } from './app.js'
import { runJobs } from './jobs.js'
import { ensureAdmin } from './lib/adminSetup.js'

const db = createDb()
await ensureSchema(db)
// Render's free plan has no shell, so the admin can be created from environment variables on startup.
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  try { console.log(`Admin ${process.env.ADMIN_EMAIL}: ${await ensureAdmin(db, { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, reset: process.env.ADMIN_RESET === 'true' })}`) }
  catch (e) { console.error('Admin setup skipped:', e.message) }
}
const app = createApp(db)
setInterval(() => runJobs(db).catch((e) => console.error('job error', e)), 60_000).unref()
app.listen(config.port, () => {
  console.log(`Kashere API on http://localhost:${config.port}  (${config.databaseUrl ? 'Postgres' : 'SQLite'}, payments: ${config.mockPayments ? 'MOCK' : 'Paystack'})`)
})
