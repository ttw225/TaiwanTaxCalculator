import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { NAV_ITEMS, SITE_CONFIG } from '../lib/siteConfig'
import { getDeployInfo } from '../lib/deployInfo'
import { ComingSoonNavItem } from './ComingSoonNavItem'
import { DeployBadge } from './DeployBadge'

interface Props {
  currentFeatureId: string
}

export function SiteHeader({ currentFeatureId }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const deployInfo = getDeployInfo()

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
    // position: sticky — no layout offset, unlike fixed
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* Logo — left-aligned on all viewports (Task 1.2) */}
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-semibold text-gray-900 text-base tracking-tight">
              {SITE_CONFIG.name}
            </span>
            <span className="hidden text-xs text-gray-400 sm:block">
              {SITE_CONFIG.nameEn}
            </span>
          </div>
          {deployInfo && <DeployBadge deployInfo={deployInfo} />}
        </div>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6" aria-label="主導覽">
          {NAV_ITEMS.map((item) =>
            item.status === 'active' ? (
              <span
                key={item.id}
                className={`text-sm font-medium pb-0.5 transition-colors ${
                  currentFeatureId === item.id
                    ? 'text-teal-700 border-b-2 border-teal-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {item.label}
              </span>
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
          className="md:hidden border-t border-gray-100 bg-white px-4 py-3 flex flex-col gap-1"
        >
          {NAV_ITEMS.map((item) =>
            item.status === 'active' ? (
              <span
                key={item.id}
                className={`text-sm font-medium py-2 ${
                  currentFeatureId === item.id ? 'text-teal-700' : 'text-gray-700'
                }`}
              >
                {item.label}
              </span>
            ) : (
              <span key={item.id} className="py-2">
                <ComingSoonNavItem item={item} block />
              </span>
            )
          )}
        </div>
      )}
    </header>
  )
}
