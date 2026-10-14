import { Link, useNavigate } from 'react-router-dom'
import { ShoppingCart, Minus, Plus, Trash2, ShieldCheck } from 'lucide-react'
import { ProductImage } from '../components/ui/ProductImage'
import { Button } from '../components/ui/Button'
import { useCart } from '../context/CartContext'
import { naira } from '../lib/format'
import './Checkout.css'

export function CartPage() {
  const { getCartItemsWithProducts, getCartTotal, updateQuantity, removeFromCart } = useCart()
  const navigate = useNavigate()
  const lines = getCartItemsWithProducts()

  return (
    <div className="container" style={{ maxWidth: 760, paddingTop: 20 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 14 }}>Your cart</h1>
      {lines.length === 0 ? (
        <div className="empty card"><ShoppingCart size={40} /><h3>Your cart is empty</h3><p>Items you add will show up here.</p><Link to="/browse" className="btn btn--primary">Browse items</Link></div>
      ) : (
        <>
          <section className="card card--pad">
            {lines.map(({ product, quantity }) => (
              <div className="cartline" key={product.id}>
                <Link to={`/product/${product.id}`} className="thumb"><ProductImage src={product.images[0]} category={product.category} alt="" /></Link>
                <div className="grow">
                  <Link to={`/product/${product.id}`}><b style={{ fontSize: 15 }}>{product.title}</b></Link>
                  <p style={{ fontWeight: 800, margin: '2px 0 8px' }}>{naira(product.price)}</p>
                  <div className="row" style={{ gap: 10 }}>
                    <div className="qty"><button onClick={() => updateQuantity(product.id, quantity - 1)} aria-label="Decrease"><Minus size={15} /></button><span>{quantity}</span><button onClick={() => updateQuantity(product.id, quantity + 1)} aria-label="Increase"><Plus size={15} /></button></div>
                    <button className="linkbtn" style={{ color: 'var(--danger)', display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 13.5 }} onClick={() => removeFromCart(product.id)}><Trash2 size={15} /> Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </section>
          <section className="card card--pad" style={{ marginTop: 14 }}>
            <div className="sumrow"><span>Subtotal</span><span>{naira(getCartTotal())}</span></div>
            <div className="sumrow"><span>Delivery</span><span>Calculated at checkout</span></div>
            <div className="panel-tint" style={{ margin: '12px 0' }}><ShieldCheck size={20} />Protected by escrow. Sellers are paid after you confirm receipt.</div>
            <Button size="lg" block onClick={() => navigate('/checkout')}>Checkout</Button>
          </section>
        </>
      )}
    </div>
  )
}
