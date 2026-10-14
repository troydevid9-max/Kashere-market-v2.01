import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, MessageSquare, Bell, User, LayoutDashboard, Wallet, LogOut, Shield, Star, Package, Heart, BadgeCheck } from 'lucide-react'
import { Logo } from './Logo'
import { Avatar } from './Avatar'
import { useUser } from '../../context/UserContext'
import { useCart } from '../../context/CartContext'
import { useLive } from '../../context/LiveContext'

export function Navbar({ desktopOnly = false }) {
  const { currentUser, logout } = useUser()
  const { itemCount } = useCart()
  const { unreadMessages, unreadNotifications } = useLive()
  const navigate = useNavigate()
  const [menu, setMenu] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setMenu(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const submit = (e) => {
    e.preventDefault()
    navigate(`/browse${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }
  const link = ({ isActive }) => (isActive ? 'is-on' : '')

  return (
    <div className={desktopOnly ? 'nav--desk' : ''}>
      <div className="announce"><b>Escrow-protected payments</b> · Verified FUKASHERE students only</div>
      <header className="nav">
        <div className="container nav__in">
          <Logo />
          <nav className="nav__links" aria-label="Main">
            <NavLink to="/" end className={link}>Home</NavLink>
            <NavLink to="/browse" className={link}>Browse</NavLink>
            <NavLink to="/sell" className={link}>Sell</NavLink>
          </nav>
          <form className="nav__search" onSubmit={submit} role="search">
            <label className="field__box grow">
              <Search size={18} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search books, shoes, food, services…" aria-label="Search" />
            </label>
          </form>
          <div className="nav__icons">
            <Link to="/browse" className="iconbtn nav__mobile-search" aria-label="Search"><Search size={21} /></Link>
            {currentUser && (
              <Link to="/notifications" className="iconbtn" aria-label={`Notifications, ${unreadNotifications} unread`}>
                <Bell size={21} />{unreadNotifications > 0 && <span className="iconbtn__n">{unreadNotifications > 9 ? '9+' : unreadNotifications}</span>}
              </Link>
            )}
            <Link to="/messages" className="iconbtn nav__msg" aria-label={`Messages, ${unreadMessages} unread`}>
              <MessageSquare size={21} />{unreadMessages > 0 && <span className="iconbtn__n">{unreadMessages}</span>}
            </Link>
            <Link to="/cart" className="iconbtn" aria-label={`Cart, ${itemCount} items`}>
              <ShoppingCart size={21} />{itemCount > 0 && <span className="iconbtn__n">{itemCount}</span>}
            </Link>
            {currentUser ? (
              <div style={{ position: 'relative' }} ref={ref}>
                <button className="iconbtn" onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} aria-label="Account menu">
                  <Avatar name={currentUser.name} size={34} verified={currentUser.isVendor} />
                </button>
                {menu && (
                  <div className="nav__menu" role="menu" onClick={() => setMenu(false)}>
                    <Link to="/profile"><User size={17} /> My profile</Link>
                    <Link to="/orders"><Package size={17} /> My orders</Link>
                    <Link to="/saved"><Heart size={17} /> Saved items</Link>
                    {(currentUser.isVendor || currentUser.accountType === 'vendor') && <Link to="/dashboard"><LayoutDashboard size={17} /> Vendor dashboard</Link>}
                    <Link to="/wallet"><Wallet size={17} /> Wallet</Link>
                    {!currentUser.isVerified && <Link to="/verify"><BadgeCheck size={17} /> Verify student ID</Link>}
                    <Link to="/reviews"><Star size={17} /> Reviews &amp; complaints</Link>
                    {currentUser.isAdmin && <Link to="/admin"><Shield size={17} /> Admin</Link>}
                    <hr />
                    <button onClick={async () => { await logout(); navigate('/login') }}><LogOut size={17} /> Log out</button>
                  </div>
                )}
              </div>
            ) : (
              <div className="nav__auth">
                <Link to="/login" className="btn btn--ghost btn--sm">Log in</Link>
                <Link to="/signup" className="btn btn--primary btn--sm">Sign up</Link>
              </div>
            )}
          </div>
        </div>
      </header>
    </div>
  )
}
