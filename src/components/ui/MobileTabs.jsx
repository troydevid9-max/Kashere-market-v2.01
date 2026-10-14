import { NavLink } from 'react-router-dom'
import { Home, Search, Plus, MessageSquare, User } from 'lucide-react'
import { useLive } from '../../context/LiveContext'
const cls = ({ isActive }) => (isActive ? 'is-on' : '')

export function MobileTabs() {
  const { unreadMessages: unread } = useLive()
  return (
    <nav className="mtabs" aria-label="Primary">
      <NavLink to="/" end className={cls}><Home size={22} />Home</NavLink>
      <NavLink to="/browse" className={cls}><Search size={22} />Browse</NavLink>
      <NavLink to="/sell" className="mtabs__fab" aria-label="Sell an item"><Plus size={22} /></NavLink>
      <NavLink to="/messages" className={cls}>
        <MessageSquare size={22} />Messages
        {unread > 0 && <span className="mtabs__n">{unread}</span>}
      </NavLink>
      <NavLink to="/profile" className={cls}><User size={22} />Profile</NavLink>
    </nav>
  )
}
