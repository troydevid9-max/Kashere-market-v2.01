import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check, Lock, Mail, Phone, User, IdCard, Store, LayoutGrid, MapPin, GraduationCap, ChevronRight } from 'lucide-react'
import { LogoMark } from '../components/ui/Logo'
import { AuthField } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { useUser } from '../context/UserContext'
import { useToast } from '../components/ui/Toast'
import { categories } from '../data/categories'
import stall from '../assets/vendor-stall.jpg'
import './Auth.css'

const MATRIC = /^FUK\/[A-Z]{2,4}\/\d{2,4}\/\d{3,4}$/i
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^0[789][01]\d{8}$/

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
      <path fill="#FBBC05" d="M10.5 28.7a14.5 14.5 0 0 1 0-9.4l-7.9-6.1a24 24 0 0 0 0 21.6l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  )
}
function FacebookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="11" fill="#1877F2" />
      <path fill="#fff" d="M13.3 19v-6.2h2.1l.4-2.5h-2.5V8.7c0-.7.3-1.3 1.4-1.3h1.2V5.2c-.2 0-1-.1-1.9-.1-2 0-3.3 1.2-3.3 3.4v1.8H8.600v2.5h2.100V19h2.600z" />
    </svg>
  )
}

function Social({ verb }) {
  const { show } = useToast()
  const soon = (n) => () => show(`${n} sign-in connects once the backend is ready.`, 'error')
  return (
    <>
      <div className="divider">{verb}</div>
      <div className="social">
        <Button variant="secondary" onClick={soon('Google')}><GoogleIcon /> Google</Button>
        <Button variant="secondary" onClick={soon('Facebook')}><FacebookIcon /> Facebook</Button>
      </div>
    </>
  )
}

function Terms({ checked, onChange, error }) {
  const { show } = useToast()
  const open = (what) => () => show(`${what} page is coming soon.`, 'error')
  return (
    <div>
      <label className="check">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="check__box"><Check size={14} strokeWidth={3} /></span>
        <span>
          I agree to the <button type="button" className="linkbtn" onClick={open('Terms of Use')}>Terms of Use</button> and{' '}
          <button type="button" className="linkbtn" onClick={open('Privacy Policy')}>Privacy Policy</button>
        </span>
      </label>
      {error && <p className="afield-msg">{error}</p>}
    </div>
  )
}

export function LoginPage() {
  const { login } = useUser()
  const navigate = useNavigate()
  const { show } = useToast()
  const [form, setForm] = useState({ id: '', pw: '' })
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (!form.id.trim()) return setError('Enter your matric number or email.')
    if (!form.pw) return setError('Enter your password.')
    setBusy(true); setError('')
    const res = await login(form.id, form.pw)
    setBusy(false)
    if (!res.success) return setError(res.error)
    show(`Welcome back, ${res.user.name.split(' ')[0]}!`)
    navigate(res.user.isAdmin ? '/admin' : '/')
  }

  return (
    <div className="auth">
      <div className="auth__col">
        <div className="auth__top">
          <div className="row" style={{ gap: 12 }}>
            <LogoMark size={52} />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontWeight: 800, fontSize: 26, color: 'var(--g-900)' }}>Kashere</div>
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>Student Marketplace</div>
            </div>
          </div>
          <Link to="/signup" className="auth__link">Sign up</Link>
        </div>
        <h1 className="auth__title">Welcome back!</h1>
        <p className="auth__lead">Log in to your account and continue shopping, selling and connecting.</p>
        <form className="auth__form" onSubmit={submit} noValidate>
          {error && <div className="auth__alert" role="alert">{error}</div>}
          <AuthField label="Email or Matric Number" icon={User} value={form.id} onChange={set('id')} placeholder="e.g. FUK/CS/2023/001 or your email" autoComplete="username" />
          <AuthField label="Password" icon={Lock} password value={form.pw} onChange={set('pw')} placeholder="Enter your password" autoComplete="current-password" />
          <div className="auth__row">
            <label className="check">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              <span className="check__box"><Check size={14} strokeWidth={3} /></span>
              Remember me
            </label>
            <button type="button" className="linkbtn" style={{ fontWeight: 500 }} onClick={() => show('Password reset connects once the backend is ready.', 'error')}>Forgot password?</button>
          </div>
          <Button type="submit" size="lg" block loading={busy}>Log In <ArrowRight size={19} /></Button>
        </form>
        <p className="auth__alt">Don&apos;t have an account? <Link to="/signup" className="linkbtn">Sign up</Link></p>
        <div className="auth__gate" role="img" aria-label="Federal University of Kashere main gate" />
      </div>
    </div>
  )
}

