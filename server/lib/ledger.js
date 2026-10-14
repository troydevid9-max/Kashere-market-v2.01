import { AppError, now } from './http.js'

/**
 * The ONLY way wallet balances change. Every call writes one ledger row.
 * userId = null posts to the platform account (commission revenue).
 * Debits are conditional (balance must cover them) so a balance can never go negative.
 */
export async function post(trx, { userId = null, type, amount, refType = null, refId = null, description = null }) {
  let balanceAfter = null
  if (userId) {
    const q = trx('users').where({ id: userId })
    if (amount < 0) q.andWhere('wallet_balance', '>=', -amount)
    const n = await q.increment('wallet_balance', amount)
    if (!n) throw new AppError(400, 'Insufficient wallet balance.', 'INSUFFICIENT')
    balanceAfter = (await trx('users').where({ id: userId }).first('wallet_balance')).wallet_balance
  }
  await trx('ledger').insert({ user_id: userId, type, amount, balance_after: balanceAfter, ref_type: refType, ref_id: refId, description, created_at: now() })
  return balanceAfter
}
