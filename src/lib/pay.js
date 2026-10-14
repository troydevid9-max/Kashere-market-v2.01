import { api } from '../api'

/** Takes the result of a "start payment" call. Dev/mock: settles instantly. Live: sends the user to Paystack. */
export async function completePayment(start) {
  if (start.mock) { await api.post(`/api/payments/${start.reference}/mock-pay`); return 'settled' }
  window.location.assign(start.authorizationUrl)
  return 'redirected'
}
