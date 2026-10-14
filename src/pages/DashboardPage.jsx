import { useState } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingCart, MessageSquare, Star, ShieldCheck, Wallet, Headphones, ShoppingBag, Boxes, Users, ArrowUp, Plus, Megaphone, Check, Lightbulb, BadgeCheck, Lock, Trash2 } from 'lucide-react'
import { DashShell } from '../components/DashShell'
import { ProductImage } from '../components/ui/ProductImage'
import { Avatar } from '../components/ui/Avatar'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'

import { useUser } from '../context/UserContext'
import { useToast } from '../components/ui/Toast'
import { Async } from '../components/ui/State'
import { useApi } from '../hooks/useApi'
import { api } from '../api'
import { completePayment } from '../lib/pay'
import { ORDER_STATUS } from '../data/options'
import { naira, fmtDate } from '../lib/format'
import './Dashboard.css'

const NAV = [
  { to: '/dashboard', end: true, label: 'Dashboard', icon: LayoutDashboard },
  { to: '/dashboard/products', label: 'My Products', icon: Package },
  { to: '/dashboard/orders', label: 'Orders', icon: ShoppingCart },
  { to: '/messages', label: 'Messages', icon: MessageSquare },
  { to: '/reviews', label: 'Reviews', icon: Star },
  { to: '/dashboard/verification', label: 'Vendor Verification', icon: ShieldCheck },
  { to: '/wallet', label: 'Earnings', icon: Wallet },
  { to: '/reviews?tab=complaints', label: 'Support', icon: Headphones }
]

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening' }
const vendorActive = (u) => !!u?.isVendor

export function DashboardLayout() {
  const { currentUser, loading } = useUser()
  if (loading) return null
  if (!currentUser || (!currentUser.isVendor && currentUser.accountType !== 'vendor')) {
    return (
      <div className="auth"><div className="auth__col" style={{ justifyContent: 'center', textAlign: 'center', alignItems: 'center', gap: 14 }}>
        <Lock size={40} />
        <h1 style={{ fontSize: 26 }}>{currentUser ? 'Vendor dashboard' : 'Log in to continue'}</h1>
        <p className="muted">{currentUser ? 'The dashboard is for vendors. Get your Verified Vendor badge to start selling with a storefront.' : 'Log in with your vendor account to open the dashboard.'}</p>
        {currentUser ? <Link to="/profile?tab=badge" className="btn btn--primary">Become a vendor</Link> : <Link to="/login" className="btn btn--primary">Log in</Link>}
        <Link to="/" className="linkbtn">Back to marketplace</Link>
      </div></div>
    )
  }
  return <DashShell nav={NAV}><Outlet /></DashShell>
}

