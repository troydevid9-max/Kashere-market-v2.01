import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const CartContext = createContext(null)
const KEY = 'kashere-cart-v2'

const load = () => { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : [] } catch { return [] } }

/** Cart lives in the browser (a snapshot for display). The server re-checks price and stock at checkout. */
export function CartProvider({ children }) {
  const [items, setItems] = useState(load)
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* private mode: cart just won't persist */ } }, [items])

  const addToCart = useCallback((product, qty = 1) => {
    setItems((cur) => {
      const found = cur.find((i) => i.id === product.id)
      const snap = { id: product.id, title: product.title, price: product.price, image: product.images?.[0] || null, category: product.category, sellerId: product.seller?.id, max: product.quantity }
      if (found) return cur.map((i) => (i.id === product.id ? { ...i, ...snap, quantity: Math.min(20, i.quantity + qty) } : i))
      return [...cur, { ...snap, quantity: Math.min(20, qty) }]
    })
  }, [])
  const updateQuantity = useCallback((id, quantity) => setItems((cur) => (quantity <= 0 ? cur.filter((i) => i.id !== id) : cur.map((i) => (i.id === id ? { ...i, quantity: Math.min(20, quantity) } : i)))), [])
  const removeFromCart = useCallback((id) => setItems((cur) => cur.filter((i) => i.id !== id)), [])
  const clearCart = useCallback(() => setItems([]), [])

  const value = useMemo(() => ({
    items, addToCart, updateQuantity, removeFromCart, clearCart,
    itemCount: items.reduce((s, i) => s + i.quantity, 0),
    getCartTotal: () => items.reduce((s, i) => s + i.price * i.quantity, 0),
    getCartItemsWithProducts: () => items.map((i) => ({ quantity: i.quantity, product: { id: i.id, title: i.title, price: i.price, images: i.image ? [i.image] : [], category: i.category, sellerId: i.sellerId } }))
  }), [items, addToCart, updateQuantity, removeFromCart, clearCart])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
