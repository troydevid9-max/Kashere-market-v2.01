import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, ArrowDown, ArrowUp, ArrowLeftRight, Plus, QrCode, Send, ShieldCheck, Copy, Lock } from 'lucide-react'
import { Modal } from '../components/ui/Modal'
import { Field } from '../components/ui/Field'
import { Button } from '../components/ui/Button'
import { useUser } from '../context/UserContext'
import { useToast } from '../components/ui/Toast'
import { Async } from '../components/ui/State'
import { useApi } from '../hooks/useApi'
import { api } from '../api'
import { completePayment } from '../lib/pay'
import { naira, timeAgo, initials } from '../lib/format'
import './Wallet.css'

const money = (n) => '₦' + Number(n).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const LABEL = { topup: 'Wallet top-up', transfer_in: 'Money received', transfer_out: 'Money sent', sale: 'Sale payout', refund: 'Refund', withdrawal: 'Withdrawal', withdrawal_refund: 'Withdrawal returned' }
const hello = () => { const h = new Date().getHours(); return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening' }

/** Dark metallic coin illustration (BTC, ETH, $) for the top-up card. */
function Coins() {
  const coin = (id, cx, cy, r, rot, glyph, size = 1) => (
    <g transform={`rotate(${rot} ${cx} ${cy})`} filter="url(#cs)">
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} stroke="#8d8d8d" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={r * 0.78} fill="none" stroke="#6a6a6a" strokeWidth="1.5" />
      <circle cx={cx} cy={cy} r={r * 0.78} fill="none" stroke="#1d1d1d" strokeWidth="1" strokeDasharray="1 5" />
      <text x={cx} y={cy + r * 0.3 * size} textAnchor="middle" fontSize={r * 0.95 * size} fontWeight="600" fill="#d9d9d9" fontFamily="var(--font)">{glyph}</text>
    </g>
  )
  return (
    <svg className="wl__coins" viewBox="0 0 280 200" aria-hidden="true">
      <defs>
        <radialGradient id="cg1" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#6d6d6d" /><stop offset=".55" stopColor="#2c2c2c" /><stop offset="1" stopColor="#101010" /></radialGradient>
        <radialGradient id="cg2" cx="35%" cy="30%" r="80%"><stop offset="0" stopColor="#5b5b5b" /><stop offset=".6" stopColor="#242424" /><stop offset="1" stopColor="#0e0e0e" /></radialGradient>
        <filter id="cs" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity=".6" /></filter>
      </defs>
      {coin('cg2', 205, 38, 36, -18, 'Ξ', 0.9)}
      {coin('cg1', 120, 96, 56, 14, '₿')}
      {coin('cg2', 218, 152, 44, -12, '$')}
    </svg>
  )
}

export function WalletPage() {
  const { currentUser } = useUser()
  const q = useApi(currentUser ? '/api/wallet' : null, { interval: 20000 })
  if (!currentUser) {
    return <div className="container"><div className="empty"><Lock size={36} /><h3>Log in to open your wallet</h3><Link to="/login" className="btn btn--primary">Log in</Link></div></div>
  }
  return <Async q={q}>{(d) => <Wallet data={d} reload={q.reload} />}</Async>
}

