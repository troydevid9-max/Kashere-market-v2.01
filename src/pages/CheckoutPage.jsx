import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Lock, ShieldCheck, Minus, Plus, CreditCard, Building2, Smartphone, PackageCheck, FlaskConical } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { ProductImage } from '../components/ui/ProductImage'
import { useCart } from '../context/CartContext'
import { useUser } from '../context/UserContext'
import { useToast } from '../components/ui/Toast'
import { ThankYou } from '../components/ThankYou'
import { useApi } from '../hooks/useApi'
import { api } from '../api'
import { deliveryLocations } from '../data/options'
import { naira } from '../lib/format'
import './Checkout.css'

const DELIVERY_FEE = 1000

function CartPanel({ lines, subtotal, fee, total, editable, updateQuantity }) {
  return (
    <aside className="co__cart" aria-label="Your cart">
      <h2 className="cap">Your cart</h2>
      {lines.map(({ product, quantity }) => (
        <div className="co__item" key={product.id}>
          <div className="thumb"><ProductImage src={product.images[0]} category={product.category} alt="" /></div>
          <div className="grow">
            <b className="cap" style={{ fontSize: 12 }}>{product.title}</b>
            <small>{naira(product.price)}</small>
            {editable ? (
              <div className="qty"><button type="button" onClick={() => updateQuantity(product.id, quantity - 1)} aria-label="Decrease"><Minus size={14} /></button><span>{quantity}</span><button type="button" onClick={() => updateQuantity(product.id, quantity + 1)} aria-label="Increase"><Plus size={14} /></button></div>
            ) : <small>Qty: {quantity}</small>}
          </div>
        </div>
      ))}
      <div style={{ marginTop: 10 }}>
        <div className="sumrow"><span className="cap">Subtotal</span><span>{naira(subtotal)}</span></div>
        <div className="sumrow"><span className="cap">Delivery cost</span><span>{fee ? naira(fee) : 'Free'}</span></div>
        <div className="sumrow sumrow--total"><span>Total</span><b>{naira(total)}</b></div>
      </div>
    </aside>
  )
}