export function SignupPage() {
  const [params, setParams] = useSearchParams()
  const type = params.get('type') === 'vendor' ? 'vendor' : 'student'
  const { signup } = useUser()
  const { show } = useToast()
  const navigate = useNavigate()
  const empty = { name: '', matric: '', email: '', phone: '', pw: '', pw2: '', business: '', category: '', location: '' }
  const [f, setF] = useState(empty)
  const [agree, setAgree] = useState(false)
  const [errors, setErrors] = useState({})
  const set = (k) => (e) => { setF((s) => ({ ...s, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: undefined })) }
  const isVendor = type === 'vendor'

  const validate = () => {
    const e = {}
    if (f.name.trim().length < 3) e.name = 'Enter your full name.'
    if (!MATRIC.test(f.matric.trim())) e.matric = 'Use the format FUK/CS/2023/001.'
    if (!EMAIL.test(f.email.trim())) e.email = 'Enter a valid email address.'
    if (!PHONE.test(f.phone.trim())) e.phone = 'Enter an 11-digit Nigerian number, e.g. 08012345678.'
    if (f.pw.length < 8) e.pw = 'Use at least 8 characters.'
    if (f.pw2 !== f.pw) e.pw2 = 'Passwords do not match.'
    if (isVendor && !f.business.trim()) e.business = 'Enter your business or brand name.'
    if (isVendor && !f.category) e.category = 'Choose your main category.'
    if (!agree) e.agree = 'Please accept the terms to continue.'
    return e
  }

  const [busy, setBusy] = useState(false)
  const submit = async (ev) => {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    setBusy(true)
    const payload = { name: f.name.trim(), matric: f.matric.trim().toUpperCase(), email: f.email.trim(), phone: f.phone.trim(), password: f.pw, accountType: type }
    if (isVendor) Object.assign(payload, { businessName: f.business.trim(), storeCategory: f.category, deliveryLocation: f.location.trim() || undefined })
    const res = await signup(payload)
    setBusy(false)
    if (!res.success) return setErrors({ form: res.error })
    show('Account created. Next, verify your student ID so you can buy and sell.')
    navigate('/verify')
  }
  const switchTo = (t) => { setParams(t === 'vendor' ? { type: 'vendor' } : {}); setErrors({}) }

  const tagline = (
    <p className="auth__tagline">FUKASHERE<span>•</span>Students<span>•</span>Community<span>•</span>Trust</p>
  )

  if (isVendor) {
    return (
      <div className="auth">
        <div className="auth__col">
          <div className="auth__top" style={{ justifyContent: 'flex-start', gap: 8 }}>
            <button className="gband__back" style={{ color: 'var(--g-900)' }} onClick={() => switchTo('student')} aria-label="Back to student sign up"><ArrowLeft size={22} /></button>
            <LogoMark size={46} />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontWeight: 800, fontSize: 22, color: 'var(--g-900)' }}>Kashere</div>
              <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>Student Marketplace</div>
            </div>
          </div>
          <div className="vhero">
            <div>
              <h1 className="auth__title auth__title--sans">Create Vendor Account</h1>
              <p className="auth__lead" style={{ marginBottom: 0 }}>Join as a verified vendor and start selling to FUKASHERE students.</p>
            </div>
            <img src={stall} alt="" width="150" />
          </div>
          <div className="vtoggle" role="group" aria-label="Account type">
            <button type="button" onClick={() => switchTo('student')}><span className="vtoggle__sw" aria-hidden="true" /><span><b>Student Account</b><small>For buying and selling</small></span></button>
            <button type="button" className="is-on" aria-pressed="true"><Store size={22} /><span className="grow"><b>Vendor Account</b><small>For verified sellers</small></span><Check size={22} /></button>
          </div>
          <form className="auth__form" onSubmit={submit} noValidate>
            {errors.form && <div className="auth__alert" role="alert">{errors.form}</div>}
            <h2 className="auth__sect">Personal Information</h2>
            <AuthField label="Full Name" icon={User} value={f.name} onChange={set('name')} placeholder="Enter your full name" error={errors.name} autoComplete="name" />
            <AuthField label="Email Address" icon={Mail} value={f.email} onChange={set('email')} placeholder="Enter your email address" error={errors.email} autoComplete="email" inputMode="email" />
            <AuthField label="Phone Number" icon={Phone} value={f.phone} onChange={set('phone')} placeholder="e.g. 08012345678" error={errors.phone} autoComplete="tel" inputMode="tel" />
            <AuthField label="Matric Number" icon={GraduationCap} value={f.matric} onChange={set('matric')} placeholder="e.g. FUK/CS/2023/001" error={errors.matric} />
            <h2 className="auth__sect">Business Information</h2>
            <AuthField label="Business Name" icon={Store} value={f.business} onChange={set('business')} placeholder="Enter your business or brand name" error={errors.business} />
            <div>
              <div className={`afield ${errors.category ? 'afield--error' : ''}`}>
                <LayoutGrid size={20} />
                <div className="afield__body">
                  <label htmlFor="v-cat">Store Category</label>
                  <select id="v-cat" value={f.category} onChange={set('category')} style={{ color: f.category ? 'inherit' : 'var(--light)' }}>
                    <option value="">Select your main category</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <ChevronRight size={18} color="var(--muted)" />
              </div>
              {errors.category && <p className="afield-msg">{errors.category}</p>}
            </div>
            <AuthField label="Delivery Location (Optional)" icon={MapPin} value={f.location} onChange={set('location')} placeholder="e.g. Kashere Campus, FUK" />
            <h2 className="auth__sect">Password</h2>
            <AuthField label="Create Password" icon={Lock} password value={f.pw} onChange={set('pw')} placeholder="Minimum 8 characters" error={errors.pw} autoComplete="new-password" />
            <AuthField label="Confirm Password" icon={Lock} password value={f.pw2} onChange={set('pw2')} placeholder="Re-enter your password" error={errors.pw2} autoComplete="new-password" />
            <Terms checked={agree} onChange={setAgree} error={errors.agree} />
            <Button type="submit" size="lg" block loading={busy}>Create Vendor Account <ArrowRight size={19} /></Button>
          </form>
          <p className="auth__alt">Already have an account? <Link to="/login" className="linkbtn">Log in</Link></p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth">
      <div className="auth__col">
        <div className="auth__top" style={{ justifyContent: 'flex-start' }}>
          <div className="row" style={{ gap: 12 }}>
            <LogoMark size={52} />
            <div style={{ lineHeight: 1.1 }}>
              <div style={{ fontWeight: 800, fontSize: 26, color: 'var(--g-900)' }}>Kashere</div>
              <div style={{ color: 'var(--muted)', fontSize: 14 }}>Student Marketplace</div>
            </div>
          </div>
        </div>
        <h1 className="auth__title">Create account</h1>
        <p className="auth__lead">Join Kashere Student Marketplace and start buying and selling with confidence.</p>
        <div className="seg" role="group" aria-label="Account type" style={{ marginBottom: 16 }}>
          <button type="button" className="is-on" aria-pressed="true">Student</button>
          <button type="button" aria-pressed="false" onClick={() => switchTo('vendor')}>Vendor</button>
        </div>
        <form className="auth__form" onSubmit={submit} noValidate>
          {errors.form && <div className="auth__alert" role="alert">{errors.form}</div>}
          <AuthField label="Full Name" icon={User} value={f.name} onChange={set('name')} placeholder="Enter your full name" error={errors.name} autoComplete="name" />
          <AuthField label="Matric Number" icon={IdCard} value={f.matric} onChange={set('matric')} placeholder="e.g. FUK/CS/2023/001" error={errors.matric} />
          <AuthField label="Email Address" icon={Mail} value={f.email} onChange={set('email')} placeholder="Enter your email address" error={errors.email} autoComplete="email" inputMode="email" />
          <AuthField label="Phone Number" icon={Phone} value={f.phone} onChange={set('phone')} placeholder="e.g. 08012345678" error={errors.phone} autoComplete="tel" inputMode="tel" />
          <AuthField label="Password" icon={Lock} password value={f.pw} onChange={set('pw')} placeholder="Create a strong password" error={errors.pw} autoComplete="new-password" />
          <AuthField label="Confirm Password" icon={Lock} password value={f.pw2} onChange={set('pw2')} placeholder="Confirm your password" error={errors.pw2} autoComplete="new-password" />
          <Terms checked={agree} onChange={setAgree} error={errors.agree} />
          <Button type="submit" size="lg" block loading={busy}>Create Account <ArrowRight size={19} /></Button>
        </form>
        <Social verb="Or sign up with" />
        <p className="auth__alt">Already have an account? <Link to="/login" className="linkbtn">Log in</Link></p>
        {tagline}
      </div>
    </div>
  )
}
