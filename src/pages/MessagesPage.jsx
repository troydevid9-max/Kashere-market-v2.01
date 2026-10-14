import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Send, MessageSquare, Lock } from 'lucide-react'
import { Avatar } from '../components/ui/Avatar'
import { Async } from '../components/ui/State'
import { useApi } from '../hooks/useApi'
import { useUser } from '../context/UserContext'
import { useLive } from '../context/LiveContext'
import { useToast } from '../components/ui/Toast'
import { api } from '../api'
import { timeAgo } from '../lib/format'
import './Browse.css'

function Thread({ id, onBack }) {
  const q = useApi(`/api/conversations/${id}`, { interval: 6000 })
  const { refreshCounts } = useLive()
  const { show } = useToast()
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const end = useRef(null)
  const count = q.data?.messages.length
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [count])
  useEffect(() => { refreshCounts() }, [id, count, refreshCounts])

  const send = async (e) => {
    e.preventDefault()
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    try { await api.post(`/api/conversations/${id}/messages`, { body }); setDraft(''); await q.reload() }
    catch (err) { show(err.message, 'error') } finally { setSending(false) }
  }

  return (
    <section className="thread" aria-label="Conversation">
      <div className="thread__head">
        <button className="iconbtn" onClick={onBack} aria-label="Back to conversations" style={{ display: 'grid' }}><ArrowLeft size={20} /></button>
        {q.data && <><Avatar name={q.data.other.name} size={38} /><Link to={`/store/${q.data.other.id}`}><b>{q.data.other.name}</b></Link></>}
      </div>
      <div className="thread__body">
        <Async q={q}>{(d) => (d.messages.length ? d.messages.map((m) => <div key={m.id} className={`bub ${m.mine ? 'bub--me' : ''}`}>{m.body}</div>) : <p className="muted" style={{ textAlign: 'center' }}>Say hello.</p>)}</Async>
        <div ref={end} />
      </div>
      <form className="thread__send" onSubmit={send}>
        <label className="field__box"><input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a message" aria-label="Message" maxLength={1000} /></label>
        <button className="btn btn--primary" style={{ width: 46, padding: 0 }} aria-label="Send" disabled={sending || !draft.trim()}><Send size={18} /></button>
      </form>
    </section>
  )
}

export function MessagesPage() {
  const { currentUser } = useUser()
  const [params, setParams] = useSearchParams()
  const active = params.get('c')
  const list = useApi(currentUser ? '/api/conversations' : null, { interval: 10000 })

  if (!currentUser) return <div className="container"><div className="empty"><Lock size={36} /><h3>Log in to see your messages</h3><Link to="/login" className="btn btn--primary">Log in</Link></div></div>

  return (
    <div className="container" style={{ padding: 0 }}>
      <div className="msgs">
        <ul className={`msgs__list ${active ? 'hide-m' : ''}`} aria-label="Conversations">
          <li style={{ padding: '18px 16px 8px' }}><h1 style={{ fontSize: 24 }}>Messages</h1></li>
          <Async q={list}>{(d) => (d.items.length ? d.items.map((c) => (
            <li key={c.id}><button className={active === c.id ? 'is-on' : ''} onClick={() => setParams({ c: c.id })}>
              <Avatar name={c.other.name} size={44} />
              <div><b>{c.other.name}</b><small>{c.lastMessage}</small></div>
              <span className="t">{timeAgo(c.lastAt)}{c.unread > 0 && <span className="n">{c.unread}</span>}</span>
            </button></li>
          )) : <li><div className="empty"><MessageSquare size={32} /><p>No conversations yet. Message a seller from any listing.</p></div></li>)}</Async>
        </ul>
        {active ? <Thread key={active} id={active} onBack={() => setParams({})} /> : (
          <section className="thread hide-m" style={{ placeItems: 'center', display: 'grid', color: 'var(--muted)' }}><div className="empty"><MessageSquare size={36} /><p>Select a conversation</p></div></section>
        )}
      </div>
    </div>
  )
}
