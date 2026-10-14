import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { api } from '../api'
import { useUser } from './UserContext'

const LiveContext = createContext({ unreadNotifications: 0, unreadMessages: 0, favorites: new Set(), toggleFavorite: async () => {}, refreshCounts: () => {} })

/** Unread counts (polled) and the signed-in user's saved items. */
export function LiveProvider({ children }) {
  const { currentUser } = useUser()
  const [counts, setCounts] = useState({ n: 0, m: 0 })
  const [favorites, setFavorites] = useState(() => new Set())
  const uid = currentUser?.id

  const refreshCounts = useCallback(async () => {
    if (!uid) return
    try {
      const [n, m] = await Promise.all([api.get('/api/notifications/count'), api.get('/api/conversations')])
      setCounts({ n: n.unread, m: m.unread })
    } catch { /* offline: keep old numbers */ }
  }, [uid])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!uid) { setCounts({ n: 0, m: 0 }); setFavorites(new Set()); return undefined }
    refreshCounts()
    api.get('/api/favorites/ids').then((r) => setFavorites(new Set(r.ids))).catch(() => {})
    const t = setInterval(() => { if (!document.hidden) refreshCounts() }, 30000)
    return () => clearInterval(t)
  }, [uid, refreshCounts])

  const toggleFavorite = useCallback(async (id) => {
    const had = favorites.has(id)
    setFavorites((s) => { const n = new Set(s); if (had) n.delete(id); else n.add(id); return n }) // optimistic
    try { await (had ? api.del(`/api/favorites/${id}`) : api.put(`/api/favorites/${id}`)) }
    catch (e) { setFavorites((s) => { const n = new Set(s); if (had) n.add(id); else n.delete(id); return n }); throw e }
  }, [favorites])

  const value = useMemo(() => ({ unreadNotifications: counts.n, unreadMessages: counts.m, favorites, toggleFavorite, refreshCounts }), [counts, favorites, toggleFavorite, refreshCounts])
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLive() { return useContext(LiveContext) }
