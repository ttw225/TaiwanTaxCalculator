import { SITE_CONFIG } from '../lib/siteConfig'
import { ChecklistFlow } from './ChecklistFlow'

export function meta() {
  const title = `${SITE_CONFIG.name}｜填寫節稅試算清單`
  const url = `${SITE_CONFIG.siteUrl}/checklist`
  return [
    { title },
    {
      name: 'description',
      content: '填寫 114 年度綜合所得稅試算資料，估算免稅額、扣除額與可能稅額組合。資料僅保存在瀏覽器。',
    },
    { name: 'robots', content: 'noindex,follow' },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: SITE_CONFIG.shortDescription },
  ]
}

export default function ChecklistPage() {
  return <ChecklistFlow screen="results" />
}
