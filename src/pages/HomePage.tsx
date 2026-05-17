import { useLayoutEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router'
import { IntroPage } from '../components/IntroPage'
import { SiteHeader } from '../components/SiteHeader'
import { SiteFooter } from '../components/SiteFooter'
import { BackToTopButton } from '../components/BackToTopButton'
import { SITE_CONFIG } from '../lib/siteConfig'
import { getChecklistEntryPath } from '../lib/checklistEntryPath'
import { PageHeading } from '../components/ui/PageHeading'
import { HOME_HERO_IMAGE_SRC } from '../lib/homeHeroImage'

export function links() {
  if (typeof document === 'undefined') return []

  return [
    {
      rel: 'preload',
      as: 'image',
      href: HOME_HERO_IMAGE_SRC,
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

  function navigateToChecklistEntry() {
    const destination = getChecklistEntryPath()
    flushSync(() => setPendingChecklistDestination(destination))
    window.scrollTo(0, 0)
    navigate(destination, { preventScrollReset: true, flushSync: true })
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
    : pendingChecklistDestination === '/checklist'
      ? <div className="max-w-5xl mx-auto px-4 py-12 text-gray-500">正在載入節稅清單...</div>
      : <IntroPage onStart={navigateToChecklistEntry} />

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteHeader
        currentFeatureId="tax-checklist"
        onHome={() => {
          navigate('/', { preventScrollReset: true, flushSync: true })
          window.scrollTo(0, 0)
        }}
        onNavClick={navigateToChecklistEntry}
      />
      <main className="flex-1">
        {content}
      </main>
      <SiteFooter />
      <BackToTopButton />
    </div>
  )
}
