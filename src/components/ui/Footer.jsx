import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__brand">
            <Logo light />
            <p style={{ marginTop: 14 }}>The student-only marketplace for Federal University of Kashere. Every payment is held in escrow until you confirm your item arrived.</p>
          </div>
          <div>
            <h4>Marketplace</h4>
            <ul>
              <li><Link to="/browse">Browse items</Link></li>
              <li><Link to="/sell">Sell an item</Link></li>
              <li><Link to="/cart">Cart</Link></li>
            </ul>
          </div>
          <div>
            <h4>Vendors</h4>
            <ul>
              <li><Link to="/signup?type=vendor">Become a vendor</Link></li>
              <li><Link to="/dashboard">Vendor dashboard</Link></li>
              <li><Link to="/wallet">Wallet</Link></li>
            </ul>
          </div>
          <div>
            <h4>Help</h4>
            <ul>
              <li><Link to="/reviews?tab=complaints">File a complaint</Link></li>
              <li><Link to="/reviews">Reviews</Link></li>
              <li><Link to="/login">Log in</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer__bar">
          <span>© 2026 Kashere Student Marketplace</span>
          <span>Made for FUKASHERE students</span>
        </div>
      </div>
    </footer>
  )
}
