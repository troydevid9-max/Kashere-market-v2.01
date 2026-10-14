import { z } from 'zod'

export class AppError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code }
}
export const asyncH = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)
export const now = () => new Date().toISOString()
export const addDays = (iso, d) => new Date(new Date(iso).getTime() + d * 86400000).toISOString()

/** validate(schema, 'body' | 'query') -> parsed data on req.valid */
export const validate = (schema, where = 'body') => (req, _res, next) => {
  const r = schema.safeParse(req[where])
  if (!r.success) {
    const first = r.error.issues[0]
    return next(new AppError(400, `${first.path.join('.') || 'input'}: ${first.message}`, 'VALIDATION'))
  }
  req.valid = r.data
  next()
}

export { z }