function SalesChart({ series }) {
  const W = 420, H = 250, L = 40, B = 28, T = 10, R = 12
  const top = Math.max(10000, ...series.map((p) => p.value))
  const max = Math.ceil(top / 10000) * 10000
  const ticks = Array.from({ length: 6 }, (_, i) => Math.round((max / 5) * i))
  const x = (i) => L + (i * (W - L - R)) / (series.length - 1)
  const y = (v) => T + (1 - v / max) * (H - T - B)
  const pts = series.map((p, i) => `${x(i)},${y(p.value)}`)
  const label = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const sum = series.reduce((s, p) => s + p.value, 0)
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Sales over the last 7 days, total ${naira(sum)}`}>
      <defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#111" stopOpacity=".14" /><stop offset="1" stopColor="#111" stopOpacity="0" /></linearGradient></defs>
      {ticks.map((v) => (<g key={v}><line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e8e8e8" /><text x={L - 8} y={y(v) + 4} textAnchor="end">{v === 0 ? '0' : `${v / 1000}k`}</text></g>))}
      <polygon points={`${L},${y(0)} ${pts.join(' ')} ${x(series.length - 1)},${y(0)}`} fill="url(#sg)" />
      <polyline points={pts.join(' ')} fill="none" stroke="#111" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {series.map((p, i) => <g key={p.date}><circle cx={x(i)} cy={y(p.value)} r="3.5" fill="#fbfbfb" stroke="#111" strokeWidth="2" /><text x={x(i)} y={H - 8} textAnchor="middle">{label(p.date)}</text></g>)}
    </svg>
  )
}

const pctText = (v) => (v == null ? null : `${Math.abs(v)}%`)

function Home({ stats, products }) {
  const { currentUser } = useUser()
  const navigate = useNavigate()
  const active = vendorActive(currentUser)
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
  const cards = [
    { l: 'Sales (7 days)', v: naira(stats.totalSales), d: pctText(stats.salesChange), up: stats.salesChange >= 0, s: 'vs previous 7 days', c: '#111111', I: ShoppingBag },
    { l: 'Orders (7 days)', v: String(stats.totalOrders), d: pctText(stats.ordersChange), up: stats.ordersChange >= 0, s: 'vs previous 7 days', c: '#3a3a3a', I: Boxes },
    { l: 'Active Products', v: String(stats.activeProducts), d: stats.newProductsThisWeek ? String(stats.newProductsThisWeek) : null, up: true, s: 'new this week', c: '#5a5a5a', I: Users },
    { l: 'Available Balance', v: naira(stats.availableBalance), s: `Pending: ${naira(stats.pendingBalance)}`, c: '#8a8a8a', I: Wallet }
  ]
  return (
    <div className="dcol">
      <div className="dhead">
        <div><h1>{greeting()}, {currentUser.name.split(' ')[0]} 👋</h1><p>Here&apos;s what&apos;s happening with your store today.</p></div>
        <div className="dhead__date">{today}<b>FUKASHERE</b></div>
      </div>
      {stats.ordersToShip > 0 && <div className="panel-tint" style={{ alignItems: 'center' }}><ShoppingCart size={20} /><span className="grow"><b>{stats.ordersToShip}</b> paid {stats.ordersToShip === 1 ? 'order is' : 'orders are'} waiting for you to ship.</span><Link to="/dashboard/orders" className="btn btn--primary btn--sm">View orders</Link></div>}
      <div className="dgrid">
        <div className="dcol">
          <section className="stats" aria-label="Store stats">
            {cards.map((s) => (
              <div key={s.l} className="dcard stat">
                <span className="stat__ico" style={{ background: s.c }}><s.I size={22} /></span>
                <div><small>{s.l}</small><strong>{s.v}</strong>{s.d && <span className="delta" style={s.up ? undefined : { color: 'var(--danger)' }}><ArrowUp size={13} style={s.up ? undefined : { transform: 'rotate(180deg)' }} /> {s.d}</span>}<span>{s.s}</span></div>
              </div>
            ))}
          </section>
          <div className="d2">
            <section className="dcard">
              <div className="dcard__head"><h3>Sales Overview</h3><select className="dsel" aria-label="Range" defaultValue="7"><option value="7">Last 7 days</option></select></div>
              <SalesChart series={stats.series} />
            </section>
            <section className="dcard">
              <div className="dcard__head"><h3>Recent Orders</h3><Link to="/dashboard/orders">View all</Link></div>
              {stats.recentOrders.length === 0 && <p className="muted" style={{ fontSize: 13.5 }}>No orders yet. Share your listings to get your first sale.</p>}
              {stats.recentOrders.map((o) => {
                const st = ORDER_STATUS[o.status]
                const pill = o.status === 'confirmed' ? 'Delivered' : o.status === 'paid' ? 'Paid' : 'Pending'
                return (
                  <Link to={`/orders/${o.id}`} className="orow" key={o.id}>
                    <div className="thumb"><ProductImage src={o.items[0]?.image} category="shoes-bags" alt="" /></div>
                    <div><b>{o.items[0]?.title}</b><small>{naira(o.total)} · {o.items.reduce((s, i) => s + i.qty, 0)} item(s)</small></div>
                    <div className="orow__st"><span className={`pst pst--${pill}`}>{st?.label || o.status}</span><small>{fmtDate(o.createdAt)}</small></div>
                  </Link>
                )
              })}
            </section>
          </div>
          <section className="dcard">
            <div className="dcard__head"><h3>Your Products</h3><Link to="/dashboard/products">View all</Link></div>
            {products.length === 0 && <p className="muted" style={{ fontSize: 13.5 }}>No listings yet.</p>}
            <div className="mini">
              {products.slice(0, 5).map((p) => (
                <Link to={`/product/${p.id}`} key={p.id} className="mini__card">
                  <div style={{ position: 'relative' }}><ProductImage src={p.images[0]} category={p.category} alt="" /><span className="mini__tag">Active</span></div>
                  <div className="mini__body"><b>{p.title.split(' - ')[0]}</b><span className="p">{naira(p.price)}</span><small><span>👁 {p.views}</span><span>{p.quantity} left</span></small></div>
                </Link>
              ))}
            </div>
          </section>
        </div>
        <aside className="dcol">
          <section className="vv">
            <svg className="vv__shield" viewBox="0 0 64 72" aria-hidden="true"><path d="M32 3 6 13v20c0 18 11 30 26 36 15-6 26-18 26-36V13z" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" /><path d="m21 36 8 8 15-17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <div><h3>Verified Vendor</h3><span className={`tag ${active ? '' : 'tag--off'}`}>{active ? 'ACTIVE' : 'NOT ACTIVE'}</span></div>
            <p>{active ? "You're a verified vendor. Buyers trust and choose verified sellers." : 'Get your badge to show the trust mark on your listings and get boosted.'}</p>
            <Button variant="light" size="sm" onClick={() => navigate('/dashboard/verification')}>View Badge Details</Button>
          </section>
          <section className="dcard">
            <h3>Quick Actions</h3>
            <div className="qa">
              <Link to="/sell"><Plus size={18} /> Add New Product</Link>
              <Link to="/dashboard/orders"><ShoppingCart size={18} /> View Orders</Link>
              <Link to="/dashboard/products"><Package size={18} /> Manage Products</Link>
              <Link to="/wallet"><Wallet size={18} /> Withdraw Earnings</Link>
            </div>
          </section>
          <section className="offer">
            <div className="row" style={{ gap: 10 }}><Megaphone size={22} /><b>Launch Offer!</b></div>
            <small style={{ marginTop: 8 }}>First 100 vendors get</small>
            <b className="big">₦3,500</b>
            <small>+ 1 Month Free Boosting</small>
            <Button variant="light" size="sm" style={{ marginTop: 14 }} onClick={() => navigate('/dashboard/verification')}>Get Verified Now</Button>
          </section>
          <section className="dcard">
            <div className="row" style={{ gap: 8, marginBottom: 6 }}><Lightbulb size={18} /><h3>Tips for Better Sales</h3></div>
            <ul className="tips">{['Use clear, high-quality photos', 'Write detailed product descriptions', 'Reply to messages quickly', 'Keep your delivery promises', 'Maintain a good rating'].map((t) => <li key={t}><Check size={16} />{t}</li>)}</ul>
          </section>
        </aside>
      </div>
      <div className="vbar"><ShieldCheck size={26} /><b>{active ? 'Your store is verified!' : 'Your store is not verified yet.'}</b><span>Display your verified badge and build more trust with buyers.</span><Button size="sm" onClick={() => navigate('/dashboard/verification')}>View Badge Status</Button></div>
    </div>
  )
}

export function DashHome() {
  const stats = useApi('/api/vendor/stats', { interval: 30000 })
  const products = useApi('/api/me/products')
  return <Async q={stats}>{(s) => <Home stats={s} products={products.data?.items || []} />}</Async>
}

export function DashProducts() {
  const { show } = useToast()
  const q = useApi('/api/me/products')
  const [del, setDel] = useState(null)
  const remove = async () => {
    try { await api.del(`/api/products/${del.id}`); show('Listing removed.'); setDel(null); q.reload() } catch (e) { show(e.message, 'error') }
  }
  return (
    <div>
      <div className="pagehead"><h1>My Products</h1><Link to="/sell" className="btn btn--primary btn--sm"><Plus size={16} /> Add product</Link></div>
      <Async q={q}>{(d) => (d.items.length === 0 ? (
        <div className="empty dcard"><Package size={36} /><h3>No listings yet</h3><Link to="/sell" className="btn btn--primary">Add your first product</Link></div>
      ) : (
        <div className="dtable tablewrap">
          <table className="table">
            <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Views</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {d.items.map((p) => (
                <tr key={p.id}>
                  <td><Link to={`/product/${p.id}`} className="row" style={{ gap: 10 }}><div className="thumb" style={{ width: 44, height: 44 }}><ProductImage src={p.images[0]} category={p.category} alt="" /></div><b style={{ fontSize: 14 }}>{p.title}</b></Link></td>
                  <td><b>{naira(p.price)}</b></td><td>{p.quantity}</td><td>{p.views}</td>
                  <td><span className={p.quantity > 0 ? 'badge' : 'badge badge--gray'}>{p.quantity > 0 ? 'Active' : 'Sold out'}</span></td>
                  <td><Button variant="ghost" size="sm" onClick={() => setDel(p)} aria-label={`Remove ${p.title}`}><Trash2 size={16} /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}</Async>
      <Modal open={!!del} onClose={() => setDel(null)} title="Remove this listing?">
        <p className="muted" style={{ marginBottom: 16 }}>{del?.title} will no longer appear on the marketplace.</p>
        <div className="row" style={{ gap: 10 }}><Button variant="secondary" block onClick={() => setDel(null)}>Keep it</Button><Button variant="danger" block onClick={remove}>Remove</Button></div>
      </Modal>
    </div>
  )
}

export function DashOrders() {
  const q = useApi('/api/orders?role=seller', { interval: 20000 })
  return (
    <div>
      <div className="pagehead"><h1>Orders</h1></div>
      <div className="panel-tint" style={{ marginBottom: 14 }}><ShieldCheck size={20} />You are paid once the buyer confirms with a photo (or automatically 3 days after you mark it delivered). Funds show as pending until then.</div>
      <Async q={q}>{(d) => (d.items.length === 0 ? <div className="empty dcard"><ShoppingCart size={36} /><h3>No orders yet</h3></div> : (
        <div className="dtable tablewrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Item</th><th>Buyer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>{d.items.map((o) => (
              <tr key={o.id}><td><Link to={`/orders/${o.id}`} className="linkbtn">{o.code}</Link></td><td><b style={{ fontSize: 14 }}>{o.items[0]?.title}{o.items.length > 1 ? ` +${o.items.length - 1}` : ''}</b></td><td>{o.counterpart}</td><td>{naira(o.total)}</td>
                <td><span className={`pst pst--${o.status === 'confirmed' ? 'Delivered' : o.status === 'paid' ? 'Paid' : 'Pending'}`}>{ORDER_STATUS[o.status]?.label || o.status}</span></td><td className="muted">{fmtDate(o.createdAt)}</td></tr>
            ))}</tbody>
          </table>
        </div>
      ))}</Async>
    </div>
  )
}

export function DashVerification() {
  const { currentUser, refresh } = useUser()
  const { show } = useToast()
  const navigate = useNavigate()
  const q = useApi('/api/vendor/badge')
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const pay = async () => {
    setBusy(true)
    try {
      const r = await completePayment(await api.post('/api/vendor/badge/checkout'))
      if (r === 'settled') { show('Badge activated.'); setOpen(false); await refresh(); q.reload() }
    } catch (e) {
      if (e.code === 'NOT_VERIFIED') { show('Verify your student ID first.', 'error'); navigate('/verify') } else show(e.message, 'error')
    } finally { setBusy(false) }
  }

  return (
    <div style={{ maxWidth: 980 }}>
      <div className="pagehead"><h1>Vendor Verification</h1></div>
      <Async q={q}>{(b) => {
        const expiry = b.expiresAt ? new Date(b.expiresAt) : null
        const daysLeft = expiry ? Math.max(0, Math.ceil((expiry - new Date()) / 86400000)) : 0
        const pct = Math.min(100, Math.round((daysLeft / 90) * 100))
        const checklist = [['Student status verified', currentUser.isVerified], ['Phone number added', !!currentUser.phone], ['Business name added', !!currentUser.businessName], ['Rating of 4.0 or higher', (currentUser.rating || 0) >= 4]]
        const done = checklist.filter(([, ok]) => ok).length
        const perks = ['Verified badge on every listing and your profile', 'Higher placement in search results', '1 month free boosting (launch offer)', 'Vendor dashboard with sales analytics', 'Faster dispute handling']
        const faqs = [['How long does the badge last?', 'Each payment covers 3 months. Renewing adds time on top of what you have left.'], ['What happens if it expires?', 'Your listings stay live, but the badge and boosted placement are removed until you renew.'], ['Can I get a refund?', 'Badge payments are non-refundable, but contact support if something went wrong.']]
        return (
          <div className="vgrid">
            <div className="dcol">
              <section className="vv">
                <svg className="vv__shield" viewBox="0 0 64 72" aria-hidden="true"><path d="M32 3 6 13v20c0 18 11 30 26 36 15-6 26-18 26-36V13z" fill="none" stroke="#fff" strokeWidth="4" strokeLinejoin="round" /><path d="m21 36 8 8 15-17" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                <div><h3>Verified Vendor</h3><span className={`tag ${b.active ? '' : 'tag--off'}`}>{b.active ? 'ACTIVE' : expiry ? 'EXPIRED' : 'NOT ACTIVE'}</span></div>
                <p>{expiry ? `${b.active ? 'Valid until' : 'Expired on'} ${fmtDate(expiry)}.` : 'Not verified yet.'}{b.boostActive ? ' Free boosting is on.' : ''}</p>
                {expiry && <div style={{ width: '100%' }}><div className="prog prog--dark" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Time left on badge"><span style={{ width: `${pct}%` }} /></div><small style={{ color: '#bdbdbd', fontSize: 12, display: 'block', marginTop: 6 }}>{b.active ? `${daysLeft} days left of 90` : 'Renew to restore your badge'}</small></div>}
              </section>
              <section className="dcard">
                <h3>{b.active ? 'Renew your badge' : 'Get your badge'}</h3>
                <p className="muted" style={{ margin: '4px 0 12px', fontSize: 13.5 }}>{naira(b.regularPrice)} every 3 months.{b.launchAvailable ? ` Launch offer: ${naira(b.price)} plus 1 month free boosting (${b.launchSlotsLeft} spots left).` : ''}</p>
                <Button size="sm" onClick={() => setOpen(true)}><BadgeCheck size={16} /> {b.active ? 'Renew' : 'Get verified'} for {naira(b.price)}</Button>
              </section>
              <section className="dcard">
                <div className="dcard__head"><h3>Billing history</h3></div>
                {b.payments.length ? b.payments.map((p) => (
                  <div className="kv" key={p.reference}><div><b>Verified Vendor badge · 3 months</b><small>{fmtDate(p.paidAt)} · Paystack</small></div><div style={{ textAlign: 'right' }}><b>{naira(p.amount)}</b><small className="ok">Paid</small></div></div>
                )) : <p className="muted" style={{ fontSize: 13.5 }}>No payments yet.</p>}
              </section>
            </div>
            <div className="dcol">
              <section className="dcard"><h3>What you get</h3><ul className="tips" style={{ marginTop: 8 }}>{perks.map((t) => <li key={t}><Check size={16} />{t}</li>)}</ul></section>
              <section className="dcard">
                <div className="dcard__head" style={{ marginBottom: 8 }}><h3>Trust checklist</h3><span className="badge">{done}/{checklist.length}</span></div>
                <div className="prog" role="progressbar" aria-valuenow={Math.round((done / checklist.length) * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Checklist progress"><span style={{ width: `${(done / checklist.length) * 100}%` }} /></div>
                <ul className="tips" style={{ marginTop: 10 }}>{checklist.map(([t, ok]) => <li key={t} style={{ color: ok ? 'inherit' : 'var(--muted)' }}>{ok ? <Check size={16} /> : <span className="dot" aria-hidden="true" />}{t}{!ok && <em className="todo">To do</em>}</li>)}</ul>
              </section>
              <section className="dcard">
                <h3>How buyers see you</h3>
                <div className="seller" style={{ margin: '10px 0 0' }}>
                  <Avatar name={currentUser.name} size={38} verified={b.active} />
                  <div><b style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>{currentUser.name}{b.active && <span className="badge"><BadgeCheck size={13} /> Verified vendor</span>}</b><span className="muted" style={{ fontSize: 12.5 }}>★ {currentUser.rating || 'New'} · {currentUser.reviewCount} reviews</span></div>
                </div>
              </section>
              <section className="dcard"><h3 style={{ marginBottom: 6 }}>Common questions</h3>{faqs.map(([qq, a]) => <details className="faq" key={qq}><summary>{qq}</summary><p>{a}</p></details>)}</section>
            </div>
            <Modal open={open} onClose={() => setOpen(false)} title={b.active ? 'Renew Verified Vendor badge' : 'Get your Verified Vendor badge'}>
              <p className="muted" style={{ marginBottom: 14 }}>You will pay {naira(b.price)} through Paystack. Your badge runs for 3 months{b.launchAvailable ? ', with 1 month of free boosting' : ''}.</p>
              <Button block size="lg" loading={busy} onClick={pay}>Pay {naira(b.price)}</Button>
            </Modal>
          </div>
        )
      }}</Async>
    </div>
  )
}
