// Site-wide configuration.
// Fill in the empty strings below once the external accounts are ready.

export const SITE_CONFIG = {
  name: '台灣節稅資訊平台',
  nameEn: 'Taiwan Tax Calculator',
  tagline: '114 年度綜合所得稅，節稅方向一站查清楚',
  taxYear: '114',
  dataYear: '2026',
  lastUpdated: '2026-05',
  siteUrl: 'https://taiwantaxcalculator.com/',

  // Buy Me a Coffee / Ko-fi URL — fill in when account is ready
  buyMeCoffeeUrl: '',

  // 意見回報 Google 表單（一般用戶）
  googleFormUrl: 'https://forms.gle/ZsYHAPD5jDhGjtsZA',

  // GitHub issue（開發者回報）
  githubNewIssueUrl: 'https://github.com/ttw225/TaiwanTaxCalculator/issues/new/choose',

  // Official government links — leave url empty to hide
  officialLinks: [
    { label: '財政部官網', url: 'https://www.mof.gov.tw' },
    { label: 'e-Tax 電子報稅', url: 'https://efile.tax.nat.gov.tw/irxw/index.jsp' },
  ] satisfies Array<{ label: string; url: string }>,
} as const

// Navigation items in display order.
// 'active' = live feature; 'coming-soon' = disabled placeholder.
export type NavItemStatus = 'active' | 'coming-soon'

export interface NavItem {
  id: string
  label: string
  status: NavItemStatus
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'tax-checklist', label: '節稅試算', status: 'active' },
  { id: 'payment-rewards', label: '繳稅回饋', status: 'coming-soon' },
]

// Brand blue Tailwind class tokens for header/footer.
// Used as Tailwind class strings throughout header/footer components.
export const BRAND = {
  primary: 'text-blue-600',
  primaryBorder: 'border-blue-600',
  primaryHover: 'hover:text-blue-700',
  primaryBg: 'bg-blue-600',
} as const
