import { now } from './http.js'
export const notify = (trx, userId, title, body = null, link = null) =>
  trx('notifications').insert({ user_id: userId, title, body, link, is_read: 0, created_at: now() })
