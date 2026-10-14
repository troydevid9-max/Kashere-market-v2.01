import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Camera, Tag, LayoutGrid, Star, Truck, Store, MapPin, UploadCloud, ArrowRight, Check, BadgeCheck, Lock } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { PhotoUpload } from '../components/ui/PhotoUpload'
import { Field } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { useUser } from '../context/UserContext'
import { useToast } from '../components/ui/Toast'
import { categories } from '../data/categories'
import { conditionOptions, deliveryLocations } from '../data/options'
import { api } from '../api'
import './Sell.css'

const Naira = () => <span className="glyph" aria-hidden="true">₦</span>
const Hash = () => <span className="glyph" aria-hidden="true">#</span>

const DELIVERY = [
  { id: 'delivery', label: 'Delivery', note: '(Campus area)', icon: Truck },
  { id: 'pickup', label: 'Pickup Only', note: '(Campus location)', icon: Store },
  { id: 'both', label: 'Both', note: '(Delivery & Pickup)', icon: Truck }
]

export function SellPage() {
  const { currentUser } = useUser()
  const { show } = useToast()
  const navigate = useNavigate()
  const [photos, setPhotos] = useState([])
  const [f, setF] = useState({ title: '', description: '', category: '', condition: '', price: '', quantity: '1', delivery: 'delivery', location: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })) }

  if (!currentUser) {
    return (
      <div className="gpage">
        <PageHeader brand fallback="/" end={<span />} />
        <div className="gsheet"><div className="gsheet__in">
          <div className="empty card" style={{ background: '#fff' }}>
            <Lock size={36} />
            <h3>Log in to list an item</h3>
            <p>Only verified FUKASHERE students can sell on Kashere.</p>
            <Link to="/login" className="btn btn--primary">Log in</Link>
          </div>
        </div></div>
      </div>
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (photos.length === 0) er.photos = 'Add at least one clear photo of your item.'
    if (f.title.trim().length < 3) er.title = 'Give your product a name.'
    if (f.description.trim().length < 10) er.description = 'Add a few details (at least 10 characters).'
    if (!f.category) er.category = 'Choose a category.'
    if (!f.condition) er.condition = 'Choose a condition.'
    const price = Number(f.price)
    if (!Number.isFinite(price) || price < 100) er.price = 'Enter a price of ₦100 or more.'
    const qty = Number(f.quantity)
    if (!Number.isInteger(qty) || qty < 1) er.quantity = 'Enter a quantity of 1 or more.'
    setErrors(er)
    if (Object.keys(er).length) {
      show('Please fix the highlighted fields.', 'error')
      document.querySelector('[aria-invalid="true"], .sell__err')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setBusy(true)
    try {
      const form = new FormData()
      photos.forEach((p) => form.append('images', p.file))
      Object.entries({ title: f.title.trim(), description: f.description.trim(), price, quantity: qty, category: f.category, condition: f.condition, delivery: f.delivery, deliveryLocation: f.location }).forEach(([k, v]) => { if (v !== '' && v !== undefined) form.append(k, v) })
      const r = await api.upload('/api/products', form)
      show('Product published!')
      navigate(`/product/${r.product.id}`)
    } catch (err) {
      if (err.code === 'NOT_VERIFIED') { show('Verify your student ID before you can sell.', 'error'); navigate('/verify') }
      else show(err.message, 'error')
    } finally { setBusy(false) }
  }

  return (
    <div className="gpage">
      <PageHeader brand fallback="/" />
      <form className="gsheet" onSubmit={submit} noValidate>
        <div className="gsheet__in">
          <div className="sell__head">
            <div>
              <h2 className="sell__title">Add Product</h2>
              <p className="muted">List your product and reach fellow Kashere students.</p>
            </div>
            {(currentUser.isVendor || currentUser.isVerified) && (
              <span className="badge" style={{ height: 38, padding: '0 14px', fontSize: 13.5 }}><BadgeCheck size={17} /> Verified Seller</span>
            )}
          </div>

          <section className="card card--pad">
            <h3 className="card__title"><Camera size={20} /> Product Photos</h3>
            <p className="card__sub" style={{ marginBottom: 12 }}>Upload clear photos of your product (max 5).</p>
            <PhotoUpload photos={photos} onChange={(p) => { setPhotos(p); setErrors((x) => ({ ...x, photos: undefined })) }} onError={(m) => show(m, 'error')} />
            {errors.photos && <p className="field__msg sell__err">{errors.photos}</p>}
          </section>

          <section className="card card--pad sell__stack">
            <h3 className="card__title"><Tag size={20} /> Product Information</h3>
            <Field label="Product Name" required value={f.title} onChange={set('title')} placeholder="e.g. Nike Air Force 1" error={errors.title} maxLength={80} />
            <Field as="textarea" label="Description" required value={f.description} onChange={set('description')} maxLength={500} rows={4}
              placeholder="Describe your product, features, condition, and any important details…" error={errors.description} hint={`${f.description.length}/500`} />
            <div className="sell__two">
              <Field as="select" label="Category" required icon={LayoutGrid} value={f.category} onChange={set('category')} error={errors.category}>
                <option value="" disabled>Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Field>
              <Field as="select" label="Condition" required icon={Star} value={f.condition} onChange={set('condition')} error={errors.condition}>
                <option value="" disabled>Select condition</option>
                {conditionOptions.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Field>
              <Field label="Price (₦)" required icon={Naira} value={f.price} onChange={set('price')} inputMode="numeric" type="number" min="100" placeholder="e.g. 28000" error={errors.price} />
              <Field label="Available Quantity" required icon={Hash} value={f.quantity} onChange={set('quantity')} inputMode="numeric" type="number" min="1" placeholder="e.g. 5" error={errors.quantity} />
            </div>
          </section>

          <section className="card card--pad sell__stack">
            <h3 className="card__title"><Truck size={20} /> Delivery &amp; Pickup Options</h3>
            <div className="opts opts--3" role="radiogroup" aria-label="Delivery option">
              {DELIVERY.map((d) => {
                const on = f.delivery === d.id
                return (
                  <button key={d.id} type="button" role="radio" aria-checked={on} className={`opt ${on ? 'is-on' : ''}`} onClick={() => setF((s) => ({ ...s, delivery: d.id }))}>
                    {on && <span className="opt__tick"><Check size={12} strokeWidth={3.5} /></span>}
                    <d.icon size={22} />
                    <span><b>{d.label}</b><small>{d.note}</small></span>
                  </button>
                )
              })}
            </div>
            <Field as="select" label="Delivery Location" optional icon={MapPin} value={f.location} onChange={set('location')}>
              <option value="">Select delivery location</option>
              {deliveryLocations.map((l) => <option key={l}>{l}</option>)}
            </Field>
          </section>

          <div className="sell__cta">
            <Button type="submit" size="lg" block loading={busy}><UploadCloud size={21} /> Publish Product <ArrowRight size={19} /></Button>
          </div>
        </div>
      </form>
    </div>
  )
}
