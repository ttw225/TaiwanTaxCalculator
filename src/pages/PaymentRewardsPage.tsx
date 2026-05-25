import { PaymentRewardsPage as PaymentRewardsFeaturePage } from '../components/PaymentRewardsPage'
import { SITE_CONFIG } from '../lib/siteConfig'

export function meta() {
  const title = `${SITE_CONFIG.name}｜繳稅回饋比較`
  const url = `${SITE_CONFIG.siteUrl}/payment-rewards`
  return [
    { title },
    {
      name: 'description',
      content: '輸入 114 年度應繳稅額，比較各家銀行信用卡、金融卡、台灣 Pay 的繳稅回饋與分期方案。',
    },
    { name: 'robots', content: 'index,follow,max-image-preview:large' },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: SITE_CONFIG.shortDescription },
  ]
}

export default function PaymentRewardsRoutePage() {
  return <PaymentRewardsFeaturePage />
}
