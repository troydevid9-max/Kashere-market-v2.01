import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Camera, Check, Clock, MessageSquare, PackageCheck, ShieldCheck, Star, Truck, AlertTriangle, SearchX } from 'lucide-react'
import { ProductImage } from '../components/ui/ProductImage'
import { Async } from '../components/ui/State'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Field } from '../components/ui/Field'
import { useApi } from '../hooks/useApi'
import { useToast } from '../components/ui/Toast'
import { useUser } from '../context/UserContext'
import { api } from '../api'
import { ORDER_STATUS, badgeClass, complaintTypes } from '../data/options'
import { naira, fmtDateTime, fmtDate } from '../lib/format'
import './Checkout.css'
import './Orders.css'

const STEPS = [['paidAt', 'Paid', Check], ['shippedAt', 'Shipped', Truck], ['deliveredAt', 'Delivered', PackageCheck], ['confirmedAt', 'Confirmed', ShieldCheck]]

function Order({ order, reload }) {
  const { show } = useToast()
  const { currentUser, refresh } = useUser()
  const navigate = useNavigate()
  const [busy, setBusy] = useState('')
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [received, setReceived] = useState(false)
  const [modal, setModal] = useState(null)
  const [complaint, setComplaint] = useState({ type: '', description: '' })
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const isBuyer = order.role === 'buyer'
  const other = isBuyer ? order.seller : order.buyer
  const st = ORDER_STATUS[order.status] || { label: order.status, tone: 'gray' }
  const can = (a) => order.actions.includes(a)
  const run = async (key, fn, okMsg) => {
    setBusy(key)
    try { await fn(); if (okMsg) show(okMsg); await reload(); refresh() } catch (e) { show(e.message, 'error') } finally { setBusy('') }
  }

  const pick = (e) => {
    const f = e.target.files?.[0]; if (!f) return
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 5 * 1024 * 1024) return show('Choose a JPG, PNG or WebP image under 5MB.', 'error')
    if (preview) URL.revokeObjectURL(preview)
    setPhoto(f); setPreview(URL.createObjectURL(f))
  }
  const confirm = () => run('confirm', async () => { const f = new FormData(); f.append('photo', photo); await api.upload(`/api/orders/${order.id}/confirm`, f) }, 'Thanks! Payment released to the seller.')
  const message = async () => {
    try { const r = await api.post('/api/conversations', { userId: other.id, body: `Hi, about order ${order.code}.` }); navigate(`/messages?c=${r.id}`) } catch (e) { show(e.message, 'error') }
  }
  const sendComplaint = (e) => {
    e.preventDefault()
    if (!complaint.type) return show('Choose what went wrong.', 'error')
    if (complaint.description.trim().length < 15) return show('Tell us a bit more (at least 15 characters).', 'error')
    run('complain', async () => { await api.post(`/api/orders/${order.id}/complaint`, complaint); setModal(null) }, 'Complaint filed. The payment stays frozen while we review.')
  }

  const failed = ['refunded', 'cancelled'].includes(order.status)

  return (
    <div className="container od">
      <Link to="/orders" className="co__back cap"><ArrowLeft size={14} /> All orders</Link>
      <div className="od__head">
        <div><h1>{order.code}</h1><p className="muted">Placed {fmtDateTime(order.createdAt)}</p></div>
        <span className={badgeClass(st.tone)} style={{ height: 30, fontSize: 13 }}>{st.label}</span>
      </div>

      {!failed && order.status !== 'pending_payment' && (
        <section className="card od__sec">
          <div className="tl" aria-label="Order progress">
            {STEPS.map(([key, label, Icon]) => (
              <div key={key} className={`tl__s ${order[key] ? 'is-done' : ''}`}>
                <span className="tl__dot"><Icon size={15} /></span>{label}{order[key] && <small>{fmtDate(order[key])}</small>}
              </div>
            ))}
          </div>
        </section>
      )}

      {order.status === 'paid' && isBuyer && <div className="panel-tint"><ShieldCheck size={20} />Your {naira(order.total)} is held in escrow. The seller has been told to deliver your item.</div>}
      {order.status === 'paid' && !isBuyer && <div className="panel-tint"><Clock size={20} />Paid and held in escrow. Deliver the item, then mark it shipped. YouYou&apos;re paid {naira(order.subtotal - Math.round(order.subtotal * 0.06) + order.deliveryFee)}-ish once the buyer confirms.apos;re paid once the buyer confirms.</div>}
      {order.status === 'delivered' && order.autoReleaseAt && <div className="panel-tint"><Clock size={20} />{isBuyer ? `Confirm with a photo, or report a problem. If you do nothing, payment is released to the seller on ${fmtDate(order.autoReleaseAt)}.` : `If the buyer doesn't respond, you're paid automatically on ${fmtDate(order.autoReleaseAt)}.`}</div>}
      {order.status === 'confirmed' && <div className="panel-tint"><ShieldCheck size={20} />{isBuyer ? 'Completed. The seller has been paid.' : `Completed. ${naira(order.sellerPayout)} was added to your wallet (after ${naira(order.commission)} commission).`}</div>}
      {order.status === 'refunded' && <div className="panel-tint"><AlertTriangle size={20} />{isBuyer ? `${naira(order.total)} was refunded to your wallet.` : 'This order was refunded to the buyer.'}</div>}
      {order.status === 'disputed' && <div className="panel-tint"><AlertTriangle size={20} />This order is in dispute. The payment is frozen until an admin reviews it.</div>}

      {can('confirm') && (
        <section className="card od__sec">
          <h3 className="card__title"><Camera size={20} /> Confirm you received it</h3>
          <p className="muted" style={{ fontSize: 13.5 }}>Take a photo of the item in your hands. Confirming releases your payment to the seller, so only do this once you&apos;re happy.</p>
          <label className="upl">
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} />
            {preview ? <img src={preview} alt="Photo of the item you received" /> : <span><Camera size={30} /><br /><b>Add a photo of your item</b></span>}
          </label>
          <label className="checkline"><input type="checkbox" checked={received} onChange={(e) => setReceived(e.target.checked)} style={{ marginTop: 3 }} /> I received my item and it matches the listing.</label>
          <Button size="lg" block disabled={!photo || !received} loading={busy === 'confirm'} onClick={confirm}>Confirm &amp; release payment</Button>
        </section>
      )}

      {(can('ship') || can('deliver')) && (
        <section className="card od__sec">
          <h3 className="card__title"><Truck size={20} /> Next step</h3>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            {can('ship') && <Button loading={busy === 'ship'} onClick={() => run('ship', () => api.post(`/api/orders/${order.id}/ship`), 'Marked as shipped.')}>Mark as shipped</Button>}
            {can('deliver') && <Button variant="secondary" loading={busy === 'deliver'} onClick={() => run('deliver', () => api.post(`/api/orders/${order.id}/deliver`), 'Marked as delivered.')}>Mark as delivered</Button>}
          </div>
        </section>
      )}

      <section className="card od__sec">
        <h3 className="card__title"><PackageCheck size={20} /> Items</h3>
        {order.items.map((i) => (
          <div className="od__item" key={`${i.productId}-${i.title}`}>
            <Link to={`/product/${i.productId}`} className="thumb"><ProductImage src={i.image} category="shoes-bags" alt="" /></Link>
            <div className="grow"><b style={{ fontSize: 14.5 }}>{i.title}</b><p className="muted" style={{ fontSize: 13 }}>Qty {i.qty} · {naira(i.price)} each</p></div>
            <b>{naira(i.price * i.qty)}</b>
          </div>
        ))}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <div className="sumrow"><span>Subtotal</span><span>{naira(order.subtotal)}</span></div>
          <div className="sumrow"><span>Delivery</span><span>{order.deliveryFee ? naira(order.deliveryFee) : 'Free'}</span></div>
          <div className="sumrow sumrow--total"><span>Total</span><b>{naira(order.total)}</b></div>
        </div>
      </section>

      <section className="card od__sec">
        <h3 className="card__title">{order.deliveryMethod === 'pickup' ? 'Pickup' : 'Delivery'} details</h3>
        <p style={{ fontSize: 14.5 }}>{order.address}</p>
        {order.note && <p className="muted" style={{ fontSize: 13.5 }}>Note: {order.note}</p>}
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={message}><MessageSquare size={15} /> Message {other.name.split(' ')[0]}</Button>
          {!isBuyer ? null : <Link to={`/store/${other.id}`} className="btn btn--ghost btn--sm">View store</Link>}
        </div>
      </section>

      {order.hasReceipt && (
        <section className="card od__sec"><h3 className="card__title"><Camera size={20} /> Receipt photo</h3><img className="od__photo" src={`/api/orders/${order.id}/receipt`} alt="Photo the buyer uploaded when confirming receipt" /></section>
      )}

      {order.complaint && (
        <section className="card od__sec">
          <h3 className="card__title"><AlertTriangle size={20} /> Complaint · {complaintTypes.find((t) => t.value === order.complaint.type)?.label}</h3>
          <p style={{ fontSize: 14 }}>{order.complaint.description}</p>
          <span className={order.complaint.status === 'resolved' ? 'badge' : 'badge badge--warn'} style={{ alignSelf: 'flex-start' }}>{order.complaint.status === 'resolved' ? `Resolved: ${order.complaint.resolution === 'refund' ? 'refunded to buyer' : 'paid to seller'}` : 'Under review'}</span>
          {order.complaint.resolutionNote && <p className="muted" style={{ fontSize: 13.5 }}>{order.complaint.resolutionNote}</p>}
        </section>
      )}

      {order.review && <section className="card od__sec"><h3 className="card__title"><Star size={20} /> Review · {order.review.rating}/5</h3>{order.review.comment && <p style={{ fontSize: 14 }}>{order.review.comment}</p>}</section>}

      {(can('complain') || can('cancel') || can('review')) && (
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          {can('review') && <Button onClick={() => setModal('review')}><Star size={16} /> Leave a review</Button>}
          {can('complain') && <Button variant="secondary" onClick={() => setModal('complain')}><AlertTriangle size={16} /> Report a problem</Button>}
          {can('cancel') && <Button variant="ghost" onClick={() => setModal('cancel')}>Cancel &amp; refund</Button>}
        </div>
      )}

      <Modal open={modal === 'complain'} onClose={() => setModal(null)} title="Report a problem">
        <form onSubmit={sendComplaint} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
          <p className="muted" style={{ fontSize: 13.5 }}>Your payment stays frozen in escrow while an admin reviews this.</p>
          <Field as="select" label="What went wrong?" required value={complaint.type} onChange={(e) => setComplaint((c) => ({ ...c, type: e.target.value }))}>
            <option value="" disabled>Select a reason</option>{complaintTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Field>
          <Field as="textarea" label="Details" required rows={4} value={complaint.description} onChange={(e) => setComplaint((c) => ({ ...c, description: e.target.value }))} placeholder="Tell us what happened…" />
          <Button type="submit" size="lg" block loading={busy === 'complain'}>Submit complaint</Button>
        </form>
      </Modal>
      <Modal open={modal === 'cancel'} onClose={() => setModal(null)} title="Cancel this order?">
        <p className="muted" style={{ marginBottom: 16 }}>{isBuyer ? `${naira(order.total)} goes back to your Kashere wallet.` : 'The buyer will be refunded in full.'}</p>
        <div className="row" style={{ gap: 10 }}><Button variant="secondary" block onClick={() => setModal(null)}>Keep order</Button><Button variant="danger" block loading={busy === 'cancel'} onClick={() => run('cancel', async () => { await api.post(`/api/orders/${order.id}/cancel`); setModal(null) }, 'Order cancelled and refunded.')}>Cancel &amp; refund</Button></div>
      </Modal>
      <Modal open={modal === 'review'} onClose={() => setModal(null)} title="Rate this seller">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="stars-pick" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} stars`} className={n <= rating ? 'is-on' : ''} onClick={() => setRating(n)}><Star size={30} /></button>)}</div>
          <Field as="textarea" label="Comment" optional rows={3} value={comment} onChange={(e) => setComment(e.target.value)} maxLength={500} placeholder="How was the item and the seller?" />
          <Button size="lg" block loading={busy === 'review'} onClick={() => run('review', async () => { await api.post(`/api/orders/${order.id}/review`, { rating, comment }); setModal(null) }, 'Thanks for your review!')}>Submit review</Button>
        </div>
      </Modal>
      {currentUser?.isAdmin && order.actions.includes('resolve') && <div className="panel-tint"><AlertTriangle size={20} />Resolve this dispute from the <Link to="/admin" className="linkbtn">admin panel</Link>.</div>}
    </div>
  )
}

export function OrderDetailPage() {
  const { id } = useParams()
  const { currentUser } = useUser()
  const q = useApi(currentUser ? `/api/orders/${encodeURIComponent(id)}` : null, { interval: 15000 })
  if (!currentUser) return <div className="container"><div className="empty"><h3>Log in to see this order</h3><Link to="/login" className="btn btn--primary">Log in</Link></div></div>
  if (q.error?.status === 404) return <div className="container"><div className="empty"><SearchX size={40} /><h3>Order not found</h3><Link to="/orders" className="btn btn--primary">All orders</Link></div></div>
  return <Async q={q}>{(d) => <Order key={d.order.id} order={d.order} reload={q.reload} />}</Async>
}
