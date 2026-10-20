import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
// Must run before config.js is imported: isolate uploads and force mock payments.
process.env.UPLOAD_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'kashere-test-'))
process.env.PAYSTACK_SECRET_KEY = ''
// Set TEST_DATABASE_URL to run the whole suite against Postgres instead of SQLite.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || ''
process.env.ALLOW_SQLITE = 'true'
process.env.COMMISSION_PERCENT = '6'
process.env.AUTH_RATE_LIMIT = '100000'
