import crypto from 'node:crypto'
import { config } from '../config.js'
import { AppError } from './http.js'

const call = async (path, opts = {}) => {
  const res = await fetch(`https://api.paystack.co${path}`, {
    ...opts, headers: { Authorization: `Bearer ${config.paystackSecret}`, 'Content-Type': 'application/json' }
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || json.status === false) throw new AppError(502, json.message || 'Payment provider error.', 'PROVIDER')
  return json.data
}

export const initialize = ({ email, amountNaira, reference, callbackUrl, metadata }) =>
  call('/transaction/initialize', { method: 'POST', body: JSON.stringify({ email, amount: amountNaira * 100, reference, callback_url: callbackUrl, metadata }) })

export const verify = (reference) => call(`/transaction/verify/${encodeURIComponent(reference)}`)

/** Paystack signs the raw body with HMAC-SHA512 using your secret key. */
export function validSignature(rawBody, signature) {
  if (!config.paystackSecret || !signature) return false
  const h = crypto.createHmac('sha512', config.paystackSecret).update(rawBody).digest('hex')
  const a = Buffer.from(h), b = Buffer.from(String(signature))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
