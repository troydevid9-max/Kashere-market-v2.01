import { Link } from 'react-router-dom'
import { BadgeCheck, ShieldCheck, Camera, Headphones, Wallet, Hourglass, Check, Plus } from 'lucide-react'
import { ProductCard } from '../components/ui/ProductCard'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { Async } from '../components/ui/State'
import { useApi } from '../hooks/useApi'
import { categories } from '../data/categories'
import { naira } from '../lib/format'
import './Home.css'

const TRUST = [
  { I: BadgeCheck, t: 'Verified students', s: 'ID-checked accounts only' },
  { I: ShieldCheck, t: 'Escrow payments', s: 'Held until you confirm' },
  { I: Camera, t: 'Photo confirmation', s: 'Proof before sellers are paid' },
  { I: Headphones, t: 'Dispute help', s: 'Report a problem anytime' }
]

export function HomePage() {
  const trending = useApi('/api/products?sort=popular&limit=10')
  const cheap = useApi('/api/products?max=10000&sort=popular&limit=5')

  return (
    <div className="container">
      <section className="hero" aria-labelledby="hero-title">
        <div>
          <h1 id="hero-title">Pay safely. Get what you ordered.</h1>
          <p className="lead">Kashere holds your money in escrow until you confirm the item arrived. No more paying a stranger on WhatsApp and hoping.</p>
          <div className="hero__cta">
            <Link to="/browse" className="btn btn--light btn--lg">Browse items</Link>
            <Link to="/sell" className="btn btn--ghost btn--lg">Start selling</Link>
          </div>
        </div>
        <div className="hero__panel">
          <h2><ShieldCheck size={18} /> How escrow protects you</h2>
          <ol className="flow">
            <li><span className="flow__ico"><Wallet size={19} /></span><div><b>You pay Kashere</b><span>Not the seller directly</span></div></li>
            <li><span className="flow__ico"><Hourglass size={19} /></span><div><b>Money is held safely</b><span>The seller delivers your item</span></div></li>
            <li><span className="flow__ico"><Camera size={19} /></span><div><b>You confirm with a photo</b><span>Show it arrived as described</span></div></li>
            <li><span className="flow__ico"><Check size={19} /></span><div><b>Seller gets paid</b><span>Only after your confirmation</span></div></li>
          </ol>
        </div>
      </section>

      <section className="trust" aria-label="Why Kashere">
        {TRUST.map(({ I, t, s }) => <div className="trust__i" key={t}><I size={24} /><div><b>{t}</b><small>{s}</small></div></div>)}
      </section>

      <section className="sec">
        <div className="sec__head"><h2>Shop by category</h2><Link to="/browse">View all</Link></div>
        <div className="cats">
          {categories.map((c) => (
            <Link key={c.id} to={`/browse?category=${c.id}`} className="cat">
              <span className="cat__c" style={{ '--tint': c.tint, '--ink': c.ink }}><CategoryIcon name={c.icon} size={25} strokeWidth={1.7} /></span>
              {c.short}
            </Link>
          ))}
        </div>
      </section>

      <section className="promos" aria-label="Offers">
        <div className="promo promo--dark">
          <div><small>Launch offer · first 100 vendors</small><h3>Get your Verified Vendor badge</h3><p className="promo__big" style={{ marginTop: 10 }}>{naira(3500)}</p><p>plus 1 month of free boosting</p></div>
          <Link to="/signup?type=vendor" className="btn btn--sm">Become a vendor</Link>
        </div>
        <div className="promo promo--sand">
          <div><small>New today</small><h3>Fresh listings from your campus</h3></div>
          <Link to="/browse?sort=new" className="btn btn--secondary btn--sm">See what&apos;s new</Link>
        </div>
        <div className="promo promo--mint">
          <div><small>Have something to sell?</small><h3>List it in two minutes</h3></div>
          <Link to="/sell" className="btn btn--secondary btn--sm"><Plus size={16} /> Add product</Link>
        </div>
      </section>

      <section className="sec">
        <div className="sec__head"><h2>Trending on campus</h2><Link to="/browse">View all</Link></div>
        <Async q={trending}>{(d) => (d.items.length ? <div className="pgrid">{d.items.map((p) => <ProductCard key={p.id} product={p} />)}</div> : <div className="empty"><h3>No listings yet</h3><Link to="/sell" className="btn btn--primary">Be the first to sell</Link></div>)}</Async>
      </section>

      {cheap.data?.items.length > 0 && (
        <section className="sec">
          <div className="sec__head"><h2>Under {naira(10000)}</h2><Link to="/browse?max=10000">View all</Link></div>
          <div className="pgrid">{cheap.data.items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </div>
  )
}
