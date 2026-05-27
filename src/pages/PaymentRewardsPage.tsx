import { PaymentRewardsPage as PaymentRewardsFeaturePage } from '../components/PaymentRewardsPage'
import { SITE_CONFIG } from '../lib/siteConfig'
import topOffersRaw from '../data/payment_top_offers.generated.json'

// generated top-N（由 scripts/generate-payment-top-offers.ts 產生）型別
interface TopOfferEntry {
  bank: string
  bank_code: string
  card_name: string
  source_url: string
  estimated_value: number
  rate?: number
  mode: string
  requires_registration: boolean
  cue: string | null
}
interface TopOfferTier {
  amount: number
  label: string
  offers: TopOfferEntry[]
}
interface TopOffersData {
  data_updated: string
  build_id: string
  tiers: TopOfferTier[]
}
const topOffers = topOffersRaw as TopOffersData

export function meta() {
  const title = `${SITE_CONFIG.name}｜繳稅回饋比較`
  const url = `${SITE_CONFIG.siteUrl}/payment-rewards`
  const description =
    `比較 ${SITE_CONFIG.taxYear} 年度（${SITE_CONFIG.dataYear} 申報）各家銀行信用卡、金融卡、台灣 Pay 的繳稅現金回饋與分期 0 利率方案，輸入應繳稅額即可估算回饋最高的卡別與活動。`
  const ogImage = `${SITE_CONFIG.siteUrl}/og/payment-rewards.png`
  const ogAlt = '繳稅回饋比較：信用卡、金融卡、台灣 Pay、分期 0 利率方案'

  // ItemList + FinancialProduct：純機器可讀的「繳稅方案精選試算範例」結構化資料。
  // 視覺上不顯示；對 crawler、Google Rich Results 提供可索引內容。
  // 來源：scripts/generate-payment-top-offers.ts 預先計算的 top-N JSON。
  //
  // Schema 選擇：用通用 FinancialProduct（信用卡 / 金融卡 / 綁定街口支付的存款帳戶都涵蓋），
  // 不寫 CreditCard——因為 top-N 可能含 debit-card 或 deposit-account+wallet 組合
  // （例：「將來銀行存款帳戶（綁定街口支付）」就不是信用卡）。
  // 故意不用 Offer + price/priceCurrency（會被 Google Merchant 當售價誤解）。
  const flatOffers = topOffers.tiers.flatMap((tier) =>
    tier.offers.map((o) => ({ tier, o })),
  )
  const itemList = {
    '@type': 'ItemList',
    '@id': `${url}#sample-offers`,
    name: '繳稅方案精選試算範例',
    description: `${topOffers.data_updated} 資料：依稅額金額階段試算的精選回饋方案`,
    numberOfItems: flatOffers.length,
    itemListElement: flatOffers.map(({ tier, o }, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      item: {
        '@type': 'FinancialProduct',
        name: `${o.bank} ${o.card_name}`,
        url: o.source_url,
        provider: {
          '@type': 'BankOrCreditUnion',
          name: o.bank,
        },
        description: `稅額 ${tier.label}：預估回饋 NT$ ${o.estimated_value.toLocaleString('zh-TW')}${o.cue ? `（${o.cue}）` : ''}`,
      },
    })),
  }
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
          itemList,
        ],
      },
    },
  ]
}

export default function PaymentRewardsRoutePage() {
  return <PaymentRewardsFeaturePage />
}
