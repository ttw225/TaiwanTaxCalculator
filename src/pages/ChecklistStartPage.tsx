import { SITE_CONFIG } from '../lib/siteConfig'
import { ChecklistFlow } from './ChecklistFlow'

export function meta() {
  const title = `${SITE_CONFIG.name}｜選擇報稅情況`
  const url = `${SITE_CONFIG.siteUrl}/checklist/start`
  return [
    { title },
    {
      name: 'description',
      content: '先選擇符合 114 年度的報稅情況，系統會產生可填寫的所得稅節稅清單。',
    },
    { name: 'robots', content: 'noindex,follow' },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: SITE_CONFIG.shortDescription },
  ]
}

export default function ChecklistStartPage() {
  return <ChecklistFlow screen="start" />
}
