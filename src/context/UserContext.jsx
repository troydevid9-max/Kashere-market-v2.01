import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '../api'

const UserContext = createContext(null)

const normalize = (u) => (u ? { ...u, isVerified: u.verificationStatus === 'approved' } : null)

export function UserProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try { setUser(normalize((await api.get('/api/auth/me')).user)) } catch { setUser(null) } finally { setLoading(false) }
  }, [])
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { refresh() }, [refresh])

  const login = useCallback(async (identifier, password) => {
    try { const r = await api.post('/api/auth/login', { identifier, password }); const u = normalize(r.user); setUser(u); return { success: true, user: u } }
    catch (e) { return { success: false, error: e.message } }
  }, [])
  const signup = useCallback(async (data) => {
    try { const r = await api.post('/api/auth/signup', data); const u = normalize(r.user); setUser(u); return { success: true, user: u } }
    catch (e) { return { success: false, error: e.message } }
  }, [])
  const logout = useCallback(async () => { try { await api.post('/api/auth/logout') } catch { /* already signed out */ } setUser(null) }, [])

  const value = useMemo(() => ({ currentUser: user, loading, login, signup, logout, refresh }), [user, loading, login, signup, logout, refresh])
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUser() {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error('useUser must be used inside UserProvider')
  return ctx
}
