import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, XCircle, Clock } from 'lucide-react'
import { ThankYou } from '../components/ThankYou'
import { Button } from '../components/ui/Button'
import { useCart } from '../context/CartContext'
import { useUser } from '../context/UserContext'
import { useToast } from '../components/ui/Toast'
import { api } from '../api'

/** Paystack sends the buyer back here. We ask our server to verify the payment with Paystack (we never trust the URL alone). */
export function PaymentReturnPage() {
  const [params] = useSearchParams()
  const reference = params.get('reference') || params.get('trxref')
  const { clearCart } = useCart()
  const { refresh } = useUser()
  const { show } = useToast()
  const navigate = useNavigate()
  const [state, setState] = useState({ phase: 'checking', kind: null, orders: [] })
  const [tries, setTries] = useState(0)

  useEffect(() => {
    if (!reference) { setState({ phase: 'failed' }); return undefined }
    let live = true
    ;(async () => {
      try {
        const v = await api.post(`/api/payments/${encodeURIComponent(reference)}/verify`)
        const d = await api.get(`/api/payments/${encodeURIComponent(reference)}`)
        if (!live) return
        if (v.status === 'success') {
          await refresh()
          if (d.kind === 'topup') { show('Wallet topped up.'); navigate('/wallet', { replace: true }); return }
          if (d.kind === 'badge') { show('Verified Vendor badge activated.'); navigate('/dashboard/verification', { replace: true }); return }
          clearCart(); setState({ phase: 'success', kind: d.kind, orders: d.orders.map((o) => o.code) })
        } else setState({ phase: v.status === 'failed' ? 'failed' : 'pending' })
      } catch (e) { if (live) setState({ phase: 'error', message: e.message }) }
    })()
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, tries])

  if (state.phase === 'checking') return <div className="container"><div className="empty" role="status"><Loader2 size={32} className="spin" /><h3>Confirming your payment…</h3><p>Please don&apos;t close this page.</p></div></div>
  if (state.phase === 'success') return <ThankYou codes={state.orders} />
  return (
    <div className="container">
      <div className="empty">
        {state.phase === 'pending' ? <Clock size={36} /> : <XCircle size={36} />}
        <h3>{state.phase === 'pending' ? 'Payment not confirmed yet' : 'Payment did not go through'}</h3>
        <p>{state.message || (state.phase === 'pending' ? 'If you were charged, it can take a minute to show. Check again shortly.' : 'You were not charged. Your cart is still here, so you can try again.')}</p>
        <div className="row" style={{ gap: 10 }}>
          {state.phase === 'pending' && <Button onClick={() => { setState({ phase: 'checking' }); setTries((t) => t + 1) }}>Check again</Button>}
          <Link to="/cart" className="btn btn--secondary">Back to cart</Link>
        </div>
      </div>
    </div>
  )
}
