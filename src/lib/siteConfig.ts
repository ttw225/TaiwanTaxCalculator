// Site-wide configuration.
// Fill in the empty strings below once the external accounts are ready.

export const SITE_CONFIG = {
  name: '台灣節稅資訊平台',
  nameEn: 'Taiwan Tax Credit',
  tagline: '114 年度綜合所得稅，節稅方向一站查清楚',
  taxYear: '114',
  dataYear: '2026',
  lastUpdated: '2026-05',

  // Task 1.5: fill in once Buy Me a Coffee / Ko-fi account is created
  buyMeCoffeeUrl: '',

  // Task 1.6: fill in once GitHub repo is created, e.g. 'https://github.com/user/repo/issues/new'
  githubNewIssueUrl: '',

  // Official government links — leave url empty to hide
  officialLinks: [
    { label: '財政部官網', url: 'https://www.mof.gov.tw' },
    { label: 'e-Tax 電子報稅', url: 'https://efile.tax.nat.gov.tw/irxw/index.jsp' },
  ] satisfies Array<{ label: string; url: string }>,
} as const

// Navigation items in display order (Task 1.3).
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

// Primary colour tokens (Task 1.1): brand blue.
// Used as Tailwind class strings throughout header/footer components.
// Mobile logo position (Task 1.2): left-aligned.
export const BRAND = {
  primary: 'text-blue-600',
  primaryBorder: 'border-blue-600',
  primaryHover: 'hover:text-blue-700',
  primaryBg: 'bg-blue-600',
} as const
