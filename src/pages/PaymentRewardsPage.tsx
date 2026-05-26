import { PaymentRewardsPage as PaymentRewardsFeaturePage } from '../components/PaymentRewardsPage'
import { SITE_CONFIG } from '../lib/siteConfig'

export function meta() {
  const title = `${SITE_CONFIG.name}｜繳稅回饋比較`
  const url = `${SITE_CONFIG.siteUrl}/payment-rewards`
  const description =
    `比較 ${SITE_CONFIG.taxYear} 年度（${SITE_CONFIG.dataYear} 申報）各家銀行信用卡、金融卡、台灣 Pay 的繳稅現金回饋與分期 0 利率方案，輸入應繳稅額即可估算回饋最高的卡別與活動。`
  const ogImage = `${SITE_CONFIG.siteUrl}/og/payment-rewards.png`
  const ogAlt = '繳稅回饋比較：信用卡、金融卡、台灣 Pay、分期 0 利率方案'
  return [
    { title },
    { name: 'description', content: description },
    { name: 'robots', content: 'index,follow,max-image-preview:large' },
    { tagName: 'link', rel: 'canonical', href: url },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: url },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    // Route-specific OG / Twitter image (overrides root.tsx fallback).
    // Keep og:image* tags adjacent — crawlers pair width/height to the
    // nearest preceding og:image. twitter:card is site-wide in root.tsx.
    { property: 'og:image', content: ogImage },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: ogAlt },
    { name: 'twitter:image', content: ogImage },
    { name: 'twitter:image:alt', content: ogAlt },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    {
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebApplication',
            '@id': `${url}#webapp`,
            name: `${SITE_CONFIG.name} 繳稅回饋比較`,
            url,
            applicationCategory: 'FinanceApplication',
            operatingSystem: 'Any',
            inLanguage: 'zh-Hant-TW',
            offers: { '@type': 'Offer', price: '0', priceCurrency: 'TWD' },
            description,
            isPartOf: { '@id': `${SITE_CONFIG.siteUrl}/#website` },
          },
          {
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: '首頁', item: `${SITE_CONFIG.siteUrl}/` },
              { '@type': 'ListItem', position: 2, name: '繳稅回饋', item: url },
            ],
          },
        ],
      },
    },
  ]
}

export default function PaymentRewardsRoutePage() {
  return <PaymentRewardsFeaturePage />
}
