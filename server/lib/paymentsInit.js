import { config } from '../config.js'
import * as paystack from './paystack.js'

/** Starts a payment with the provider. In dev without a Paystack key it returns { mock: true }. */
export async function startPayment(user, { reference, amount }) {
  if (config.mockPayments) return { reference, amount, mock: true }
  const d = await paystack.initialize({ email: user.email, amountNaira: amount, reference, callbackUrl: `${config.appUrl}/payment/return?reference=${reference}` })
  return { reference, amount, mock: false, authorizationUrl: d.authorization_url }
}
