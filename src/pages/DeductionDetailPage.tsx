import { Link, useParams } from 'react-router'
import type { MetaArgs } from 'react-router'
import { CHECKLIST_ITEMS } from '../content/deductions'
import { SITE_CONFIG } from '../lib/siteConfig'
import NotFoundPage from './NotFoundPage'

// Only categories that represent actual deductions / exemptions are exposed as
// /deductions/:slug. Income items (gross_income, overseas_income) are inputs,
// not deductions, and won't have an SEO landing page.
const SEO_INDEXABLE_CATEGORIES = new Set([
  'exemptions',
  'general_deductions',
  'special_deductions',
])

export function meta({ params }: MetaArgs) {
  const slug = params.slug
  const item = CHECKLIST_ITEMS.find(
    (i) => i.id === slug && SEO_INDEXABLE_CATEGORIES.has(i.category),
  )
  if (!item) {
    return [
      { title: `找不到頁面｜${SITE_CONFIG.name}` },
      { name: 'robots', content: 'noindex,follow' },
    ]
  }
  const url = `${SITE_CONFIG.siteUrl}/deductions/${item.id}`
  const title = `${item.title}｜${SITE_CONFIG.taxYear} 年度所得稅扣除額`
  // Strip markdown-like emphasis for description.
  const description = item.why_it_matters.replace(/[`*_]/g, '').slice(0, 160)
  return [
    { title },
    { name: 'description', content: description },
    { name: 'robots', content: 'index,follow,max-image-preview:large' },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:url', content: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:type', content: 'article' },
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Article',
            '@id': `${url}#article`,
            headline: item.title,
            description,
            url,
            inLanguage: 'zh-Hant-TW',
            dateModified: SITE_CONFIG.lastUpdatedIso,
            author: { '@type': 'Organization', name: SITE_CONFIG.name },
            publisher: { '@id': `${SITE_CONFIG.siteUrl}/#organization` },
            about: { '@type': 'DefinedTerm', name: item.title },
          },
          {
            '@type': 'BreadcrumbList',
            // Google requires every non-final breadcrumb item to have an `item` URL.
            // We only have a real index page for the site root, so use a 2-level crumb.
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: '首頁', item: `${SITE_CONFIG.siteUrl}/` },
              { '@type': 'ListItem', position: 2, name: item.title, item: url },
            ],
          },
        ],
      },
    },
  ]
}

export default function DeductionDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const item = CHECKLIST_ITEMS.find(
    (i) => i.id === slug && SEO_INDEXABLE_CATEGORIES.has(i.category),
  )
  if (!item) return <NotFoundPage />

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <nav aria-label="breadcrumb" className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:underline">首頁</Link>
        <span className="mx-2">›</span>
        <span>扣除額</span>
        <span className="mx-2">›</span>
        <span>{item.title}</span>
      </nav>

      <h1 className="text-3xl font-bold mb-6">
        {item.title}
        <span className="ml-2 text-base font-normal text-gray-500">
          （{SITE_CONFIG.taxYear} 年度 / {SITE_CONFIG.dataYear} 申報）
        </span>
      </h1>

      <section className="prose prose-slate max-w-none space-y-6">
        <div>
          <h2 className="text-xl font-semibold">為什麼重要</h2>
          <p>{item.why_it_matters}</p>
        </div>

        {item.eligibility_cues.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold">適用條件</h2>
            <ul className="list-disc pl-6 space-y-1">
              {item.eligibility_cues.map((cue) => (
                <li key={cue}>{cue}</li>
              ))}
            </ul>
          </div>
        )}

        {item.documents_to_prepare.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold">應備文件</h2>
            <ul className="list-disc pl-6 space-y-1">
              {item.documents_to_prepare.map((doc) => (
                <li key={doc}>{doc}</li>
              ))}
            </ul>
          </div>
        )}

        {item.source_refs.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold">法源與官方資料</h2>
            <ul className="list-disc pl-6 space-y-1">
              {item.source_refs.map((ref) => (
                <li key={ref.source_id}>
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {ref.label}
                  </a>
                  <span className="text-gray-500 text-sm"> · {ref.authority}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t pt-6 mt-8">
          <Link
            to="/checklist/start"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            開始試算
          </Link>
          <p className="text-sm text-gray-500 mt-4">
            最後更新：{SITE_CONFIG.lastUpdated}
          </p>
        </div>
      </section>
    </article>
  )
}
