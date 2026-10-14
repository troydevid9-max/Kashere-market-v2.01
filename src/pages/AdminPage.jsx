import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Package, AlertTriangle, BadgeCheck, BarChart3, Lock, Trash2, IdCard, Banknote, Ban, Check, X } from 'lucide-react'
import { DashShell } from '../components/DashShell'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field } from '../components/ui/Field'
import { Async } from '../components/ui/State'
import { useUser } from '../context/UserContext'
import { useToast } from '../components/ui/Toast'
import { useApi } from '../hooks/useApi'
import { api } from '../api'
import { complaintTypes } from '../data/options'
import { naira, fmtDate, timeAgo } from '../lib/format'
import './Dashboard.css'

const TITLES = { overview: 'Overview', verifications: 'Student IDs', users: 'Users', listings: 'Listings', disputes: 'Disputes', withdrawals: 'Withdrawals', vendors: 'Vendors' }

function Overview() {
  const q = useApi('/api/admin/stats', { interval: 30000 })
  return <Async q={q}>{(s) => (
    <div className="stats" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))' }}>
      {[['Total users', s.users, `+${s.newUsersThisMonth} this month`], ['Verified students', s.verifiedUsers, `${s.pendingVerifications} waiting`], ['Active listings', s.activeListings], ['Completed orders', s.completedOrders],
        ['Escrow held', naira(s.escrowHeld)], ['Platform revenue', naira(s.platformRevenue), 'Commission earned'], ['Active vendors', s.activeVendors], ['Open disputes', s.openDisputes], ['Pending withdrawals', s.pendingWithdrawals]].map(([l, v, sub]) => (
        <div className="dcard stat" key={l}><div><small>{l}</small><strong>{v}</strong>{sub && <span>{sub}</span>}</div></div>
      ))}
    </div>
  )}</Async>
}

function Verifications() {
  const { show } = useToast()
  const q = useApi('/api/admin/verifications?status=pending')
  const [view, setView] = useState(null)
  const [note, setNote] = useState('')
  const decide = async (approve) => {
    try { await api.post(`/api/admin/verifications/${view.id}/decision`, { approve, note: note.trim() || undefined }); show(approve ? 'Student verified.' : 'Request declined.'); setView(null); setNote(''); q.reload() } catch (e) { show(e.message, 'error') }
  }
  return (
    <>
      <Async q={q}>{(d) => (d.items.length === 0 ? <div className="empty dcard"><IdCard size={36} /><h3>No pending requests</h3></div> : (
        <div className="dtable tablewrap"><table className="table">
          <thead><tr><th>Student</th><th>Matric</th><th>Submitted</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{d.items.map((v) => <tr key={v.id}><td><b>{v.name}</b><br /><small className="muted">{v.email}</small></td><td>{v.matric}</td><td className="muted">{timeAgo(v.createdAt)}</td><td><Button size="sm" onClick={() => setView(v)}>Review ID</Button></td></tr>)}</tbody>
        </table></div>
      ))}</Async>
      <Modal open={!!view} onClose={() => setView(null)} title={view ? `${view.name} · ${view.matric}` : ''}>
        {view && <>
          <p className="muted" style={{ fontSize: 13.5, marginBottom: 10 }}>Check that the name and matric number on the ID match the account.</p>
          <img src={`/api/admin/verifications/${view.id}/photo`} alt={`Student ID submitted by ${view.name}`} style={{ width: '100%', maxHeight: 340, objectFit: 'contain', borderRadius: 16, background: '#ececec', marginBottom: 12 }} />
          <Field label="Note (shown to the student if declined)" optional value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          <div className="row" style={{ gap: 10, marginTop: 14 }}><Button variant="secondary" block onClick={() => decide(false)}><X size={16} /> Decline</Button><Button block onClick={() => decide(true)}><Check size={16} /> Approve</Button></div>
        </>}
      </Modal>
    </>
  )
}

