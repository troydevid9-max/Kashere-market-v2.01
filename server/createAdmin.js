/* Create or reset an admin from your own computer:
   ADMIN_EMAIL=you@x.com ADMIN_PASSWORD='long-password' npm run create-admin
   (Windows PowerShell:  $env:ADMIN_EMAIL="you@x.com"; $env:ADMIN_PASSWORD="long-password"; npm run create-admin)
   Add ADMIN_RESET=true to replace the password of an existing admin. */
import { createDb } from './db.js'
import { ensureSchema } from './schema.js'
import { ensureAdmin } from './lib/adminSetup.js'

const db = createDb(); await ensureSchema(db)
try {
  const what = await ensureAdmin(db, { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, reset: process.env.ADMIN_RESET === 'true' })
  console.log(`Admin ${process.env.ADMIN_EMAIL}: ${what}`)
} catch (e) { console.error(e.message); process.exitCode = 1 } finally { await db.destroy() }
