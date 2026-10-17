import { getCategory } from '../../data/categories'
import { CategoryIcon } from './CategoryIcon'

/** Real photo -> a plain `.photo` box (no decoration). No photo -> a tinted category tile so the UI never shows a broken image. */
export function ProductImage({ src, category, alt = '', ratio }) {
  const real = src && !String(src).startsWith('local:')
  if (real) {
    return (
      <div className="photo" style={ratio ? { aspectRatio: ratio } : undefined}>
        <img src={src} alt={alt} loading="lazy" decoding="async" />
      </div>
    )
  }
  const cat = getCategory(category)
  return (
    <div className="pimg" style={{ '--tint': cat.tint, '--ink': cat.ink, aspectRatio: ratio }}>
      <CategoryIcon name={cat.icon} strokeWidth={1.5} aria-label={alt || cat.name} role="img" />
    </div>
  )
}
