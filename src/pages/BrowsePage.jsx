import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SlidersHorizontal, PackageSearch } from 'lucide-react'
import { ProductCard } from '../components/ui/ProductCard'
import { CategoryIcon } from '../components/ui/CategoryIcon'
import { Async } from '../components/ui/State'
import { useApi } from '../hooks/useApi'
import { qs } from '../api'
import { categories } from '../data/categories'
import { naira } from '../lib/format'
import './Browse.css'

export function BrowsePage() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || ''
  const sort = params.get('sort') || 'new'
  const max = params.get('max') || ''
  const urlQ = params.get('q') || ''
  const [text, setText] = useState(urlQ)
  const [limit, setLimit] = useState(24)

  useEffect(() => { setText(urlQ) }, [urlQ])
  // Debounce typing so we don't hit the API on every keystroke.
  useEffect(() => {
    if (text === urlQ) return undefined
    const t = setTimeout(() => set('q', text), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const set = (k, v) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v); else next.delete(k)
    setParams(next, { replace: true }); setLimit(24)
  }
  const result = useApi(`/api/products${qs({ q: urlQ, category, sort, max, limit })}`)

  return (
    <div className="container">
      <div className="bhead"><h1>Browse</h1></div>
      <div className="btools">
        <label className="field__box"><Search size={18} /><input value={text} onChange={(e) => setText(e.target.value)} placeholder="Search listings" aria-label="Search listings" /></label>
        <label className="field__box"><SlidersHorizontal size={18} />
          <select value={sort} onChange={(e) => set('sort', e.target.value)} aria-label="Sort by">
            <option value="new">Newest first</option><option value="popular">Most viewed</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option>
          </select>
        </label>
        <label className="field__box"><span className="glyph">₦</span>
          <select value={max} onChange={(e) => set('max', e.target.value)} aria-label="Maximum price">
            <option value="">Any price</option><option value="5000">Under {naira(5000)}</option><option value="10000">Under {naira(10000)}</option><option value="50000">Under {naira(50000)}</option>
          </select>
        </label>
      </div>
      <div className="chips" role="group" aria-label="Category">
        <button className={`chip ${!category ? 'is-on' : ''}`} onClick={() => set('category', '')} aria-pressed={!category}>All</button>
        {categories.map((c) => (
          <button key={c.id} className={`chip ${category === c.id ? 'is-on' : ''}`} onClick={() => set('category', c.id)} aria-pressed={category === c.id}><CategoryIcon name={c.icon} size={16} />{c.short}</button>
        ))}
      </div>
      <Async q={result}>{(d) => (
        <>
          <p className="bcount" aria-live="polite">{d.total} {d.total === 1 ? 'item' : 'items'}</p>
          {d.items.length ? (
            <>
              <div className="pgrid">{d.items.map((p) => <ProductCard key={p.id} product={p} />)}</div>
              {d.items.length < d.total && <div style={{ textAlign: 'center', marginTop: 22 }}><button className="btn btn--secondary" onClick={() => setLimit((l) => l + 24)}>Show more</button></div>}
            </>
          ) : (
            <div className="empty"><PackageSearch size={40} /><h3>Nothing matches yet</h3><p>Try a different search or clear the filters.</p><button className="btn btn--secondary" onClick={() => setParams({})}>Clear filters</button></div>
          )}
        </>
      )}</Async>
    </div>
  )
}
