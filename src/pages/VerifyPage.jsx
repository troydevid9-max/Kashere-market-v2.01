import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BadgeCheck, Camera, Clock, Lock, ShieldCheck, XCircle } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { useUser } from '../context/UserContext'
import { useToast } from '../components/ui/Toast'
import { api } from '../api'
import './Verify.css'

export function VerifyPage() {
  const { currentUser, refresh } = useUser()
  const { show } = useToast()
  const navigate = useNavigate()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!currentUser) return <div className="container"><div className="empty"><Lock size={36} /><h3>Log in to verify your student status</h3><Link to="/login" className="btn btn--primary">Log in</Link></div></div>
  const status = currentUser.verificationStatus

  const pick = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!/^image\/(jpeg|png|webp)$/.test(f.type) || f.size > 5 * 1024 * 1024) return show('Choose a JPG, PNG or WebP image under 5MB.', 'error')
    if (preview) URL.revokeObjectURL(preview)
    setFile(f); setPreview(URL.createObjectURL(f))
  }
  const submit = async (e) => {
    e.preventDefault()
    if (!file) return show('Add a photo of your student ID first.', 'error')
    setBusy(true)
    try {
      const f = new FormData(); f.append('idPhoto', file)
      await api.upload('/api/me/verification', f)
      await refresh(); show('Submitted. We usually review within a day.')
    } catch (err) { show(err.message, 'error') } finally { setBusy(false) }
  }

  return (
    <div className="container verify">
      <h1>Verify your student status</h1>
      <p className="muted">Kashere is only for FUKASHERE students. This keeps scammers out and protects everyone&apos;s money.</p>

      {status === 'approved' && (
        <section className="card card--pad verify__state"><BadgeCheck size={40} /><h2>You&apos;re verified</h2><p className="muted">You can buy, sell and use your wallet.</p><Button onClick={() => navigate('/sell')}>Add a product</Button></section>
      )}
      {status === 'pending' && (
        <section className="card card--pad verify__state"><Clock size={40} /><h2>Under review</h2><p className="muted">An admin is checking your ID. You&apos;ll get a notification as soon as it&apos;s done.</p></section>
      )}
      {(status === 'none' || status === 'rejected') && (
        <form className="card card--pad verify__form" onSubmit={submit}>
          {status === 'rejected' && <div className="panel-tint" role="alert"><XCircle size={20} />Your last upload was declined{currentUser.verificationNote ? `: ${currentUser.verificationNote}` : '.'} Please upload a clearer photo.</div>}
          <ol className="verify__tips">
            <li>Take a clear photo of your <b>student ID card</b> or admission/registration slip.</li>
            <li>Your name and matric number (<b>{currentUser.matric}</b>) must be readable.</li>
            <li>Only admins can see this photo. It is never shown to other users.</li>
          </ol>
          <label className="upl">
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pick} />
            {preview ? <img src={preview} alt="Preview of your student ID" /> : <span><Camera size={30} /><br /><b>Tap to add a photo of your ID</b></span>}
          </label>
          <Button type="submit" size="lg" block loading={busy} disabled={!file}><ShieldCheck size={18} /> Submit for review</Button>
        </form>
      )}
    </div>
  )
}