function Wallet({ data, reload }) {
  const { currentUser, refresh } = useUser()
  const { show } = useToast()
  const navigate = useNavigate()
  const [all, setAll] = useState(false)
  const [mode, setMode] = useState(null)
  const [form, setForm] = useState({ amount: '', matric: '', note: '', bankName: '', accountNumber: '', accountName: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setError('') }

  const close = () => { setMode(null); setForm({ amount: '', matric: '', note: '', bankName: '', accountNumber: '', accountName: '' }); setError('') }
  const open = (m) => () => setMode(m)

  const submit = async (e) => {
    e.preventDefault()
    if (mode === 'receive') return close()
    const n = Number(form.amount)
    if (!Number.isInteger(n) || n < 100) return setError('Enter a whole-naira amount of ₦100 or more.')
    setBusy(true); setError('')
    try {
      if (mode === 'add') {
        const r = await completePayment(await api.post('/api/wallet/topup', { amount: n }))
        if (r === 'settled') show(`${naira(n)} added to your wallet.`)
      } else if (mode === 'send') {
        await api.post('/api/wallet/send', { matric: form.matric.trim(), amount: n, note: form.note.trim() || undefined })
        show(`${naira(n)} sent.`)
      } else {
        await api.post('/api/wallet/withdraw', { amount: n, bankName: form.bankName.trim(), accountNumber: form.accountNumber.trim(), accountName: form.accountName.trim() })
        show('Withdrawal requested. We pay out within 24 hours.')
      }
      close(); await reload(); refresh()
    } catch (err) {
      if (err.code === 'NOT_VERIFIED') { show('Verify your student ID to use your wallet.', 'error'); navigate('/verify') } else setError(err.message)
    } finally { setBusy(false) }
  }

  const copy = async () => {
    try { await navigator.clipboard.writeText(currentUser.matric); show('Matric number copied.') } catch { show('Copy failed. Select and copy manually.', 'error') }
  }

  const titles = { add: 'Add Money', send: 'Send Money', transfer: 'Withdraw to Bank', receive: 'Receive Money' }
  const list = all ? data.transactions : data.transactions.slice(0, 5)

  return (
    <div className="wl">
      <div className="wl__in">
        <div className="wl__top">
          <div><div className="wl__hi">{hello()}</div><div className="wl__name">{currentUser.name.split(' ')[0]}!</div></div>
          <Link to="/profile" className="wl__avatar" aria-label="Your profile">{initials(currentUser.name)}</Link>
        </div>

        <section className="wl__bal" aria-label="Wallet balance">
          <div>
            <span className="wl__lbl">Total balance</span>
            <strong className="wl__amt">{money(data.balance)}</strong>
            {data.monthNet !== 0
              ? <span className="wl__delta" style={data.monthNet < 0 ? { color: 'var(--danger)' } : undefined}>{data.monthNet > 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {naira(Math.abs(data.monthNet))}{data.monthPercent != null ? `(${Math.abs(data.monthPercent)}%)` : ''} this month</span>
              : <span className="muted" style={{ fontSize: 13.5 }}>No activity this month</span>}
            {data.pendingEscrow > 0 && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{naira(data.pendingEscrow)} pending in escrow</div>}
          </div>
          <div className="wl__sel"><div><b>Main wallet</b><small>{currentUser.matric}</small></div><i /><ChevronDown size={16} /></div>
        </section>

        <div className="wl__acts">
          <button onClick={open('send')}><Send size={18} /> Send</button>
          <button onClick={open('receive')}><QrCode size={18} /> Receive</button>
          <button onClick={open('transfer')}><ArrowLeftRight size={18} /> Withdraw</button>
          <button onClick={open('add')}><Plus size={18} /> Add</button>
        </div>

        <section className="wl__promo">
          <h2>Top up &amp; get more from your wallet</h2>
          <button onClick={open('add')}>Add money <ChevronRight size={14} /></button>
          <Coins />
        </section>

        <div className="wl__head"><h2>Activity</h2>{data.transactions.length > 5 && <button onClick={() => setAll((a) => !a)}>{all ? 'Show less' : 'See all'} <ChevronRight size={16} /></button>}</div>
        <div className="wl__list">
          {list.length === 0 && <div className="empty card"><p>No activity yet. Money from sales and top-ups will show up here.</p></div>}
          {list.map((t) => (
            <div key={t.id} className="txn">
              <span className="txn__ico">{t.amount > 0 ? <ArrowDown size={20} /> : <ArrowUp size={20} />}</span>
              <div><b>{LABEL[t.type] || t.type}</b><small>{t.description} · {timeAgo(t.createdAt)}</small></div>
              <div className="txn__amt"><b className={t.amount > 0 ? 'in' : 'out'}>{t.amount > 0 ? '+' : '-'}{naira(Math.abs(t.amount))}</b><small>Balance {naira(t.balanceAfter)}</small></div>
            </div>
          ))}
        </div>
        <div className="wnote"><ShieldCheck size={18} /> Your funds are secure with our escrow system. <ChevronRight size={16} /></div>
      </div>

      <Modal open={!!mode} onClose={close} title={titles[mode] || ''}>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }} noValidate>
          {mode === 'receive' ? (
            <>
              <p className="muted">Share your matric number so other FUKASHERE students can send you money.</p>
              <div style={{ background: 'var(--g-50)', borderRadius: 16, padding: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <b style={{ fontSize: 17 }}>{currentUser.matric}</b>
                <Button type="button" variant="secondary" size="sm" onClick={copy}><Copy size={15} /> Copy</Button>
              </div>
              <Button type="submit" block>Done</Button>
            </>
          ) : (
            <>
              {mode === 'send' && <><Field label="Recipient matric number" placeholder="e.g. FUK/CS/2023/001" value={form.matric} onChange={set('matric')} /><Field label="Note" optional maxLength={80} value={form.note} onChange={set('note')} /></>}
              {mode === 'transfer' && <><Field label="Bank name" placeholder="e.g. GTBank" value={form.bankName} onChange={set('bankName')} /><Field label="Account number" inputMode="numeric" maxLength={10} placeholder="10 digits" value={form.accountNumber} onChange={set('accountNumber')} /><Field label="Account name" value={form.accountName} onChange={set('accountName')} /></>}
              <Field label="Amount (₦)" inputMode="numeric" type="number" min="100" placeholder="e.g. 5000" value={form.amount} onChange={set('amount')} error={error} autoFocus />
              {mode === 'add' && <div className="chipsrow">{[2000, 5000, 10000, 20000].map((n) => <button type="button" key={n} className="chip" onClick={() => setForm((f) => ({ ...f, amount: String(n) }))}>{naira(n)}</button>)}</div>}
              {mode === 'transfer' && <p className="muted" style={{ fontSize: 12.5 }}>Minimum ₦1,000. The money leaves your wallet now and is paid to your bank by an admin within 24 hours. If a payout is rejected it returns here.</p>}
              <Button type="submit" size="lg" block loading={busy}>{mode === 'add' ? 'Add money' : mode === 'send' ? 'Send' : 'Request withdrawal'}</Button>
            </>
          )}
        </form>
      </Modal>
    </div>
  )
}
