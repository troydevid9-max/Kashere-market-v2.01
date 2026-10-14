import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Bell, ChevronDown, Search, Settings, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { LogoMark } from './ui/Logo'
import { Avatar } from './ui/Avatar'
import { useUser } from '../context/UserContext'
import { useLive } from '../context/LiveContext'
import { useToast } from './ui/Toast'
import './DashShell.css'

/** Sidebar layout shared by the vendor dashboard and the admin panel.
 *  nav items: { label, icon, badge, to, end } for routes, or { label, icon, onSelect, active } for in-page tabs. */
export function DashShell({ nav, children, role = 'Seller', placeholder = 'Search products, orders, or anything…', footerImage = true }) {
  const { currentUser, logout } = useUser()
  const { unreadNotifications } = useLive()
  const { show } = useToast()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const item = (n) => {
    const inner = (<><n.icon size={19} /><span>{n.label}</span>{n.badge ? <em>{n.badge}</em> : null}</>)
    if (n.to) return <NavLink key={n.label} to={n.to} end={n.end} className={({ isActive }) => `dnav ${isActive ? 'is-on' : ''}`} onClick={() => setOpen(false)}>{inner}</NavLink>
    return <button key={n.label} className={`dnav ${n.active ? 'is-on' : ''}`} onClick={() => { n.onSelect(); setOpen(false) }}>{inner}</button>
  }

  return (
    <div className="dash">
      <aside className={`dash__side ${open ? 'is-open' : ''}`}>
        <div className="dash__brand">
          <Link to="/" className="row" style={{ gap: 10, color: '#fff' }} aria-label="Kashere home">
            <LogoMark size={40} />
            <span style={{ lineHeight: 1.1 }}><b style={{ fontSize: 19 }}>Kashere</b><br /><small style={{ opacity: 0.7 }}>Student Marketplace</small></span>
          </Link>
          <button className="dash__close" onClick={() => setOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <nav className="dash__nav" aria-label="Dashboard">{nav.map(item)}</nav>
        <div className="dash__navfoot">
          <button className="dnav" onClick={() => show('Settings are coming soon.', 'error')}><Settings size={19} /><span>Settings</span></button>
          <button className="dnav" onClick={async () => { await logout(); navigate('/login') }}><LogOut size={19} /><span>Log Out</span></button>
          {footerImage && (
            <div className="dash__promo"><b>FUKASHERE</b><span>Buy • Sell • Connect</span><small>Your campus, your marketplace.</small></div>
          )}
        </div>
      </aside>
      {open && <div className="dash__scrim" onClick={() => setOpen(false)} />}
      <div className="dash__main">
        <header className="dash__top">
          <button className="iconbtn dash__burger" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <label className="field__box dash__search">
            <Search size={18} /><input placeholder={placeholder} aria-label="Search" />
          </label>
          <Link to="/notifications" className="iconbtn" aria-label={`Notifications, ${unreadNotifications} unread`}><Bell size={21} />{unreadNotifications > 0 && <span className="iconbtn__n">{unreadNotifications}</span>}</Link>
          <div className="dash__user">
            <Avatar name={currentUser?.name || ''} size={40} />
            <span className="dash__who"><b>{currentUser?.name}</b><small>{role}</small></span>
            <ChevronDown size={16} color="var(--muted)" />
          </div>
        </header>
        <div className="dash__body">{children}</div>
      </div>
    </div>
  )
}
