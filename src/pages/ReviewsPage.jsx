import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Lock, Plus, MessageSquareWarning } from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { StarRating } from '../components/ui/StarRating'
import { ProductImage } from '../components/ui/ProductImage'
import { Modal } from '../components/ui/Modal'
import { Field } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { Async } from '../components/ui/State'
import { useUser } from '../context/UserContext'
import { useToast } from '../components/ui/Toast'
import { useApi } from '../hooks/useApi'
import { api } from '../api'
import { complaintTypes } from '../data/options'
import { naira, fmtDate } from '../lib/format'
import './Profile.css'

export function ReviewsPage() {
  const { currentUser } = useUser()
  const { show } = useToast()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [f, setF] = useState({ orderId: '', type: '', description: '' })
  const [errors, setErrors] = useState({})
  const tab = params.get('tab') === 'complaints' ? 'complaints' : 'reviews'
  const reviews = useApi(currentUser ? '/api/reviews/received' : null)
  const complaints = useApi(currentUser ? '/api/complaints' : null)
  const orders = useApi(currentUser && open ? '/api/orders?role=buyer' : null)

  if (!currentUser) return <div className="container"><div className="empty"><Lock size={40} /><h3>Log in to see your reviews</h3><Link to="/login" className="btn btn--primary">Log in</Link></div></div>

  const eligible = (orders.data?.items || []).filter((o) => ['paid', 'shipped', 'delivered'].includes(o.status))
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })) }

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (!f.orderId) er.orderId = 'Choose the order.'
    if (!f.type) er.type = 'Choose what went wrong.'
    if (f.description.trim().length < 15) er.description = 'Tell us a bit more (at least 15 characters).'
    setErrors(er)
    if (Object.keys(er).length) return
    setBusy(true)
    try { await api.post(`/api/orders/${f.orderId}/complaint`, { type: f.type, description: f.description.trim() }); setOpen(false); setF({ orderId: '', type: '', description: '' }); show('Complaint filed. The payment stays frozen while we review.'); complaints.reload(); setParams({ tab: 'complaints' }) }
    catch (err) { show(err.message, 'error') } finally { setBusy(false) }
  }

  return (
    <div className="container" style={{ maxWidth: 820, paddingTop: 20 }}>
      <div className="pagehead" style={{ marginBottom: 6 }}>
        <div><h1 style={{ fontSize: 28, fontWeight: 800 }}>Reviews &amp; Complaints</h1><p className="muted">Your reputation and protection on the marketplace.</p></div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus size={16} /> File a complaint</Button>
      </div>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'reviews'} className={tab === 'reviews' ? 'is-on' : ''} onClick={() => setParams({})}>Received reviews <span className="count">{reviews.data?.items.length ?? 0}</span></button>
        <button role="tab" aria-selected={tab === 'complaints'} className={tab === 'complaints' ? 'is-on' : ''} onClick={() => setParams({ tab: 'complaints' })}>Complaints <span className="count">{complaints.data?.items.length ?? 0}</span></button>
      </div>
      <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {tab === 'reviews' && <Async q={reviews}>{(d) => (d.items.length ? d.items.map((r) => (
          <article key={r.id} className="card card--pad">
            <div className="row" style={{ gap: 10 }}><Avatar name={r.buyerName} size={40} /><div className="grow"><b>{r.buyerName}</b><p className="muted" style={{ fontSize: 13 }}>{fmtDate(r.createdAt)}</p></div><StarRating value={r.rating} /></div>
            {r.product && <Link to={`/product/${r.product.id}`} className="listrow" style={{ borderBottom: 0, paddingBottom: 0 }}><div className="thumb" style={{ width: 44, height: 44 }}><ProductImage category={r.product.category} alt="" /></div><b style={{ fontSize: 14 }}>{r.product.title}</b></Link>}
            {r.comment && <p style={{ marginTop: 8, color: '#2b2b2b' }}>{r.comment}</p>}
          </article>
        )) : <div className="empty"><h3>No reviews yet</h3><p>Reviews from buyers will show up here.</p></div>)}</Async>}
        {tab === 'complaints' && <Async q={complaints}>{(d) => (d.items.length ? d.items.map((c) => (
          <article key={c.id} className="card card--pad">
            <div className="row" style={{ justifyContent: 'space-between' }}><b>{complaintTypes.find((t) => t.value === c.type)?.label}</b><span className={`badge ${c.status === 'resolved' ? '' : 'badge--warn'}`}>{c.status === 'resolved' ? 'Resolved' : 'Under review'}</span></div>
            <p className="muted" style={{ fontSize: 13, margin: '2px 0 8px' }}><Link to={`/orders/${c.orderId}`} className="linkbtn">{c.code}</Link> · {naira(c.total)} · {fmtDate(c.createdAt)} · you were the {c.role}</p>
            <p style={{ color: '#2b2b2b' }}>{c.description}</p>
            {c.resolution && <div className="panel-tint" style={{ marginTop: 10 }}>{c.resolution === 'refund' ? 'Resolved: refunded to the buyer.' : 'Resolved: paid to the seller.'}{c.resolutionNote ? ` ${c.resolutionNote}` : ''}</div>}
          </article>
        )) : <div className="empty"><MessageSquareWarning size={36} /><h3>No complaints</h3><p>If an order goes wrong, file a complaint and we will step in.</p></div>)}</Async>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="File a complaint">
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
          <Field as="select" label="Order" required value={f.orderId} onChange={set('orderId')} error={errors.orderId}>
            <option value="" disabled>{eligible.length ? 'Select an order' : 'No active orders to report'}</option>
            {eligible.map((o) => <option key={o.id} value={o.id}>{o.code} · {o.items[0]?.title} · {naira(o.total)}</option>)}
          </Field>
          <Field as="select" label="What went wrong?" required value={f.type} onChange={set('type')} error={errors.type}>
            <option value="" disabled>Select a reason</option>{complaintTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Field>
          <Field as="textarea" label="Details" required rows={4} value={f.description} onChange={set('description')} error={errors.description} placeholder="Tell us what happened…" />
          <Button type="submit" size="lg" block loading={busy}>Submit complaint</Button>
        </form>
      </Modal>
    </div>
  )
}
