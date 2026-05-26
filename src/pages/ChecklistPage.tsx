import { SITE_CONFIG } from '../lib/siteConfig'
import { ChecklistFlow } from './ChecklistFlow'

export function meta() {
  const title = `${SITE_CONFIG.name}｜填寫節稅試算清單`
  const url = `${SITE_CONFIG.siteUrl}/checklist`
  const description =
    '填寫家庭與所得資料，即時估算 114 年度可用的免稅額、扣除額與稅額減免；資料僅保存在瀏覽器。'
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

export default function ChecklistPage() {
  return <ChecklistFlow screen="results" />
}
