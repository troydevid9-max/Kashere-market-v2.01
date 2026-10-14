import { Link } from 'react-router-dom'
import { Heart, Lock } from 'lucide-react'
import { ProductCard } from '../components/ui/ProductCard'
import { Async } from '../components/ui/State'
import { useApi } from '../hooks/useApi'
import { useUser } from '../context/UserContext'
import { useLive } from '../context/LiveContext'

export function SavedPage() {
  const { currentUser } = useUser()
  const { favorites } = useLive()
  const q = useApi(currentUser ? '/api/favorites' : null)
  if (!currentUser) return <div className="container"><div className="empty"><Lock size={36} /><h3>Log in to see saved items</h3><Link to="/login" className="btn btn--primary">Log in</Link></div></div>
  return (
    <div className="container" style={{ paddingTop: 20 }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 14 }}>Saved items</h1>
      <Async q={q}>{(d) => {
        const items = d.items.filter((p) => favorites.has(p.id))
        return items.length ? <div className="pgrid">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
          : <div className="empty"><Heart size={36} /><h3>Nothing saved yet</h3><p>Tap the heart on any item to keep it here.</p><Link to="/browse" className="btn btn--primary">Browse items</Link></div>
      }}</Async>
    </div>
  )
}
