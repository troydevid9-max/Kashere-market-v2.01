import { config } from '../config.js'
import { AppError, now, addDays } from './http.js'
import * as ledger from './ledger.js'
import { notify } from './notify.js'

/**
 * Marks a payment successful and applies its effect. Idempotent: the conditional UPDATE means
 * a webhook and a manual verify arriving together can only settle once.
 */
export async function settlePayment(db, reference, paidAmountNaira) {
  return db.transaction(async (trx) => {
    const pay = await trx('payments').where({ reference }).first()
    if (!pay) throw new AppError(404, 'Payment not found.', 'NOT_FOUND')
    if (pay.status === 'success') return { alreadySettled: true, payment: pay }
    if (paidAmountNaira != null && paidAmountNaira < pay.amount) throw new AppError(400, 'Paid amount is less than expected.', 'AMOUNT')
    const n = await trx('payments').where({ id: pay.id, status: 'pending' }).update({ status: 'success', paid_at: now() })
    if (!n) return { alreadySettled: true, payment: pay }
    const meta = pay.meta ? JSON.parse(pay.meta) : {}

    if (pay.kind === 'order') {
      const orders = await trx('orders').where({ group_ref: meta.groupRef, status: 'pending_payment' })
      for (const o of orders) {
        await trx('orders').where({ id: o.id }).update({ status: 'paid', paid_at: now(), updated_at: now() })
        await notify(trx, o.seller_id, 'New paid order', `${o.code}: ₦${o.total.toLocaleString('en-NG')} is held in escrow. Deliver the item.`, `/orders/${o.id}`)
        await notify(trx, o.buyer_id, 'Payment received', `${o.code}: your money is held safely in escrow until you confirm delivery.`, `/orders/${o.id}`)
      }
    } else if (pay.kind === 'topup') {
      await ledger.post(trx, { userId: pay.user_id, type: 'topup', amount: pay.amount, refType: 'payment', refId: pay.id, description: 'Wallet top-up' })
      await notify(trx, pay.user_id, 'Wallet topped up', `₦${pay.amount.toLocaleString('en-NG')} was added to your wallet.`, '/wallet')
    } else if (pay.kind === 'badge') {
      const u = await trx('users').where({ id: pay.user_id }).first()
      const base = u.vendor_expires_at && u.vendor_expires_at > now() ? u.vendor_expires_at : now()
      const patch = { account_type: 'vendor', vendor_expires_at: addDays(base, config.badgeDays) }
      if (meta.launch) { patch.launch_offer_used = 1; patch.boost_until = addDays(now(), config.boostDays) }
      await trx('users').where({ id: u.id }).update(patch)
      await notify(trx, u.id, 'Verified Vendor badge active', `Your badge is valid until ${patch.vendor_expires_at.slice(0, 10)}.${meta.launch ? ' Free boosting is on for 30 days.' : ''}`, '/dashboard/verification')
    }
    return { alreadySettled: false, payment: { ...pay, status: 'success' } }
  })
}

export async function failPayment(db, reference) {
  await db('payments').where({ reference, status: 'pending' }).update({ status: 'failed' })
}
