import { config } from './config.js'
import { createDb } from './db.js'
import { ensureSchema } from './schema.js'
import { createApp } from './app.js'
import { runJobs } from './jobs.js'

const db = createDb()
await ensureSchema(db)
const app = createApp(db)
setInterval(() => runJobs(db).catch((e) => console.error('job error', e)), 60_000).unref()
app.listen(config.port, () => {
  console.log(`Kashere API on http://localhost:${config.port}  (${config.databaseUrl ? 'Postgres' : 'SQLite'}, payments: ${config.mockPayments ? 'MOCK' : 'Paystack'})`)
})
