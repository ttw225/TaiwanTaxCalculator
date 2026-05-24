import { Outlet, useLocation, useNavigate } from 'react-router'
import { SiteHeader } from '../components/SiteHeader'
import { SiteFooter } from '../components/SiteFooter'
import { BackToTopButton } from '../components/BackToTopButton'
import {
  createChecklistNavigationState,
  getChecklistEntryPathFromSnapshot,
  loadSavedChecklistSnapshot,
} from '../lib/checklistSnapshot'

/**
 * Chrome wrapper for content routes (about / methodology / deductions / 404).
 * Checklist workflow routes render their own chrome because they need local
 * flow callbacks.
 */
export default function SiteLayout() {
  const navigate = useNavigate()
  const location = useLocation()

  function navigateToChecklistEntry() {
    const snapshot = loadSavedChecklistSnapshot()
    const destination = getChecklistEntryPathFromSnapshot(snapshot)
    navigate(destination, {
      state: destination === '/checklist' ? createChecklistNavigationState(snapshot) : undefined,
      preventScrollReset: true,
      flushSync: true,
    })
  }

  function handleNavClick(id: string) {
    if (id === 'payment-rewards') {
      navigate('/payment-rewards', { preventScrollReset: true, flushSync: true })
      window.scrollTo(0, 0)
      return
    }
    navigateToChecklistEntry()
  }

  const currentFeatureId = location.pathname.startsWith('/payment-rewards')
    ? 'payment-rewards'
    : 'tax-checklist'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteHeader
        currentFeatureId={currentFeatureId}
        onHome={() => navigate('/', { preventScrollReset: true, flushSync: true })}
        onNavClick={handleNavClick}
      />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <BackToTopButton />
    </div>
  )
}
