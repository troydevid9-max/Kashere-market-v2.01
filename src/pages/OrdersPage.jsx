import { Link, useSearchParams } from 'react-router-dom'
import { Package, Lock } from 'lucide-react'
import { ProductImage } from '../components/ui/ProductImage'
import { Async } from '../components/ui/State'
import { useApi } from '../hooks/useApi'
import { useUser } from '../context/UserContext'
import { ORDER_STATUS, badgeClass } from '../data/options'
import { naira, fmtDate } from '../lib/format'
import './Checkout.css'
import './Orders.css'

export function OrdersPage() {
  const { currentUser } = useUser()
  const [params, setParams] = useSearchParams()
  const role = params.get('role') === 'seller' ? 'seller' : 'buyer'
  const q = useApi(currentUser ? `/api/orders?role=${role}` : null, { interval: 20000 })

  if (!currentUser) return <div className="container"><div className="empty"><Lock size={36} /><h3>Log in to see your orders</h3><Link to="/login" className="btn btn--primary">Log in</Link></div></div>

  return (
    <div className="container ord" style={{ maxWidth: 820 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800 }}>Orders</h1>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={role === 'buyer'} className={role === 'buyer' ? 'is-on' : ''} onClick={() => setParams({})}>My purchases</button>
        <button role="tab" aria-selected={role === 'seller'} className={role === 'seller' ? 'is-on' : ''} onClick={() => setParams({ role: 'seller' })}>My sales</button>
      </div>
      <Async q={q}>{(d) => (d.items.length ? d.items.map((o) => {
        const st = ORDER_STATUS[o.status] || { label: o.status, tone: 'gray' }
        const first = o.items[0]
        return (
          <Link key={o.id} to={`/orders/${o.id}`} className="ord__row">
            <div className="thumb"><ProductImage src={first?.image} category="shoes-bags" alt="" /></div>
            <div className="grow">
              <b>{first?.title}{o.items.length > 1 ? ` +${o.items.length - 1} more` : ''}</b>
              <small>{o.code} · {role === 'seller' ? 'Buyer' : 'Seller'}: {o.counterpart} · {fmtDate(o.createdAt)}</small>
            </div>
            <div className="ord__end"><strong>{naira(o.total)}</strong><span className={badgeClass(st.tone)}>{st.label}</span></div>
          </Link>
        )
      }) : <div className="empty"><Package size={36} /><h3>{role === 'seller' ? 'No sales yet' : 'No purchases yet'}</h3>{role === 'buyer' && <Link to="/browse" className="btn btn--primary">Browse items</Link>}</div>)}</Async>
    </div>
  )
}
