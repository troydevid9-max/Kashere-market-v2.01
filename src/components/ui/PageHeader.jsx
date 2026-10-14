import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { LogoMark } from './Logo'

/** Green header band used by Add Product, Checkout and Wallet. `brand` swaps the title for the Kashere logo lockup (Add Product design). */
export function PageHeader({ title, subtitle, brand, end, fallback = '/' }) {
  const navigate = useNavigate()
  const back = () => (window.history.length > 1 ? navigate(-1) : navigate(fallback))
  return (
    <div className="gband">
      <div className="container gband__in">
        <button className="gband__back" onClick={back} aria-label="Go back"><ArrowLeft size={24} /></button>
        {brand ? (
          <div className="row" style={{ gap: 12 }}>
            <LogoMark size={40} />
            <div>
              <h1>Kashere</h1>
              <p>Student Marketplace</p>
            </div>
          </div>
        ) : (
          <div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
          </div>
        )}
        <div className="gband__end">{end ?? <ShieldCheck size={26} aria-label="Protected by escrow" />}</div>
      </div>
    </div>
  )
}
