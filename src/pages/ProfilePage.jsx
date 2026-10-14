import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { BadgeCheck, LayoutDashboard, Wallet, Lock, Plus, ShieldCheck, GraduationCap, Package, Heart, Store } from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { ProductImage } from '../components/ui/ProductImage'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Async } from '../components/ui/State'
import { useUser } from '../context/UserContext'
import { useToast } from '../components/ui/Toast'
import { useApi } from '../hooks/useApi'
import { api } from '../api'
import { completePayment } from '../lib/pay'
import { ORDER_STATUS, badgeClass } from '../data/options'
import { naira, fmtDate } from '../lib/format'
import './Profile.css'
import './Checkout.css'

const TABS = [['listings', 'My Listings'], ['purchases', 'Purchases'], ['sales', 'Sales'], ['badge', 'Vendor Badge']]

function OrderRows({ role }) {
  const q = useApi(`/api/orders?role=${role}`)
  return (
    <Async q={q}>{(d) => (d.items.length ? d.items.map((o) => {
      const st = ORDER_STATUS[o.status] || { label: o.status, tone: 'gray' }
      return (
        <Link to={`/orders/${o.id}`} className="listrow" key={o.id}>
          <div className="thumb"><ProductImage src={o.items[0]?.image} category="shoes-bags" alt="" /></div>
          <div><b style={{ fontSize: 14.5 }}>{o.items[0]?.title}</b><p className="muted" style={{ fontSize: 13 }}>{o.code} · {fmtDate(o.createdAt)}</p></div>
          <div className="listrow__r"><b>{naira(o.total)}</b><span className={badgeClass(st.tone)}>{st.label}</span></div>
        </Link>
      )
    }) : <div className="empty"><h3>{role === 'buyer' ? 'No purchases yet' : 'No sales yet'}</h3>{role === 'buyer' && <Link to="/browse" className="btn btn--primary">Browse items</Link>}</div>)}</Async>
  )
}

