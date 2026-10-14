import { useNavigate } from 'react-router-dom'
import { Button } from './ui/Button'
import { ProductImage } from './ui/ProductImage'
import '../pages/Checkout.css'

/** "Your purchase was successful" page (editorial layout). `lines` is optional (not known after a Paystack redirect). */
export function ThankYou({ codes = [], lines = [] }) {
  const navigate = useNavigate()
  const count = lines.reduce((s, l) => s + l.quantity, 0)
  return (
    <div className="container ty">
      <h1>Your purchase was successful</h1>
      <div className="ty__band">
        <p>Your items are being prepared for delivery. Your payment is held in escrow until you confirm they arrived.</p>
        {lines.length > 0 && (
          <>
            <b className="cap">{count} {count === 1 ? 'item' : 'items'}</b>
            <div className="ty__imgs">{lines.map(({ product }) => <div className="thumb" key={product.id}><ProductImage src={product.images[0]} category={product.category} alt={product.title} /></div>)}</div>
          </>
        )}
      </div>
      <div className="ty__after">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>{codes.map((c) => <span key={c} className="ty__code">ORDER {c}</span>)}</div>
        <p>Thank you! Every confirmation you make keeps Kashere safe for the whole campus.</p>
        <div className="row">
          <Button size="lg" onClick={() => navigate('/orders')}>View my orders</Button>
          <Button size="lg" variant="secondary" onClick={() => navigate('/')}>Go to the main page</Button>
        </div>
      </div>
    </div>
  )
}
