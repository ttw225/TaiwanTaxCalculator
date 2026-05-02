import type {
  AmountRange,
  PersonalizedRecommendation,
  PersonalizedReport,
  TaxProfile,
} from '../types/content'
import type { CategoryGroup } from './checklist'
import { calcCoupleFilingOptions, calcDividendOptions, checkAmtThreshold } from './decisions'
import { getNumber } from './numbers'
import { readLocal, removeLocal, writeLocal } from './storage'

export const PERSONALIZED_TAX_PROFILE_STORAGE_KEY = 'tax.personalizedWorksheet.v1'

export const EMPTY_TAX_PROFILE: TaxProfile = {
  housingType: 'none',
  incomeRange: 'none',
  medicalExpenseRange: 'none',
}

const AMOUNT_RANGES: AmountRange[] = ['none', 'low', 'medium', 'high']

function isAmountRange(value: unknown): value is AmountRange {
  return typeof value === 'string' && AMOUNT_RANGES.includes(value as AmountRange)
}

function normalizeNumber(value: unknown): number | undefined {
  if (value === '' || value === null || value === undefined) return undefined
  const numeric = typeof value === 'string' ? Number(value.replace(/,/g, '')) : Number(value)
  if (!Number.isFinite(numeric)) return undefined
  return Math.max(0, numeric)
}

function normalizeInteger(value: unknown): number | undefined {
  const numeric = normalizeNumber(value)
  return numeric === undefined ? undefined : Math.floor(numeric)
}

export function normalizeTaxProfile(input: Partial<TaxProfile> | null | undefined): TaxProfile {
  const source = input ?? {}
  const profile: TaxProfile = {
    housingType:
      source.housingType === 'rent' || source.housingType === 'mortgage' ? source.housingType : 'none',
    incomeRange: isAmountRange(source.incomeRange) ? source.incomeRange : 'none',
    medicalExpenseRange: isAmountRange(source.medicalExpenseRange) ? source.medicalExpenseRange : 'none',
  }

  const numericFields: Array<keyof TaxProfile> = [
    'incomeAmount',
    'marginalRate',
    'selfSalary',
    'spouseSalary',
    'rentAmount',
    'mortgageInterestAmount',
    'insuranceAmount',
    'donationAmount',
    'childcareAmount',
    'longTermCareAmount',
    'dividendAmount',
    'overseasIncome',
  ]

  for (const field of numericFields) {
    const normalized = normalizeNumber(source[field])
    if (normalized !== undefined) {
      profile[field] = normalized as never
    }
  }

  const dependentsCount = normalizeInteger(source.dependentsCount)
  if (dependentsCount !== undefined) profile.dependentsCount = dependentsCount
  if (typeof source.isMarried === 'boolean') profile.isMarried = source.isMarried

  return profile
}

export function loadSavedTaxProfile(): TaxProfile {
  const saved = readLocal<Partial<TaxProfile>>(PERSONALIZED_TAX_PROFILE_STORAGE_KEY)
  return normalizeTaxProfile(saved)
}

export function hasSavedTaxProfile(): boolean {
  try {
    return localStorage.getItem(PERSONALIZED_TAX_PROFILE_STORAGE_KEY) !== null
  } catch {
    return false
  }
}

export function saveTaxProfile(profile: TaxProfile): void {
  writeLocal(PERSONALIZED_TAX_PROFILE_STORAGE_KEY, normalizeTaxProfile(profile))
}

export function clearSavedTaxProfile(): void {
  removeLocal(PERSONALIZED_TAX_PROFILE_STORAGE_KEY)
}

function fmt(n: number) {
  return n.toLocaleString('zh-TW')
}

function findDocuments(groups: CategoryGroup[], itemId: string, fallback: string[]): string[] {
  const item = groups.flatMap((group) => group.items).find((candidate) => candidate.id === itemId)
  return item?.documents_to_prepare.length ? item.documents_to_prepare : fallback
}

function addRecommendation(
  recommendations: PersonalizedRecommendation[],
  recommendation: PersonalizedRecommendation,
) {
  recommendations.push(recommendation)
}

function hasPositive(value: number | undefined): value is number {
  return value !== undefined && value > 0
}

