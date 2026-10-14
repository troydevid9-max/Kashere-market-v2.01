import { config } from './config.js'
import { now } from './lib/http.js'
import { releaseOrder, cancelPending } from './lib/orders.js'

/** Housekeeping: cancel abandoned checkouts and auto-release delivered orders nobody disputed. */
export async function runJobs(db) {
  const cutoff = new Date(Date.now() - config.pendingPaymentMinutes * 60000).toISOString()
  const stale = await db('orders').where({ status: 'pending_payment' }).andWhere('created_at', '<', cutoff)
  for (const o of stale) await db.transaction((trx) => cancelPending(trx, o))
  await db('payments').where({ status: 'pending', kind: 'order' }).andWhere('created_at', '<', cutoff).update({ status: 'failed' })

  const due = await db('orders').where({ status: 'delivered' }).andWhere('auto_release_at', '<=', now())
  for (const o of due) {
    try { await db.transaction((trx) => releaseOrder(trx, o, { auto: true })) } catch { /* already handled elsewhere */ }
  }
  return { cancelled: stale.length, released: due.length }
}