function UsersTab() {
  const { show } = useToast()
  const [text, setText] = useState('')
  const q = useApi(`/api/admin/users${text ? `?q=${encodeURIComponent(text)}` : ''}`)
  const ban = async (u) => { try { await api.post(`/api/admin/users/${u.id}/ban`, { banned: !u.banned }); show(u.banned ? 'User restored.' : 'User banned.'); q.reload() } catch (e) { show(e.message, 'error') } }
  return (
    <>
      <label className="field__box" style={{ maxWidth: 360, marginBottom: 14 }}><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search name, email or matric" aria-label="Search users" /></label>
      <Async q={q}>{(d) => (
        <div className="dtable tablewrap"><table className="table">
          <thead><tr><th>Name</th><th>Matric</th><th>Status</th><th>Role</th><th>Wallet</th><th>Joined</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{d.items.map((u) => (
            <tr key={u.id}><td><b>{u.name}</b><br /><small className="muted">{u.email}</small></td><td>{u.matric}</td>
              <td><span className={`badge ${u.verificationStatus === 'approved' ? '' : 'badge--gray'}`}>{u.banned ? 'Banned' : u.verificationStatus === 'approved' ? 'Verified' : u.verificationStatus}</span></td>
              <td>{u.isAdmin ? 'Admin' : u.isVendor ? 'Vendor' : 'Student'}</td><td>{naira(u.walletBalance)}</td><td className="muted">{fmtDate(u.createdAt)}</td>
              <td>{!u.isAdmin && <Button variant="ghost" size="sm" onClick={() => ban(u)} aria-label={u.banned ? `Restore ${u.name}` : `Ban ${u.name}`}><Ban size={16} /></Button>}</td></tr>
          ))}</tbody>
        </table></div>
      )}</Async>
    </>
  )
}

function Listings() {
  const { show } = useToast()
  const q = useApi('/api/admin/listings')
  const [del, setDel] = useState(null)
  const remove = async () => { try { await api.del(`/api/products/${del.id}`); show('Listing removed.'); setDel(null); q.reload() } catch (e) { show(e.message, 'error') } }
  return (
    <>
      <Async q={q}>{(d) => (
        <div className="dtable tablewrap"><table className="table">
          <thead><tr><th>Listing</th><th>Seller</th><th>Price</th><th>Stock</th><th>Views</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{d.items.map((p) => <tr key={p.id}><td><Link to={`/product/${p.id}`}><b style={{ fontSize: 14 }}>{p.title}</b></Link></td><td>{p.seller}</td><td>{naira(p.price)}</td><td>{p.quantity}</td><td>{p.views}</td><td><Button variant="ghost" size="sm" onClick={() => setDel(p)} aria-label={`Remove ${p.title}`}><Trash2 size={16} /></Button></td></tr>)}</tbody>
        </table></div>
      )}</Async>
      <Modal open={!!del} onClose={() => setDel(null)} title="Remove this listing?">
        <p className="muted" style={{ marginBottom: 16 }}>{del?.title}</p>
        <div className="row" style={{ gap: 10 }}><Button variant="secondary" block onClick={() => setDel(null)}>Cancel</Button><Button variant="danger" block onClick={remove}>Remove</Button></div>
      </Modal>
    </>
  )
}

function Disputes() {
  const { show } = useToast()
  const q = useApi('/api/admin/complaints')
  const [d, setD] = useState(null)
  const [note, setNote] = useState('')
  const resolve = async (resolution) => {
    try { await api.post(`/api/admin/complaints/${d.id}/resolve`, { resolution, note: note.trim() || undefined }); show('Dispute resolved.'); setD(null); setNote(''); q.reload() } catch (e) { show(e.message, 'error') }
  }
  return (
    <>
      <Async q={q}>{(r) => (r.items.length === 0 ? <div className="empty dcard"><AlertTriangle size={36} /><h3>No disputes</h3></div> : (
        <div className="dtable tablewrap"><table className="table">
          <thead><tr><th>Order</th><th>Reason</th><th>Buyer → Seller</th><th>Amount</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
          <tbody>{r.items.map((c) => (
            <tr key={c.id}><td><Link to={`/orders/${c.orderId}`} className="linkbtn">{c.code}</Link><br /><small className="muted">{c.description.slice(0, 60)}{c.description.length > 60 ? '…' : ''}</small></td>
              <td>{complaintTypes.find((t) => t.value === c.type)?.label}</td><td>{c.buyerName} → {c.sellerName}</td><td>{naira(c.total)}</td>
              <td><span className={`badge ${c.status === 'resolved' ? '' : 'badge--warn'}`}>{c.status === 'resolved' ? (c.resolution === 'refund' ? 'Refunded' : 'Paid seller') : 'Open'}</span></td>
              <td>{c.status === 'open' && <Button size="sm" onClick={() => setD(c)}>Resolve</Button>}</td></tr>
          ))}</tbody>
        </table></div>
      ))}</Async>
      <Modal open={!!d} onClose={() => setD(null)} title={d ? `Resolve ${d.code}` : ''}>
        {d && <>
          <p style={{ fontSize: 14, marginBottom: 10 }}>{d.description}</p>
          <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>Refund returns {naira(d.total)} to the buyer&apos;s wallet. Pay seller releases the escrow to the seller. Look at the order&apos;s messages and receipt photo first.</p>
          <Field label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
          <div className="row" style={{ gap: 10, marginTop: 14 }}><Button variant="secondary" block onClick={() => resolve('refund')}>Refund buyer</Button><Button block onClick={() => resolve('release')}>Pay seller</Button></div>
        </>}
      </Modal>
    </>
  )
}

