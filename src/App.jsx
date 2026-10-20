import { useCallback, useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Shell } from './components/Layout'
import { IntroOverlay } from './components/IntroOverlay'
import { useUser } from './context/UserContext'
import { markIntroPlayed, shouldPlayIntro } from './lib/intro'
import { HomePage } from './pages/HomePage'
import { BrowsePage } from './pages/BrowsePage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { SellPage } from './pages/SellPage'
import { LoginPage, SignupPage } from './pages/AuthPage'
import { ProfilePage } from './pages/ProfilePage'
import { CartPage } from './pages/CartPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { PaymentReturnPage } from './pages/PaymentReturnPage'
import { WalletPage } from './pages/WalletPage'
import { MessagesPage } from './pages/MessagesPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { ReviewsPage } from './pages/ReviewsPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { StorePage } from './pages/StorePage'
import { SavedPage } from './pages/SavedPage'
import { VerifyPage } from './pages/VerifyPage'
import { AdminPage } from './pages/AdminPage'
import { DashboardLayout, DashHome, DashProducts, DashOrders, DashVerification } from './pages/DashboardPage'

function NotFound() {
  return <div className="container"><div className="empty"><h3>Page not found</h3><p>The page you are looking for does not exist.</p><a className="btn btn--primary" href="/">Go home</a></div></div>
}

export default function App() {
  const { loading } = useUser()
  const [introVisible, setIntroVisible] = useState(() => shouldPlayIntro(
    window.sessionStorage,
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ))
  const finishIntro = useCallback(() => {
    markIntroPlayed(window.sessionStorage)
    setIntroVisible(false)
  }, [])

  return (
    <>
      <div inert={introVisible} aria-hidden={introVisible}>
        {loading ? (
          <div className="empty" style={{ minHeight: '100vh', justifyContent: 'center' }} role="status">
            <Loader2 size={28} className="spin" />
          </div>
        ) : (
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/auth" element={<Navigate to="/login" replace />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<DashHome />} />
              <Route path="products" element={<DashProducts />} />
              <Route path="orders" element={<DashOrders />} />
              <Route path="verification" element={<DashVerification />} />
            </Route>

            <Route path="/sell" element={<Shell deskNavOnly footer={false}><SellPage /></Shell>} />
            <Route path="/wallet" element={<Shell deskNavOnly footer={false}><WalletPage /></Shell>} />
            <Route path="/checkout" element={<Shell><CheckoutPage /></Shell>} />
            <Route path="/payment/return" element={<Shell><PaymentReturnPage /></Shell>} />

            <Route path="/" element={<Shell><HomePage /></Shell>} />
            <Route path="/browse" element={<Shell><BrowsePage /></Shell>} />
            <Route path="/categories" element={<Navigate to="/browse" replace />} />
            <Route path="/product/:id" element={<Shell><ProductDetailPage /></Shell>} />
            <Route path="/store/:id" element={<Shell><StorePage /></Shell>} />
            <Route path="/cart" element={<Shell><CartPage /></Shell>} />
            <Route path="/orders" element={<Shell><OrdersPage /></Shell>} />
            <Route path="/orders/:id" element={<Shell><OrderDetailPage /></Shell>} />
            <Route path="/saved" element={<Shell><SavedPage /></Shell>} />
            <Route path="/messages" element={<Shell footer={false}><MessagesPage /></Shell>} />
            <Route path="/notifications" element={<Shell><NotificationsPage /></Shell>} />
            <Route path="/verify" element={<Shell><VerifyPage /></Shell>} />
            <Route path="/profile" element={<Shell><ProfilePage /></Shell>} />
            <Route path="/reviews" element={<Shell><ReviewsPage /></Shell>} />
            <Route path="*" element={<Shell><NotFound /></Shell>} />
          </Routes>
        )}
      </div>
      {introVisible && <IntroOverlay onFinish={finishIntro} />}
    </>
  )
}
