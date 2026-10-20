import { useEffect } from 'react'
import './IntroOverlay.css'

const INTRO_DURATION = 2850

export function IntroOverlay({ onFinish }) {
  useEffect(() => {
    const timeout = window.setTimeout(onFinish, INTRO_DURATION)
    return () => window.clearTimeout(timeout)
  }, [onFinish])

  return (
    <div className="intro" role="dialog" aria-label="Kashere Student Marketplace introduction">
      <div className="intro__atmosphere" aria-hidden="true" />
      <div className="intro__brand">
        <img className="intro__logo" src="/brand/logo.jpg" alt="Kashere shopping bag logo" />
        <div className="intro__copy">
          <div className="intro__wordmark">KASHERE</div>
          <div className="intro__subtitle"><span />STUDENT MARKETPLACE<span /></div>
        </div>
      </div>
      <button className="intro__skip" type="button" onClick={onFinish} autoFocus>
        Skip
      </button>
    </div>
  )
}
