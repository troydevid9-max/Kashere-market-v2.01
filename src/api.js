/** Tiny fetch wrapper. Same-origin (Vite proxies /api in dev), cookie auth, JSON errors become ApiError. */
export class ApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code }
}

async function request(method, path, { body, form } = {}) {
  const headers = { 'X-Requested-With': 'kashere' }
  let payload
  if (form) payload = form
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body) }
  let res
  try { res = await fetch(path, { method, headers, body: payload, credentials: 'same-origin' }) }
  catch { throw new ApiError('You appear to be offline. Check your connection and try again.', 0, 'OFFLINE') }
  const isJson = (res.headers.get('content-type') || '').includes('json')
  const data = isJson ? await res.json() : null
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.code)
  return data
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, body) => request('POST', p, { body }),
  put: (p, body) => request('PUT', p, { body }),
  patch: (p, body) => request('PATCH', p, { body }),
  del: (p) => request('DELETE', p),
  upload: (p, form) => request('POST', p, { form })
}

export const qs = (obj) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== null && v !== '') p.set(k, v)
  const s = p.toString()
  return s ? `?${s}` : ''
}
