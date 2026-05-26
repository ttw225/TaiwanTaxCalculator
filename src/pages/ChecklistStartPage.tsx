import { SITE_CONFIG } from '../lib/siteConfig'
import { ChecklistFlow } from './ChecklistFlow'

export function meta() {
  const title = `${SITE_CONFIG.name}｜選擇報稅情況`
  const url = `${SITE_CONFIG.siteUrl}/checklist/start`
  const description =
    '選擇符合 114 年度的報稅情況，系統依此列出值得確認的免稅與扣除清單，讓你不漏掉任何可申報的節稅項目。'
  return [
    { title },
    { name: 'description', content: description },
    { name: 'robots', content: 'noindex,follow' },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
  ]
}

export default function ChecklistStartPage() {
  return <ChecklistFlow screen="start" />
}