function Withdrawals() {
  const { show } = useToast()
  const q = useApi('/api/admin/withdrawals')
  const decide = async (w, pay) => {
    try { await api.post(`/api/admin/withdrawals/${w.id}/decision`, { pay, note: pay ? undefined : 'Please check your bank details and try again.' }); show(pay ? 'Marked as paid.' : 'Rejected and refunded.'); q.reload() } catch (e) { show(e.message, 'error') }
  }
  return <Async q={q}>{(d) => (d.items.length === 0 ? <div className="empty dcard"><Banknote size={36} /><h3>No withdrawals</h3></div> : (
    <div className="dtable tablewrap"><table className="table">
      <thead><tr><th>Student</th><th>Amount</th><th>Pay to</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr></thead>
      <tbody>{d.items.map((w) => (
        <tr key={w.id}><td><b>{w.userName}</b><br /><small className="muted">{w.matric} · {timeAgo(w.createdAt)}</small></td><td><b>{naira(w.amount)}</b></td>
          <td>{w.bankName}<br /><small className="muted">{w.accountNumber} · {w.accountName}</small></td>
          <td><span className={`badge ${w.status === 'pending' ? 'badge--warn' : w.status === 'paid' ? '' : 'badge--gray'}`}>{w.status}</span></td>
          <td>{w.status === 'pending' && <div className="row" style={{ gap: 6 }}><Button size="sm" onClick={() => decide(w, true)}>Mark paid</Button><Button size="sm" variant="secondary" onClick={() => decide(w, false)}>Reject</Button></div>}</td></tr>
      ))}</tbody>
    </table></div>
  ))}</Async>
}

function Vendors() {
  const q = useApi('/api/admin/vendors')
  return <Async q={q}>{(d) => (
    <div className="dtable tablewrap"><table className="table">
      <thead><tr><th>Vendor</th><th>Matric</th><th>Badge expires</th><th>Status</th></tr></thead>
      <tbody>{d.items.map((u) => <tr key={u.id}><td><b>{u.name}</b><br /><small className="muted">{u.businessName}</small></td><td>{u.matric}</td><td>{fmtDate(u.expiresAt)}</td><td><span className={`badge ${u.active ? '' : 'badge--gray'}`}>{u.active ? 'Active' : 'Not active'}</span></td></tr>)}</tbody>
    </table></div>
  )}</Async>
}

export function AdminPage() {
  const { currentUser, loading } = useUser()
  const [tab, setTab] = useState('overview')
  if (loading) return null
  if (!currentUser?.isAdmin) {
    return (
      <div className="auth"><div className="auth__col" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 14 }}>
        <Lock size={40} />
        <h1 style={{ fontSize: 26 }}>Admin access required</h1>
        <p className="muted">You don&apos;t have permission to view this page.</p>
        <Link to="/login" className="btn btn--primary">Log in</Link><Link to="/" className="linkbtn">Back to marketplace</Link>
      </div></div>
    )
  }
  const nav = [['overview', BarChart3], ['verifications', IdCard], ['users', Users], ['listings', Package], ['disputes', AlertTriangle], ['withdrawals', Banknote], ['vendors', BadgeCheck]]
    .map(([k, icon]) => ({ label: TITLES[k], icon, active: tab === k, onSelect: () => setTab(k) }))
  const View = { overview: Overview, verifications: Verifications, users: UsersTab, listings: Listings, disputes: Disputes, withdrawals: Withdrawals, vendors: Vendors }[tab]
  return (
    <DashShell nav={nav} role="Admin" placeholder="Search users, listings, disputes…" footerImage={false}>
      <div className="pagehead"><h1>{TITLES[tab]}</h1></div>
      <View />
    </DashShell>
  )
}
