import './setup.js'
import http from 'node:http'
import crypto from 'node:crypto'
import { config } from '../config.js'
import { createDb } from '../db.js'
import { ensureSchema } from '../schema.js'
import { createApp } from '../app.js'
import { seed } from '../seed.js'

// 1x1 transparent PNG (valid image signature)
export const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64')

export async function startServer({ withSeed = true } = {}) {
  let db
  if (config.databaseUrl) {
    // Postgres: give every test server its own schema so servers never share data.
    const schema = 't_' + crypto.randomBytes(5).toString('hex')
    const admin = createDb(); await admin.raw(`create schema ${schema}`); await admin.destroy()
    db = createDb({ schema })
  } else db = createDb({ file: ':memory:' })
  await ensureSchema(db)
  if (withSeed) await seed(db, { quiet: true })
  const server = http.createServer(createApp(db))
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const base = `http://127.0.0.1:${server.address().port}`
  return { db, base, close: async () => { await new Promise((r) => server.close(r)); await db.destroy() } }
}

/** Tiny HTTP client with a cookie jar, so each instance behaves like one signed-in browser. */
export function client(base) {
  let cookie = ''
  const call = async (method, path, body, { form, headers = {} } = {}) => {
    const h = { 'x-requested-with': 'kashere', ...headers }
    if (cookie) h.cookie = cookie
    let payload
    if (form) payload = form
    else if (body !== undefined) { h['content-type'] = 'application/json'; payload = JSON.stringify(body) }
    const res = await fetch(base + path, { method, headers: h, body: payload })
    const set = res.headers.getSetCookie?.() || []
    for (const c of set) { const [kv] = c.split(';'); const [k, v] = kv.split('='); cookie = v ? `${k}=${v}` : ''; if (!v) cookie = '' }
    const ct = res.headers.get('content-type') || ''
    const data = ct.includes('json') ? await res.json() : null
    return { status: res.status, data, res }
  }
  return { get: (p) => call('GET', p), post: (p, b) => call('POST', p, b), patch: (p, b) => call('PATCH', p, b), del: (p) => call('DELETE', p), upload: (p, form) => call('POST', p, undefined, { form }), call }
}
export const image = () => new Blob([PNG], { type: 'image/png' })
export const login = async (c, id, pw = 'password123') => { const r = await c.post('/api/auth/login', { identifier: id, password: pw }); if (r.status !== 200) throw new Error('login failed ' + JSON.stringify(r.data)); return r.data.user }
