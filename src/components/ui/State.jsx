import { AlertCircle, Loader2 } from 'lucide-react'

export function Loading({ label = 'Loading…' }) {
  return <div className="empty" role="status"><Loader2 size={28} className="spin" /><p>{label}</p></div>
}
export function ErrorState({ error, retry }) {
  return (
    <div className="empty" role="alert">
      <AlertCircle size={32} />
      <h3>Something went wrong</h3>
      <p>{error?.message || 'Please try again.'}</p>
      {retry && <button className="btn btn--secondary" onClick={retry}>Try again</button>}
    </div>
  )
}
/** Renders loading / error / content for a useApi result. */
export function Async({ q, children, label }) {
  if (q.loading && !q.data) return <Loading label={label} />
  if (q.error && !q.data) return <ErrorState error={q.error} retry={q.reload} />
  return children(q.data)
}
