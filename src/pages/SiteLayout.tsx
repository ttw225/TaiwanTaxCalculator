import { Outlet, useNavigate } from 'react-router'
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

  function navigateToChecklistEntry() {
    const snapshot = loadSavedChecklistSnapshot()
    const destination = getChecklistEntryPathFromSnapshot(snapshot)
    navigate(destination, {
      state: destination === '/checklist' ? createChecklistNavigationState(snapshot) : undefined,
      preventScrollReset: true,
      flushSync: true,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteHeader
        currentFeatureId="tax-checklist"
        onHome={() => navigate('/', { preventScrollReset: true, flushSync: true })}
        onNavClick={navigateToChecklistEntry}
      />
      <main className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <BackToTopButton />
    </div>
  )
}