export function CheckoutPage() {
  const { getCartItemsWithProducts, getCartTotal, updateQuantity, clearCart } = useCart()
  const { currentUser } = useUser()
  const { show } = useToast()
  const navigate = useNavigate()
  const [step, setStep] = useState('shipping')
  const [mode, setMode] = useState('delivery')
  const [f, setF] = useState({ name: currentUser?.name || '', phone: currentUser?.phone || '', place: '', detail: '', note: '' })
  const [errors, setErrors] = useState({})
  const health = useApi('/api/health')
  const [paying, setPaying] = useState(false)
  const [done, setDone] = useState(null)
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })) }

  const live = getCartItemsWithProducts().map((i) => ({ product: i.product, quantity: i.quantity }))
  const lines = done ? done.lines : live
  const fee = mode === 'delivery' ? DELIVERY_FEE : 0
  const subtotal = done ? done.subtotal : getCartTotal()
  const total = subtotal + fee

  if (!currentUser) {
    return <div className="container co"><div className="empty"><Lock size={36} /><h3>Log in to check out</h3><Link to="/login" className="btn btn--primary">Log in</Link></div></div>
  }
  if (live.length === 0 && !done) {
    return <div className="container co"><div className="empty"><PackageCheck size={36} /><h3>Your cart is empty</h3><Link to="/browse" className="btn btn--primary">Browse items</Link></div></div>
  }

  const toPayment = () => {
    const e = {}
    if (f.name.trim().length < 3) e.name = 'Enter your full name.'
    if (!/^0[789][01]\d{8}$/.test(f.phone.trim())) e.phone = 'Enter an 11-digit Nigerian number.'
    if (mode === 'delivery' && !f.place) e.place = 'Choose where to deliver.'
    setErrors(e)
    if (Object.keys(e).length) return
    setStep('payment'); window.scrollTo({ top: 0 })
  }

  const pay = async () => {
    setPaying(true)
    try {
      const r = await api.post('/api/checkout', {
        items: live.map((l) => ({ productId: l.product.id, qty: l.quantity })), delivery: mode,
        name: f.name.trim(), phone: f.phone.trim(), place: f.place || undefined, detail: f.detail.trim() || undefined, note: f.note.trim() || undefined
      })
      if (r.mock) {
        // Development only (no Paystack key): settle instantly so the whole flow can be tested.
        await api.post(`/api/payments/${r.reference}/mock-pay`)
        setDone({ codes: r.orders, lines: live, subtotal: getCartTotal() })
        clearCart(); setStep('done'); window.scrollTo({ top: 0 })
        show('Payment received. Held safely in escrow.')
      } else {
        window.location.assign(r.authorizationUrl) // Paystack's secure page; they send the buyer back to /payment/return
      }
    } catch (e) {
      if (e.code === 'NOT_VERIFIED') { show('Verify your student ID before you can buy.', 'error'); navigate('/verify') }
      else if (['STOCK', 'GONE', 'OWN_ITEM', 'DELIVERY'].includes(e.code)) { show(e.message, 'error'); setStep('shipping') }
      else show(e.message, 'error')
    } finally { setPaying(false) }
  }

  if (step === 'done' && done) return <ThankYou codes={done.codes} lines={done.lines} />

  return (
    <div className="container co">
      <Link to="/cart" className="co__back cap"><ArrowLeft size={14} /> Back to cart</Link>
      <h1 className="co__title">Checkout</h1>
      <p className="co__crumbs cap"><Link to="/cart">Cart</Link> / <span className={step === 'shipping' ? 'is-on' : ''}>Delivery</span> / <span className={step === 'payment' ? 'is-on' : ''}>Payment</span></p>

      <div className="co__grid">
        <div className="co__form">
          {step === 'shipping' && (
            <>
              <section className="co__sec">
                <div className="cap">Email</div>
                <Field value={currentUser.email || ''} readOnly aria-label="Email" />
              </section>
              <section className="co__sec">
                <div className="cap">Choose a delivery method</div>
                <div className="co__radios" role="radiogroup" aria-label="Delivery method">
                  {[['delivery', 'Campus delivery'], ['pickup', 'Pickup']].map(([id, l]) => (
                    <button key={id} type="button" role="radio" aria-checked={mode === id} className={`co__radio cap ${mode === id ? 'is-on' : ''}`} onClick={() => setMode(id)}><span className="dot" />{l}</button>
                  ))}
                </div>
                <p className="co__info">{mode === 'delivery' ? `Flat ${naira(DELIVERY_FEE)} campus delivery fee per seller. Most orders arrive within 24 hours.` : 'Pickup is free. You and the seller agree a safe spot on campus.'}</p>
              </section>
              <section className="co__sec">
                <div className="cap">{mode === 'delivery' ? 'Delivery details' : 'Contact details'}</div>
                <Field label="Full name" value={f.name} onChange={set('name')} error={errors.name} autoComplete="name" />
                <Field label="Phone number" value={f.phone} onChange={set('phone')} error={errors.phone} inputMode="tel" autoComplete="tel" placeholder="08012345678" />
                {mode === 'delivery' && (
                  <>
                    <Field as="select" label="Campus location" value={f.place} onChange={set('place')} error={errors.place}>
                      <option value="" disabled>Select location</option>
                      {deliveryLocations.map((l) => <option key={l}>{l}</option>)}
                    </Field>
                    <Field label="Room or landmark" optional value={f.detail} onChange={set('detail')} placeholder="e.g. Block C, Room 12" />
                  </>
                )}
                <Field label="Note to seller" optional value={f.note} onChange={set('note')} maxLength={100} placeholder="E.g. Call me when you arrive…" hint={`${f.note.length}/100`} />
              </section>
              <div className="co__nav"><Link to="/cart" className="btn btn--secondary"><ArrowLeft size={16} /> Go back</Link><Button onClick={toPayment}>Continue <ArrowRight size={16} /></Button></div>
            </>
          )}

          {step === 'payment' && (
            <>
              <section className="co__sec">
                <div className="paybig"><div><small>Amount to pay</small><strong>{naira(total)}</strong></div><span className="secure-pill"><Lock size={14} /> Secure payment</span></div>
              </section>
              <section className="co__sec">
                <div className="cap">Pay with Paystack</div>
                <p className="co__info">You&apos;ll pay on Paystack&apos;s secure page using a <b>card</b>, <b>bank transfer</b> or <b>USSD</b>. Kashere never sees or stores your card details.</p>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <span className="badge badge--gray"><CreditCard size={13} /> Card</span><span className="badge badge--gray"><Building2 size={13} /> Bank transfer</span><span className="badge badge--gray"><Smartphone size={13} /> USSD</span>
                </div>
                {health.data?.mockPayments && <div className="panel-tint"><FlaskConical size={18} />Demo mode: no real money moves. Pressing Pay completes the payment instantly so you can test the escrow flow.</div>}
                <div className="row" style={{ justifyContent: 'space-between', fontSize: 13, color: 'var(--muted)' }}>
                  <span className="row" style={{ gap: 6 }}><Lock size={14} /> Secured by Paystack</span>
                  <span className="brands"><span className="visa">VISA</span><span className="mc"><i /><i /></span><span className="verve">Verve</span></span>
                </div>
              </section>
              <section className="esc">
                <h4>How escrow works</h4>
                <ol><li><span>1</span>You pay now through Paystack, securely.</li><li><span>2</span>Your money is held in escrow until you confirm the item arrived.</li><li><span>3</span>After your confirmation, the seller gets paid.</li></ol>
              </section>
              <div className="co__nav"><Button variant="secondary" onClick={() => setStep('shipping')}><ArrowLeft size={16} /> Go back</Button><Button loading={paying} onClick={pay}>Pay {naira(total)} <ArrowRight size={16} /></Button></div>
            </>
          )}
        </div>
        <div>
          <CartPanel lines={lines} subtotal={subtotal} fee={fee} total={total} editable={step === 'shipping'} updateQuantity={updateQuantity} />
          <p className="co__escrow" style={{ marginTop: 12 }}><ShieldCheck size={18} />Protected by escrow. The seller is paid only after you confirm.</p>
        </div>
      </div>
    </div>
  )
}
