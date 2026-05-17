import { Link } from 'react-router'
import { SITE_CONFIG } from '../lib/siteConfig'

const URL = `${SITE_CONFIG.siteUrl}/methodology`

export function meta() {
  const title = `計算方法與資料更新｜${SITE_CONFIG.name}`
  return [
    { title },
    {
      name: 'description',
      content: `${SITE_CONFIG.name} 的所得稅試算邏輯、${SITE_CONFIG.dataYear} 年度數值來源與更新流程說明。`,
    },
    { name: 'robots', content: 'index,follow,max-image-preview:large' },
    { tagName: 'link', rel: 'canonical', href: URL },
    { property: 'og:type', content: 'article' },
    { property: 'og:url', content: URL },
    { property: 'og:title', content: title },
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        headline: title,
        url: URL,
        inLanguage: 'zh-Hant-TW',
        dateModified: SITE_CONFIG.lastUpdatedIso,
        author: { '@type': 'Organization', name: SITE_CONFIG.name },
      },
    },
  ]
}

export default function MethodologyPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <nav aria-label="breadcrumb" className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:underline">首頁</Link>
        <span className="mx-2">›</span>
        <span>計算方法</span>
      </nav>
      <h1 className="text-3xl font-bold mb-6">計算方法與資料更新</h1>
      <section className="prose prose-slate max-w-none space-y-4">
        <p>
          本站使用 {SITE_CONFIG.dataYear} 年度（申報 {SITE_CONFIG.taxYear} 年度
          所得）財政部公告數值，包含免稅額、標準扣除額、薪資特別扣除額、稅率級距與
          相關上限。所有數值集中於專案的 <code>numbers_2026.json</code> 中，
          公告變動時統一更新。
        </p>
        <h2 className="text-xl font-semibold mt-8">計算流程</h2>
        <ol className="list-decimal pl-6 space-y-2">
          <li>使用者選擇符合的家庭與所得情境（薪資、股利、利息等）。</li>
          <li>系統依情境組合篩選對應的扣除額卡片。</li>
          <li>輸入金額後即時計算綜合所得淨額與應納稅額。</li>
          <li>提供標準扣除額 vs 列舉扣除額兩種試算比較。</li>
        </ol>
        <h2 className="text-xl font-semibold mt-8">數值來源</h2>
        <ul className="list-disc pl-6 space-y-1">
          {SITE_CONFIG.officialLinks.map((l) => (
            <li key={l.url}>
              <a href={l.url} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="text-sm text-gray-500 mt-8">
          最後更新：{SITE_CONFIG.lastUpdated}
        </p>
      </section>
    </article>
  )
}
