import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { NAV_ITEMS, SITE_CONFIG } from '../lib/siteConfig'
import { getDeployInfo } from '../lib/deployInfo'
import { ComingSoonNavItem } from './ComingSoonNavItem'
import { DeployBadge } from './DeployBadge'

interface Props {
  currentFeatureId: string
  onHome?: () => void
  onNavClick?: (id: string) => void
}

export function SiteHeader({ currentFeatureId, onHome, onNavClick }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const deployInfo = getDeployInfo()
  const taxYearBadgeLabel = `${SITE_CONFIG.taxYear} 年度`

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // Lock background scroll while mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  return (
    <>
    {menuOpen && (
      <div
        className="md:hidden fixed inset-0 z-40 bg-black/30"
        aria-hidden="true"
        onClick={() => setMenuOpen(false)}
      />
    )}
    {/* position: sticky — no layout offset, unlike fixed */}
    <header className="sticky top-0 z-50 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-2">

        {/* Logo — left-aligned on all viewports (Task 1.2) */}
        {onHome ? (
          <button
            type="button"
            onClick={onHome}
            data-padding="custom"
            className="inline-flex min-w-0 items-center gap-2 rounded p-0 text-left sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <div className="flex min-w-0 flex-col items-start leading-tight">
              <span className="truncate font-semibold text-gray-900 text-lg tracking-tight">
                {SITE_CONFIG.name}
              </span>
              <span className="hidden text-sm text-gray-400 sm:block">
                {SITE_CONFIG.nameEn}
              </span>
            </div>
            <span className="shrink-0 whitespace-nowrap rounded-full border border-current bg-transparent px-2 py-0.5 text-sm font-medium text-gray-600">
              {taxYearBadgeLabel}
            </span>
            {deployInfo && <DeployBadge deployInfo={deployInfo} />}
          </button>
        ) : (
          <div className="inline-flex min-w-0 items-center gap-2 sm:gap-3">
            <div className="flex min-w-0 flex-col items-start leading-tight">
              <span className="truncate font-semibold text-gray-900 text-lg tracking-tight">
                {SITE_CONFIG.name}
              </span>
              <span className="hidden text-sm text-gray-400 sm:block">
                {SITE_CONFIG.nameEn}
              </span>
            </div>
            <span className="shrink-0 whitespace-nowrap rounded-full border border-current bg-transparent px-2 py-0.5 text-sm font-medium text-gray-600">
              {taxYearBadgeLabel}
            </span>
            {deployInfo && <DeployBadge deployInfo={deployInfo} />}
          </div>
        )}

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6" aria-label="主導覽">
          {NAV_ITEMS.map((item) =>
            item.status === 'active' ? (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavClick?.(item.id)}
                className={`text-base font-normal transition-colors ${
                  currentFeatureId === item.id
                    ? 'text-gray-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            ) : (
              <ComingSoonNavItem key={item.id} item={item} />
            )
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          type="button"
          className="md:hidden p-2 -mr-2 text-gray-600 hover:text-gray-900 rounded-md"
          aria-label={menuOpen ? '關閉選單' : '開啟選單'}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="md:hidden absolute top-full left-0 right-0 border-t border-gray-100 bg-gray-50 px-4 py-3 flex flex-col gap-1 shadow-md"
        >
          {NAV_ITEMS.map((item) =>
            item.status === 'active' ? (
              <button
                key={item.id}
                type="button"
                data-padding="custom"
                onClick={() => { onNavClick?.(item.id); setMenuOpen(false) }}
                className="text-base font-normal py-2 text-left text-gray-700"
              >
                {item.label}
              </button>
            ) : (
              <span key={item.id} className="py-2">
                <ComingSoonNavItem item={item} block />
              </span>
            )
          )}
        </div>
      )}
    </header>
    </>
  )
}
