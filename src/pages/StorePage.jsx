import { Link, useNavigate, useParams } from 'react-router-dom'
import { BadgeCheck, MessageSquare, ShieldCheck, Store as StoreIcon, SearchX } from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { StarRating } from '../components/ui/StarRating'
import { ProductCard } from '../components/ui/ProductCard'
import { Button } from '../components/ui/Button'
import { Async } from '../components/ui/State'
import { useApi } from '../hooks/useApi'
import { useUser } from '../context/UserContext'
import { useToast } from '../components/ui/Toast'
import { api } from '../api'
import { getCategory } from '../data/categories'
import { fmtDate, timeAgo } from '../lib/format'
import './Store.css'

function Store({ data }) {
  const { store, products, reviews } = data
  const { currentUser } = useUser()
  const { show } = useToast()
  const navigate = useNavigate()
  const mine = currentUser?.id === store.id

  const message = async () => {
    if (!currentUser) { navigate('/login'); return }
    try { const r = await api.post('/api/conversations', { userId: store.id, body: `Hi ${store.name.split(' ')[0]}, I have a question about your store.` }); navigate(`/messages?c=${r.id}`) }
    catch (e) { show(e.message, 'error') }
  }

  return (
    <div className="container store">
      <section className="store__hero">
        <Avatar name={store.name} size={84} verified={store.isVendor} />
        <div className="grow">
          <h1>{store.businessName || store.name}</h1>
          <p className="muted">{store.businessName ? `by ${store.name}` : 'FUKASHERE student seller'} · member since {fmtDate(store.joinedAt)}</p>
          <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {store.vendorActive && <span className="badge badge--solid"><BadgeCheck size={14} /> Verified vendor</span>}
            {store.verified && <span className="badge"><ShieldCheck size={14} /> Verified student</span>}
            {store.storeCategory && <span className="badge badge--gray"><StoreIcon size={13} /> {getCategory(store.storeCategory).name}</span>}
          </div>
        </div>
        {!mine && <Button variant="secondary" size="sm" onClick={message}><MessageSquare size={16} /> Message</Button>}
      </section>
      <section className="store__stats">
        <div><b>{store.rating || '—'}</b><StarRating value={store.rating} size={13} /><small>{store.reviewCount} reviews</small></div>
        <div><b>{store.completedSales}</b><small>Completed sales</small></div>
        <div><b>{products.length}</b><small>Active listings</small></div>
      </section>
      <section className="sec" style={{ marginTop: 28 }}>
        <div className="sec__head"><h2>Listings</h2></div>
        {products.length ? <div className="pgrid">{products.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <div className="empty"><h3>No active listings</h3></div>}
      </section>
      {reviews.length > 0 && (
        <section className="sec">
          <div className="sec__head"><h2>Reviews</h2></div>
          <div className="card card--pad">
            {reviews.map((r) => (
              <div className="rv" key={r.id}><div className="row" style={{ gap: 10 }}><Avatar name={r.buyer.name} size={32} /><b>{r.buyer.name}</b><StarRating value={r.rating} size={13} /><span className="muted" style={{ fontSize: 12 }}>{timeAgo(r.createdAt)}</span></div>{r.comment && <p>{r.comment}</p>}</div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

export function StorePage() {
  const { id } = useParams()
  const q = useApi(`/api/stores/${encodeURIComponent(id)}`)
  if (q.error?.status === 404) return <div className="container"><div className="empty"><SearchX size={40} /><h3>Store not found</h3><Link to="/browse" className="btn btn--primary">Browse items</Link></div></div>
  return <Async q={q}>{(d) => <Store data={d} />}</Async>
}
