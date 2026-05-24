import { useEffect, useLayoutEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router'
import { IntroPage } from '../components/IntroPage'
import { SiteHeader } from '../components/SiteHeader'
import { SiteFooter } from '../components/SiteFooter'
import { BackToTopButton } from '../components/BackToTopButton'
import { SITE_CONFIG } from '../lib/siteConfig'
import { PageHeading } from '../components/ui/PageHeading'
import { HOME_HERO_IMAGE_PRELOAD_SRC, warmHomeHeroImage } from '../lib/homeHeroImage'
import {
  createChecklistNavigationState,
  getChecklistEntryPathFromSnapshot,
  loadSavedChecklistSnapshot,
} from '../lib/checklistSnapshot'

export function links() {
  return [
    {
      rel: 'preload',
      as: 'image',
      href: HOME_HERO_IMAGE_PRELOAD_SRC,
      type: 'image/webp',
      fetchPriority: 'high',
    },
  ]
}

export function meta() {
  const title = `${SITE_CONFIG.name}｜${SITE_CONFIG.taxYear} 年度所得稅節稅清單`
  const url = `${SITE_CONFIG.siteUrl}/`
  return [
    { title },
    { name: 'description', content: SITE_CONFIG.defaultDescription },
    { name: 'robots', content: 'index,follow,max-image-preview:large' },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: SITE_CONFIG.shortDescription },
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        '@id': `${url}#webapp`,
        name: SITE_CONFIG.name,
        url,
        applicationCategory: 'FinanceApplication',
        operatingSystem: 'Any',
        inLanguage: 'zh-Hant-TW',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'TWD' },
        description: SITE_CONFIG.defaultDescription,
      },
    },
  ]
}

export default function HomePage() {
  const navigate = useNavigate()
  const [pendingChecklistDestination, setPendingChecklistDestination] = useState<string | null>(null)

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Pre-decode the hero image while React is mounting so it paints without
  // blocking. The `<link rel="preload">` from `links()` already kicked off the
  // network fetch — this just primes the decode.
  useEffect(() => {
    void warmHomeHeroImage()
  }, [])

  // Prefetch the most likely next route's JS chunks on idle, so clicking
  // "開始試算" feels instant. Falls back to setTimeout where rIC is unavailable
  // (Safari < 18). Failures are swallowed — this is best-effort.
  useEffect(() => {
    const hasIdleCallback = typeof window !== 'undefined' && 'requestIdleCallback' in window
    const prefetch = () => {
      // Vite resolves these dynamic imports to the existing route chunks; no
      // duplicate code is emitted. Errors during prefetch (offline, etc.) are
      // not user-visible.
      void import('./ChecklistStartPage').catch(() => {})
      void import('./ChecklistFlow').catch(() => {})
    }
    const handle = hasIdleCallback
      ? window.requestIdleCallback(prefetch, { timeout: 2000 })
      : window.setTimeout(prefetch, 600)
    return () => {
      if (hasIdleCallback) window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
    }
  }, [])

  function navigateToChecklistEntry() {
    const snapshot = loadSavedChecklistSnapshot()
    const destination = getChecklistEntryPathFromSnapshot(snapshot)
    if (destination === '/checklist') {
      navigate(destination, {
        state: createChecklistNavigationState(snapshot),
        preventScrollReset: true,
        flushSync: true,
      })
      window.scrollTo(0, 0)
      return
    }

    flushSync(() => setPendingChecklistDestination(destination))
    window.scrollTo(0, 0)
    navigate(destination, { preventScrollReset: true, flushSync: true })
  }

  function handleNavClick(id: string) {
    if (id === 'payment-rewards') {
      setPendingChecklistDestination(null)
      navigate('/payment-rewards', { preventScrollReset: true, flushSync: true })
      window.scrollTo(0, 0)
      return
    }
    navigateToChecklistEntry()
  }

  const content = pendingChecklistDestination === '/checklist/start'
      ? (
          <div className="max-w-5xl mx-auto px-4 py-8">
            <PageHeading
              title="選擇符合 114 年度的報稅項目"
              description="選擇符合您今年度情況的項目，系統將列出值得確認的扣除清單。不需要登入或填寫任何個人資料。"
            />
          </div>
        )
      : <IntroPage onStart={navigateToChecklistEntry} />

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteHeader
        currentFeatureId="tax-checklist"
        onHome={() => {
          navigate('/', { preventScrollReset: true, flushSync: true })
          window.scrollTo(0, 0)
        }}
        onNavClick={handleNavClick}
      />
      <main className="flex-1">
        {content}
      </main>
      <SiteFooter />
      <BackToTopButton />
    </div>
  )
}
