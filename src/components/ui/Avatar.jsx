import { BadgeCheck } from 'lucide-react'

export function Avatar({ name = '', size = 40, verified }) {
  const initials = name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <span className="avatar" style={{ '--s': `${size}px` }} aria-hidden="true">
      {initials}
      {verified && <span className="avatar__v"><BadgeCheck size={size * 0.28} strokeWidth={3} /></span>}
    </span>
  )
}
