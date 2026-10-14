import { getCategory } from '../../data/categories'
import { CategoryIcon } from './CategoryIcon'

/** Real photo if one exists; otherwise a tinted category tile so the UI never shows a broken image. */
export function ProductImage({ src, category, alt = '', ratio }) {
  const cat = getCategory(category)
  const real = src && !String(src).startsWith('local:')
  return (
    <div className="pimg" style={{ '--tint': cat.tint, '--ink': cat.ink, aspectRatio: ratio }}>
      {real ? <img src={src} alt={alt} loading="lazy" /> : <CategoryIcon name={cat.icon} strokeWidth={1.5} aria-label={alt || cat.name} role="img" />}
    </div>
  )
}
