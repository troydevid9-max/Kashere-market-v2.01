import { useEffect, useState } from 'react'
import { Download, Share, X, WifiOff } from 'lucide-react'
import { Button } from './ui/Button'

const KEY = 'kashere-install-dismissed'
const standalone = () => window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream

/** Offers "install the app" once per user (Android/desktop via the browser event, iPhone via instructions). */
export function InstallPrompt() {
  const [evt, setEvt] = useState(null)
  const [show, setShow] = useState(false)
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false)
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])

  useEffect(() => {
    if (standalone() || localStorage.getItem(KEY)) return undefined
    const onPrompt = (e) => { e.preventDefault(); setEvt(e); setShow(true) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    let t
    if (isIos()) t = setTimeout(() => setShow(true), 4000)
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); clearTimeout(t) }
  }, [])

  const dismiss = () => { localStorage.setItem(KEY, '1'); setShow(false) }
  const install = async () => { if (!evt) return; evt.prompt(); await evt.userChoice.catch(() => {}); dismiss() }

  return (
    <>
      {!online && <div className="offline-bar" role="status"><WifiOff size={14} style={{ display: 'inline', verticalAlign: '-2px' }} /> You&apos;re offline. Some things won&apos;t load until you reconnect.</div>}
      {show && (
        <div className="install" role="dialog" aria-label="Install Kashere">
          <div className="install__icon"><Download size={20} /></div>
          <div className="grow">
            <b>Install Kashere</b>
            <p>{evt ? 'Add it to your home screen for one-tap access.' : <>Tap <Share size={13} style={{ display: 'inline', verticalAlign: '-2px' }} /> then &ldquo;Add to Home Screen&rdquo;.</>}</p>
          </div>
          {evt && <Button size="sm" onClick={install}>Install</Button>}
          <button className="iconbtn" onClick={dismiss} aria-label="Dismiss" style={{ width: 34, height: 34 }}><X size={16} /></button>
        </div>
      )}
    </>
  )
}
