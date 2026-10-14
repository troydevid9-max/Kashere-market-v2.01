import { Link, useNavigate } from 'react-router-dom'
import { Heart, BadgeCheck, Star } from 'lucide-react'
import { ProductImage } from './ProductImage'
import { useLive } from '../../context/LiveContext'
import { useUser } from '../../context/UserContext'
import { useToast } from './Toast'
import { conditionOptions } from '../../data/options'
import { naira } from '../../lib/format'

export function ProductCard({ product }) {
  const { favorites, toggleFavorite } = useLive()
  const { currentUser } = useUser()
  const { show } = useToast()
  const navigate = useNavigate()
  const fav = favorites.has(product.id)
  const seller = product.seller
  const cond = conditionOptions.find((c) => c.value === product.condition)?.label

  const onFav = async () => {
    if (!currentUser) { show('Log in to save items.', 'error'); navigate('/login'); return }
    try { await toggleFavorite(product.id) } catch (e) { show(e.message, 'error') }
  }

  return (
    <article className="pcard">
      <Link to={`/product/${product.id}`} className="pcard__media" aria-label={product.title}>
        <ProductImage src={product.images[0]} category={product.category} alt={product.title} />
        {cond && <span className="pcard__tag badge">{cond}</span>}
      </Link>
      <button type="button" className={`pcard__fav ${fav ? 'is-on' : ''}`} aria-pressed={fav} aria-label={fav ? 'Remove from saved' : 'Save item'} onClick={onFav}>
        <Heart size={15} />
      </button>
      <div className="pcard__body">
        <Link to={`/product/${product.id}`} className="pcard__title">{product.title}</Link>
        <div className="pcard__meta">
          <span>{seller?.name}</span>
          {seller?.isVendor && <BadgeCheck size={14} color="var(--g-700)" aria-label="Verified vendor" />}
          {seller?.rating > 0 && (
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 2, overflow: 'visible' }}>
              <Star size={12} fill="currentColor" /> {seller.rating}
            </span>
          )}
        </div>
        <div className="pcard__price">{naira(product.price)}</div>
      </div>
    </article>
  )
}
