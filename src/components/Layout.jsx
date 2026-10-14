import { Navbar } from './ui/Navbar'
import { Footer } from './ui/Footer'
import { MobileTabs } from './ui/MobileTabs'
import { InstallPrompt } from './InstallPrompt'

/** Public shell. `deskNavOnly` hides the top bar on phones for pages that bring their own header. */
export function Shell({ children, deskNavOnly = false, footer = true }) {
  return (
    <>
      <InstallPrompt />
      <Navbar desktopOnly={deskNavOnly} />
      <main className="has-tabs" style={{ flex: 1 }}>{children}</main>
      {footer && <Footer />}
      <MobileTabs />
    </>
  )
}
