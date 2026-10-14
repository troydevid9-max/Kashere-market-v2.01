import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'

/** useApi('/api/products') -> { data, error, loading, reload }. Pass null to skip. Re-fetches when the path changes. */
export function useApi(path, { interval } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: !!path })
  const seq = useRef(0)

  const load = useCallback(async (silent = false) => {
    if (!path) return
    const id = ++seq.current
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await api.get(path)
      if (id === seq.current) setState({ data, error: null, loading: false })
    } catch (error) {
      if (id === seq.current) setState((s) => ({ data: silent ? s.data : null, error, loading: false }))
    }
  }, [path])

  // Data loading: starting a fetch when the path changes is exactly what this effect is for.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!interval || !path) return undefined
    const t = setInterval(() => { if (!document.hidden) load(true) }, interval)
    return () => clearInterval(t)
  }, [interval, path, load])

  return { ...state, reload: () => load(true) }
}