export function createPersonalizedReport(
  rawProfile: Partial<TaxProfile> | null | undefined,
  groups: CategoryGroup[] = [],
): PersonalizedReport {
  const profile = normalizeTaxProfile(rawProfile)
  const summary: string[] = []
  const recommendations: PersonalizedRecommendation[] = []
  const estimates: string[] = []
  const warnings: string[] = []

  if (profile.incomeAmount || profile.incomeRange !== 'none') {
    summary.push('已提供所得概況，可用來判斷標準扣除、薪資扣除與部分簡易估算的優先順序。')
  }

  if (profile.isMarried) {
    summary.push('已標記配偶申報情境，夫妻申報方式需要用官方申報系統確認完整結果。')
  }

  if (profile.dependentsCount && profile.dependentsCount > 0) {
    summary.push(`已填寫 ${profile.dependentsCount} 位扶養親屬，免稅額與照護相關扣除值得優先確認。`)
  }

  if (profile.housingType === 'rent' && hasPositive(profile.rentAmount)) {
    addRecommendation(recommendations, {
      id: 'rent-deduction',
      title: '租屋扣除文件優先整理',
      reason: `已填租金 NT$${fmt(profile.rentAmount)}，建議先確認租賃契約、付款證明與是否符合自住租屋扣除條件。`,
      priority: 10,
      documents: findDocuments(groups, 'rent-deduction', ['租賃契約書影本', '租金付款證明']),
      warning: '租屋扣除適用條件與排除情形仍須以官方申報系統確認。',
    })
  }

  if (profile.housingType === 'mortgage' && hasPositive(profile.mortgageInterestAmount)) {
    addRecommendation(recommendations, {
      id: 'mortgage-interest',
      title: '房貸利息扣除先核對年度證明',
      reason: `已填房貸利息 NT$${fmt(profile.mortgageInterestAmount)}，可先整理銀行年度利息單與自住房屋相關證明。`,
      priority: 12,
      documents: findDocuments(groups, 'mortgage-interest-deduction', ['銀行房貸年度利息繳納證明']),
      warning: '房貸利息列舉扣除需確認自住、戶籍與一屋限制。',
    })
  }

  if (profile.medicalExpenseRange === 'high') {
    addRecommendation(recommendations, {
      id: 'medical-expenses',
      title: '大額醫療支出建議先整理收據',
      reason: '已標記醫療支出偏高，列舉扣除可能值得檢查，但需看總列舉金額是否高於標準扣除額。',
      priority: 15,
      documents: findDocuments(groups, 'medical-deduction', ['醫療收據正本', '診斷證明或費用明細']),
      warning: '列舉扣除是否有利，請以財政部電子申報系統完整試算確認。',
    })
  }

  if (hasPositive(profile.donationAmount)) {
    addRecommendation(recommendations, {
      id: 'donations',
      title: '捐贈扣除留意收據與扣除上限',
      reason: `已填捐贈 NT$${fmt(profile.donationAmount)}，建議確認受贈單位性質與收據抬頭。`,
      priority: 25,
      documents: findDocuments(groups, 'donations-deduction', ['正式捐贈收據']),
    })
  }

  if (hasPositive(profile.insuranceAmount)) {
    addRecommendation(recommendations, {
      id: 'insurance',
      title: '保險費扣除檢查被保險人與上限',
      reason: `已填保險費 NT$${fmt(profile.insuranceAmount)}，建議確認保費證明、被保險人與每人限額。`,
      priority: 30,
      documents: findDocuments(groups, 'insurance-deduction', ['保險費繳費證明']),
    })
  }

  if (hasPositive(profile.childcareAmount)) {
    addRecommendation(recommendations, {
      id: 'childcare',
      title: '幼兒學前特別扣除檢查年齡與排富',
      reason: `已填幼兒照顧支出 NT$${fmt(profile.childcareAmount)}，建議確認子女年齡、扶養狀態與排富限制。`,
      priority: 35,
      documents: findDocuments(groups, 'childcare-deduction', ['子女身分資料', '幼兒園或托育資料']),
      warning: '幼兒學前特別扣除有排富條款，請以官方系統確認。',
    })
  }

  if (hasPositive(profile.longTermCareAmount)) {
    const limit = getNumber('special_deduction_long_term_care')
    addRecommendation(recommendations, {
      id: 'long-term-care',
      title: '長照扣除確認資格文件',
      reason: `已填長照相關支出 NT$${fmt(profile.longTermCareAmount)}；114 年度長照特別扣除額為 NT$${fmt(limit)}，但需符合資格與排富規定。`,
      priority: 36,
      documents: findDocuments(groups, 'long-term-care-deduction', ['長照需求等級證明或相關資格文件']),
      warning: '長照特別扣除有資格與排富條件，請以官方資料確認。',
    })
  }

  if (hasPositive(profile.dividendAmount)) {
    const recommendation: PersonalizedRecommendation = {
      id: 'dividend-election',
      title: '股利課稅方式需要比較',
      reason: `已填股利 NT$${fmt(profile.dividendAmount)}，建議比較合併計稅與 28% 分開計稅。`,
      priority: 20,
      documents: findDocuments(groups, 'dividends-tax-choice', ['股利憑單或股利所得資料']),
      warning: '股利課稅方式與總所得級距有關，最終請用官方申報系統確認。',
    }
    if (profile.marginalRate !== undefined) {
      const result = calcDividendOptions(profile.dividendAmount, profile.marginalRate)
      const label = result.recommended === 'A' ? '合併計稅' : result.recommended === 'B' ? '28% 分開計稅' : '兩者相同'
      recommendation.estimate = `以邊際稅率 ${(profile.marginalRate * 100).toFixed(0)}% 粗估：${label}，差額約 NT$${fmt(result.savings)}。`
      estimates.push(recommendation.estimate)
    }
    addRecommendation(recommendations, recommendation)
  }

  if (profile.isMarried && profile.selfSalary !== undefined && profile.spouseSalary !== undefined) {
    const result = calcCoupleFilingOptions(profile.selfSalary, profile.spouseSalary)
    const best = result.modes[result.bestIndex]
    const estimate =
      result.savings === 0
        ? '薪資-only 粗估下，三種夫妻申報方式稅額相同。'
        : `薪資-only 粗估下，${best.label}較低，與次低方案差約 NT$${fmt(result.savings)}。`
    addRecommendation(recommendations, {
      id: 'couple-filing',
      title: '夫妻申報方式用完整資料再確認',
      reason: `已填雙方薪資 NT$${fmt(profile.selfSalary)} / NT$${fmt(profile.spouseSalary)}，可先用薪資-only 模型比較，但完整結果還需納入其他所得與扣除。`,
      priority: 18,
      documents: findDocuments(groups, 'couple-filing-choice', ['雙方所得資料', '扶養與扣除資料']),
      estimate,
      warning: '此估算只涵蓋薪資，非完整夫妻申報試算。',
    })
    estimates.push(estimate)
  }

  if (hasPositive(profile.overseasIncome)) {
    const result = checkAmtThreshold(profile.overseasIncome)
    if (result.aboveThreshold) {
      const warning = `海外所得已達 NT$${fmt(result.threshold)} 門檻，建議進入最低稅負制檢查並諮詢專業人士。`
      addRecommendation(recommendations, {
        id: 'amt-overseas',
        title: '海外所得需進一步檢查 AMT',
        reason: `已填海外所得 NT$${fmt(profile.overseasIncome)}，達最低稅負制海外所得檢查門檻。`,
        priority: 5,
        documents: findDocuments(groups, 'overseas-income-amt', ['海外所得明細', '海外納稅證明', '居住者身分判斷資料']),
        warning,
      })
      warnings.push(warning)
    } else {
      estimates.push(`海外所得 NT$${fmt(profile.overseasIncome)} 未達 NT$${fmt(result.threshold)} 門檻，通常不進入海外所得 AMT 檢查。`)
    }
  }

  const standardKey = profile.isMarried ? 'standard_deduction_married' : 'standard_deduction_single'
  summary.push(`114 年度標準扣除額基準：NT$${fmt(getNumber(standardKey))}。列舉是否有利仍需官方申報系統完整比較。`)

  const sortedRecommendations = recommendations.sort((a, b) => a.priority - b.priority)
  const missingDocuments = Array.from(
    new Set(sortedRecommendations.flatMap((recommendation) => recommendation.documents)),
  )

  return {
    summary,
    recommendations: sortedRecommendations,
    missingDocuments,
    estimates,
    warnings: Array.from(new Set([...warnings, ...sortedRecommendations.flatMap((r) => r.warning ? [r.warning] : [])])),
  }
}
