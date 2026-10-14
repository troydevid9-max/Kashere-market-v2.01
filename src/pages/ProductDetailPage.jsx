import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, ChevronLeft, ChevronRight, ShieldCheck, Truck, Store, MessageSquare, ShoppingCart, Minus, Plus, SearchX, Heart } from 'lucide-react'
import { ProductImage } from '../components/ui/ProductImage'
import { ProductCard } from '../components/ui/ProductCard'
import { Avatar } from '../components/ui/Avatar'
import { StarRating } from '../components/ui/StarRating'
import { Button } from '../components/ui/Button'
import { Async } from '../components/ui/State'
import { useCart } from '../context/CartContext'
import { useUser } from '../context/UserContext'
import { useLive } from '../context/LiveContext'
import { useToast } from '../components/ui/Toast'
import { useApi } from '../hooks/useApi'
import { api } from '../api'
import { conditionOptions } from '../data/options'
import { getCategory } from '../data/categories'
import { naira, timeAgo } from '../lib/format'
import './Browse.css'

function Detail({ data }) {
  const { product, reviews, similar } = data
  const { addToCart } = useCart()
  const { currentUser } = useUser()
  const { favorites, toggleFavorite } = useLive()
  const { show } = useToast()
  const navigate = useNavigate()
  const [img, setImg] = useState(0)
  const [qty, setQty] = useState(1)
  const [busy, setBusy] = useState(false)

  const seller = product.seller
  const cat = getCategory(product.category)
  const cond = conditionOptions.find((c) => c.value === product.condition)?.label
  const mine = currentUser?.id === seller.id
  const soldOut = product.quantity < 1
  const max = Math.max(1, Math.min(20, product.quantity))
  const count = Math.max(product.images.length, 1)
  const go = (d) => setImg((i) => (i + d + count) % count)
  const fav = favorites.has(product.id)

  const needLogin = () => { if (!currentUser) { show('Log in to continue.', 'error'); navigate('/login'); return true } return false }
  const add = () => { if (needLogin()) return; addToCart(product, qty); show('Added to cart.') }
  const buy = () => { if (needLogin()) return; addToCart(product, qty); navigate('/checkout') }
  const message = async () => {
    if (needLogin()) return
    setBusy(true)
    try { const r = await api.post('/api/conversations', { userId: seller.id, productId: product.id, body: `Hi, is "${product.title}" still available?` }); navigate(`/messages?c=${r.id}`) }
    catch (e) { show(e.message, 'error') } finally { setBusy(false) }
  }
  const heart = async () => { if (needLogin()) return; try { await toggleFavorite(product.id) } catch (e) { show(e.message, 'error') } }

  return (
    <div className="container">
      <nav className="crumbs" aria-label="Breadcrumb"><Link to="/">Home</Link><ChevronRight size={14} /><Link to={`/browse?category=${cat.id}`}>{cat.name}</Link><ChevronRight size={14} /><span>{product.title}</span></nav>
      <div className="pd">
        <div>
          <div className="gal__main">
            <ProductImage src={product.images[img]} category={product.category} alt={product.title} />
            {count > 1 && <>
              <button className="gal__nav" style={{ left: 10 }} onClick={() => go(-1)} aria-label="Previous photo"><ChevronLeft size={20} /></button>
              <button className="gal__nav" style={{ right: 10 }} onClick={() => go(1)} aria-label="Next photo"><ChevronRight size={20} /></button>
            </>}
          </div>
          {count > 1 && (
            <div className="gal__thumbs">{product.images.map((src, i) => (
              <button key={src} className={i === img ? 'is-on' : ''} onClick={() => setImg(i)} aria-label={`Photo ${i + 1}`}><ProductImage src={src} category={product.category} alt="" /></button>
            ))}</div>
          )}
        </div>
        <div>
          <div className="pd__tags"><span className="badge"><ShieldCheck size={14} /> Escrow protected</span>{cond && <span className="badge badge--gray">{cond}</span>}{soldOut && <span className="badge badge--danger">Sold out</span>}</div>
          <h1 style={{ marginTop: 12 }}>{product.title}</h1>
          <div className="pd__price">{naira(product.price)}</div>
          <Link to={`/store/${seller.id}`} className="seller">
            <Avatar name={seller.name} size={38} verified={seller.isVendor} />
            <div className="grow"><b>{seller.name}{seller.isVendor && <span className="badge"><BadgeCheck size={13} /> Verified vendor</span>}</b>
              <span className="row muted" style={{ fontSize: 13, gap: 6 }}><StarRating value={seller.rating} size={13} /> {seller.rating || 'New'} {seller.reviewCount ? `(${seller.reviewCount} reviews)` : ''}</span></div>
            <ChevronRight size={18} color="var(--muted)" />
          </Link>
          {mine ? (
            <div className="panel-tint"><ShieldCheck size={20} />This is your listing. Manage it from your dashboard.</div>
          ) : (
            <div className="pd__buy">
              {!soldOut && (
                <div className="row" style={{ gap: 12 }}>
                  <span className="muted" style={{ fontWeight: 600 }}>Quantity</span>
                  <div className="qty"><button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease"><Minus size={16} /></button><span aria-live="polite">{qty}</span><button onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label="Increase"><Plus size={16} /></button></div>
                  {product.quantity <= 5 && <span className="muted" style={{ fontSize: 13 }}>{product.quantity} left</span>}
                </div>
              )}
              <div className="row">
                <Button className="grow" onClick={buy} disabled={soldOut}>{soldOut ? 'Sold out' : `Buy now · ${naira(product.price * qty)}`}</Button>
                <Button variant="secondary" className="btn--icon" onClick={add} disabled={soldOut} aria-label="Add to cart"><ShoppingCart size={17} /></Button>
                <Button variant="secondary" className="btn--icon" onClick={heart} aria-pressed={fav} aria-label={fav ? 'Remove from saved' : 'Save item'}><Heart size={17} fill={fav ? 'var(--danger)' : 'none'} color={fav ? 'var(--danger)' : 'currentColor'} /></Button>
              </div>
              <Button variant="secondary" size="sm" style={{ alignSelf: 'flex-start', padding: '0 16px' }} onClick={message} loading={busy}><MessageSquare size={16} /> Message seller</Button>
            </div>
          )}
          <p className="pd__desc">{product.description}</p>
          <div className="pd__facts">
            <div><ShieldCheck size={18} /> Your payment is held until you confirm the item arrived.</div>
            <div>{product.delivery === 'pickup' ? <Store size={18} /> : <Truck size={18} />} {product.delivery === 'pickup' ? 'Pickup on campus' : product.delivery === 'both' ? 'Campus delivery or pickup' : 'Campus delivery'}{product.deliveryLocation ? ` · ${product.deliveryLocation}` : ''}</div>
          </div>
        </div>
      </div>
      {reviews.length > 0 && (
        <section className="sec" style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 21, marginBottom: 6 }}>Reviews</h2>
          {reviews.map((r) => (
            <div className="rv" key={r.id}><div className="row" style={{ gap: 10 }}><Avatar name={r.buyer.name} size={34} /><b>{r.buyer.name}</b><StarRating value={r.rating} size={13} /><span className="muted" style={{ fontSize: 12 }}>{timeAgo(r.createdAt)}</span></div>{r.comment && <p>{r.comment}</p>}</div>
          ))}
        </section>
      )}
      {similar.length > 0 && (
        <section className="sec" style={{ marginTop: 36 }}>
          <h2 style={{ fontSize: 21, marginBottom: 14 }}>Similar items</h2>
          <div className="pgrid">{similar.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </div>
  )
}

export function ProductDetailPage() {
  const { id } = useParams()
  const q = useApi(`/api/products/${encodeURIComponent(id)}`)
  if (q.error?.status === 404) {
    return <div className="container"><div className="empty"><SearchX size={40} /><h3>We couldn&apos;t find that item</h3><p>It may have been sold or removed.</p><Link to="/browse" className="btn btn--primary">Browse items</Link></div></div>
  }
  return <Async q={q}>{(d) => <Detail key={d.product.id} data={d} />}</Async>
}