export function ProfilePage() {
  const { currentUser, refresh } = useUser()
  const { show } = useToast()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [pay, setPay] = useState(false)
  const [busy, setBusy] = useState(false)
  const tab = TABS.some(([k]) => k === params.get('tab')) ? params.get('tab') : 'listings'
  const mine = useApi(currentUser ? '/api/me/products' : null)
  const badge = useApi(currentUser && tab === 'badge' ? '/api/vendor/badge' : null)

  if (!currentUser) return <div className="container"><div className="empty"><Lock size={40} /><h3>Log in to see your profile</h3><Link to="/login" className="btn btn--primary">Log in</Link></div></div>
  const status = currentUser.verificationStatus

  const startPay = async () => {
    setBusy(true)
    try { const r = await completePayment(await api.post('/api/vendor/badge/checkout')); if (r === 'settled') { show('Verified Vendor badge activated.'); setPay(false); await refresh(); badge.reload() } }
    catch (e) { if (e.code === 'NOT_VERIFIED') { show('Verify your student ID first.', 'error'); navigate('/verify') } else show(e.message, 'error') }
    finally { setBusy(false) }
  }

  return (
    <div className="container" style={{ maxWidth: 900 }}>
      <section className="card phead">
        <Avatar name={currentUser.name} size={72} verified={currentUser.isVendor} />
        <div>
          <h1>{currentUser.name}</h1>
          <p className="phead__id">{currentUser.matric}</p>
          <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {status === 'approved' ? <span className="badge"><GraduationCap size={14} /> Verified student</span> : <span className="badge badge--warn">{status === 'pending' ? 'Verification pending' : 'Not verified'}</span>}
            {currentUser.isVendor && <span className="badge badge--solid"><BadgeCheck size={14} /> Verified vendor</span>}
          </div>
        </div>
        <div className="pstats"><div><b>{currentUser.rating || '—'}</b><small>Rating</small></div><div><b>{currentUser.reviewCount}</b><small>Reviews</small></div><div><b>{mine.data?.items.length ?? '—'}</b><small>Listings</small></div></div>
      </section>

      {status !== 'approved' && status !== 'pending' && (
        <div className="panel-tint" style={{ marginTop: 12, alignItems: 'center' }}><ShieldCheck size={20} /><span className="grow">Verify your student ID to buy and sell with full protection.</span><Link to="/verify" className="btn btn--primary btn--sm">Verify now</Link></div>
      )}

      <div className="row" style={{ gap: 10, margin: '14px 0', flexWrap: 'wrap' }}>
        <Link to="/orders" className="btn btn--secondary btn--sm"><Package size={16} /> Orders</Link>
        <Link to="/saved" className="btn btn--secondary btn--sm"><Heart size={16} /> Saved</Link>
        <Link to="/wallet" className="btn btn--secondary btn--sm"><Wallet size={16} /> Wallet</Link>
        <Link to={`/store/${currentUser.id}`} className="btn btn--secondary btn--sm"><Store size={16} /> My store page</Link>
        {(currentUser.isVendor || currentUser.accountType === 'vendor') && <Link to="/dashboard" className="btn btn--secondary btn--sm"><LayoutDashboard size={16} /> Vendor dashboard</Link>}
        <Link to="/sell" className="btn btn--primary btn--sm"><Plus size={16} /> Add product</Link>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'is-on' : ''} onClick={() => setParams(k === 'listings' ? {} : { tab: k })}>{l}</button>)}
      </div>

      <section className="card card--pad" style={{ marginTop: 14 }}>
        {tab === 'listings' && <Async q={mine}>{(d) => (d.items.length ? d.items.map((p) => (
          <div className="listrow" key={p.id}>
            <Link to={`/product/${p.id}`} className="thumb"><ProductImage src={p.images[0]} category={p.category} alt="" /></Link>
            <div><Link to={`/product/${p.id}`}><b style={{ fontSize: 14.5 }}>{p.title}</b></Link><p className="muted" style={{ fontSize: 13 }}>{p.views} views · {p.quantity} in stock</p></div>
            <div className="listrow__r"><b>{naira(p.price)}</b><span className={p.quantity > 0 ? 'badge' : 'badge badge--gray'}>{p.quantity > 0 ? 'Active' : 'Sold out'}</span></div>
          </div>
        )) : <div className="empty"><h3>No listings yet</h3><Link to="/sell" className="btn btn--primary">Add your first product</Link></div>)}</Async>}
        {tab === 'purchases' && <OrderRows role="buyer" />}
        {tab === 'sales' && <OrderRows role="seller" />}
        {tab === 'badge' && <Async q={badge}>{(b) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="row" style={{ gap: 12 }}><BadgeCheck size={34} /><div><h3>{b.active ? 'Verified Vendor' : b.expiresAt ? 'Badge expired' : 'Become a Verified Vendor'}</h3>
              <p className="muted">{b.expiresAt ? `${b.active ? 'Valid until' : 'Expired on'} ${fmtDate(b.expiresAt)}` : 'Stand out with a trust badge, get more buyers, and unlock the vendor dashboard.'}</p></div></div>
            <div className="panel-tint"><ShieldCheck size={20} />{naira(b.regularPrice)} every 3 months.{b.launchAvailable ? ` Launch offer: ${naira(b.price)} plus 1 month free boosting (${b.launchSlotsLeft} spots left).` : ''}</div>
            <div className="row" style={{ gap: 10 }}>
              <Button onClick={() => setPay(true)}>{b.active ? 'Renew badge' : 'Get verified'} · {naira(b.price)}</Button>
              {(b.active || currentUser.accountType === 'vendor') && <Button variant="secondary" onClick={() => navigate('/dashboard')}>Open dashboard</Button>}
            </div>
            <Modal open={pay} onClose={() => setPay(false)} title="Vendor badge">
              <p className="muted" style={{ marginBottom: 14 }}>You will pay {naira(b.price)} through Paystack. Your badge runs for 3 months.</p>
              <Button block size="lg" loading={busy} onClick={startPay}>Pay {naira(b.price)}</Button>
            </Modal>
          </div>
        )}</Async>}
      </section>
    </div>
  )
}
