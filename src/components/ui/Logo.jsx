import { Link } from 'react-router-dom'

/* ---------------------------------------------------------------
   LOGO FILE: public/brand/logo.jpg  (square image with the bag icon
   centred in the upper half, like your current logo).
   If you use another file name/type, change LOGO_SRC below.
   LogoMark shows only the bag icon cropped from that image; the
   "Kashere / Student Marketplace" text beside it is live text.
---------------------------------------------------------------- */
// eslint-disable-next-line react-refresh/only-export-components
export const LOGO_SRC = '/brand/logo.jpg'

export function LogoMark({ size = 40 }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block', flex: 'none', width: size, height: size, borderRadius: size * 0.22, // Layer 1: your logo (cropped to the bag icon). Layer 2: the placeholder, which shows only if your file is missing.
        backgroundColor: '#fff', backgroundImage: `url(${LOGO_SRC}), url(/brand/logo.svg)`, backgroundRepeat: 'no-repeat',
        backgroundSize: '217%, cover', backgroundPosition: '50% 20%, center'
      }}
    />
  )
}

export function Logo({ to = '/', light = false, size = 40, stacked = true }) {
  const color = light ? '#fff' : 'var(--g-900)'
  return (
    <Link to={to} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, color }} aria-label="Kashere Student Marketplace home">
      <LogoMark size={size} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span style={{ fontWeight: 800, fontSize: size * 0.5, letterSpacing: '-0.02em' }}>Kashere</span>
        {stacked && <span className="logo__sub" style={{ fontSize: size * 0.3, opacity: 0.75, fontWeight: 500 }}>Student Marketplace</span>}
      </span>
    </Link>
  )
}
