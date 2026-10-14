import { Link, useNavigate } from 'react-router-dom'
import { Bell, Lock, CheckCheck } from 'lucide-react'
import { Async } from '../components/ui/State'
import { Button } from '../components/ui/Button'
import { useApi } from '../hooks/useApi'
import { useUser } from '../context/UserContext'
import { useLive } from '../context/LiveContext'
import { api } from '../api'
import { timeAgo } from '../lib/format'
import './Notifications.css'

export function NotificationsPage() {
  const { currentUser } = useUser()
  const { refreshCounts } = useLive()
  const navigate = useNavigate()
  const q = useApi(currentUser ? '/api/notifications' : null, { interval: 30000 })
  if (!currentUser) return <div className="container"><div className="empty"><Lock size={36} /><h3>Log in to see notifications</h3><Link to="/login" className="btn btn--primary">Log in</Link></div></div>

  const open = async (n) => {
    if (!n.read) { try { await api.post('/api/notifications/read', { ids: [n.id] }); refreshCounts() } catch { /* not critical */ } }
    if (n.link) navigate(n.link)
  }
  const readAll = async () => { await api.post('/api/notifications/read', {}); await q.reload(); refreshCounts() }

  return (
    <div className="container" style={{ maxWidth: 720, paddingTop: 20 }}>
      <div className="pagehead" style={{ marginBottom: 12 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800 }}>Notifications</h1>
        {q.data?.unread > 0 && <Button variant="secondary" size="sm" onClick={readAll}><CheckCheck size={16} /> Mark all read</Button>}
      </div>
      <Async q={q}>{(d) => (d.items.length ? (
        <ul className="notes">{d.items.map((n) => (
          <li key={n.id}><button className={`note ${n.read ? '' : 'is-new'}`} onClick={() => open(n)}>
            <span className="note__dot" aria-hidden="true" /><div className="grow"><b>{n.title}</b>{n.body && <p>{n.body}</p>}</div><small>{timeAgo(n.createdAt)}</small>
          </button></li>
        ))}</ul>
      ) : <div className="empty"><Bell size={36} /><h3>You&apos;re all caught up</h3><p>Order updates and payments will show up here.</p></div>)}</Async>
    </div>
  )
}
