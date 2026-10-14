import { Star } from 'lucide-react'

export function StarRating({ value = 0, size = 14 }) {
  return (
    <span className="stars" role="img" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={n <= Math.round(value) ? '' : 'off'} />
      ))}
    </span>
  )
}
