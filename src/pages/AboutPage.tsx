import { Link } from 'react-router'
import { SITE_CONFIG } from '../lib/siteConfig'

const URL = `${SITE_CONFIG.siteUrl}/about`

export function meta() {
  const title = `關於 ${SITE_CONFIG.name}｜資料來源與隱私`
  return [
    { title },
    {
      name: 'description',
      content: `${SITE_CONFIG.name} 的資料來源、計算前提、隱私政策與免責聲明。所有運算皆在瀏覽器完成，不上傳個人資料。`,
    },
    { name: 'robots', content: 'index,follow,max-image-preview:large' },
    { tagName: 'link', rel: 'canonical', href: URL },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: URL },
    { property: 'og:title', content: title },
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: '首頁', item: `${SITE_CONFIG.siteUrl}/` },
          { '@type': 'ListItem', position: 2, name: '關於本站', item: URL },
        ],
      },
    },
  ]
}

export default function AboutPage() {
  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <nav aria-label="breadcrumb" className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:underline">首頁</Link>
        <span className="mx-2">›</span>
        <span>關於本站</span>
      </nav>
      <h1 className="text-3xl font-bold mb-6">關於 {SITE_CONFIG.name}</h1>
      <section className="prose prose-slate max-w-none space-y-4">
        <p>
          {SITE_CONFIG.name}（{SITE_CONFIG.nameEn}）是一個開源的{' '}
          {SITE_CONFIG.taxYear} 年度（{SITE_CONFIG.dataYear} 申報）綜合所得稅
          節稅資訊整理工具。
        </p>
        <h2 className="text-xl font-semibold mt-8">隱私</h2>
        <p>
          所有計算與輸入皆在你的瀏覽器中完成，不會上傳任何個人資料至伺服器。
          選項與金額僅暫存於 localStorage，重新整理可保留進度。
        </p>
        <h2 className="text-xl font-semibold mt-8">資料來源</h2>
        <ul className="list-disc pl-6 space-y-1">
          {SITE_CONFIG.officialLinks.map((l) => (
            <li key={l.url}>
              <a href={l.url} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                {l.label}
              </a>
            </li>
          ))}
        </ul>
        <h2 className="text-xl font-semibold mt-8">免責聲明</h2>
        <p>
          本站試算結果僅供節稅方向參考，正式申報請以財政部公告與會計師意見為準。
          數值依 {SITE_CONFIG.dataYear} 年度公告整理，最後更新：{SITE_CONFIG.lastUpdated}。
        </p>
      </section>
    </article>
  )
}
