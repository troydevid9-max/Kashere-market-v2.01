/* SQLite without any native build step.
   Node 22.13+ ships SQLite (node:sqlite). This wraps it so Knex's "better-sqlite3" dialect can use it,
   which means `npm install` never needs Visual Studio / Python / compilers (a common Windows problem). */
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const Client_BetterSQLite3 = require('knex/lib/dialects/better-sqlite3/index.js')

let DatabaseSync
try {
  // Quiet the "SQLite is an experimental feature" notice (it is stable enough for local development).
  const emit = process.emitWarning
  process.emitWarning = (w, ...a) => { if (String(w?.message ?? w).includes('SQLite')) return; return emit.call(process, w, ...a) }
  ;({ DatabaseSync } = await import('node:sqlite'))
  process.emitWarning = emit
} catch {
  throw new Error('This app needs Node.js 22.13 or newer for local SQLite. Install the LTS version from https://nodejs.org and try again. (Your version: ' + process.version + ')')
}

const READS = /^\s*(select|pragma|with|explain|values)\b/i
const RETURNING = /\breturning\b/i

class Statement {
  constructor(stmt, sql) { this.stmt = stmt; this.reader = READS.test(sql) || RETURNING.test(sql) }
  all(params = []) { return this.stmt.all(...params) }
  run(params = []) {
    const r = this.stmt.run(...params)
    return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) }
  }
}

/** The small slice of the better-sqlite3 API that Knex uses. */
class Database {
  constructor(filename) { this.db = new DatabaseSync(filename) }
  prepare(sql) { return new Statement(this.db.prepare(sql), sql) }
  exec(sql) { this.db.exec(sql) }
  pragma(text) { return this.db.prepare(`PRAGMA ${text}`).all() }
  close() { this.db.close() }
}

export class Client_NodeSqlite extends Client_BetterSQLite3 {
  _driver() { return Database }
}
