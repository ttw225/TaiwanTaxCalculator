import type { CardInputMap } from '../types/content'
import type { CategoryGroup } from './checklist'
import { getNumber } from './numbers'

/** Itemized checklist cards that participate in standard vs itemized comparison */
export const ITEMIZED_ITEM_IDS = new Set<string>([
  'donations-deduction',
  'insurance-deduction',
  'medical-deduction',
  'mortgage-interest-deduction',
])

export interface ItemizedCalcContext {
  /** Gross income total (used for the 20% donation cap). */
  grossIncomeAmount: number | null
  /** Optional alternate gross total when dividends are merged into regular income. */
  dividendMergedGrossIncomeAmount?: number | null
  /** Optional alternate gross total when dividends use separate taxation. */
  dividendSeparateGrossIncomeAmount?: number | null
  /** Whether the savings-investment deduction card is enabled (present in checklist). */
  savingsInvestmentEnabled: boolean
  /** Capped savings-investment deduction amount; null means enabled but still unfilled. */
  savingsInvestmentDeductionAmount: number | null
}

export function parseNum(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function getItemizedItemAmount(
  itemId: string,
  inputs: Record<string, string>,
  context?: Partial<ItemizedCalcContext>,
): number | null {
  const ctx: ItemizedCalcContext = {
    grossIncomeAmount: null,
    savingsInvestmentEnabled: false,
    savingsInvestmentDeductionAmount: null,
    ...context,
  }
  switch (itemId) {
    case 'donations-deduction': {
      const qualifiedRaw = inputs['donation_amount_qualified'] ?? ''
      const governmentRaw = inputs['donation_amount_government'] ?? ''

      if (qualifiedRaw.trim() === '' && governmentRaw.trim() === '') return null

      const qualified = qualifiedRaw.trim() !== '' ? parseNum(qualifiedRaw) : 0
      const government = governmentRaw.trim() !== '' ? parseNum(governmentRaw) : 0
      if (qualified === null || government === null) return null

      if (qualified > 0 && ctx.grossIncomeAmount === null) return null
      const qualifiedCap = ctx.grossIncomeAmount === null ? 0 : ctx.grossIncomeAmount * 0.2
      return government + Math.min(qualified, qualifiedCap)
    }

    case 'insurance-deduction': {
      const personal = inputs['insurance_personal_amount'] ?? ''
      const nhi = inputs['insurance_nhi_amount'] ?? ''
      if (personal.trim() === '' && nhi.trim() === '') return null
      const p = personal.trim() !== '' ? parseNum(personal) : 0
      const n = nhi.trim() !== '' ? parseNum(nhi) : 0
      if (p === null || n === null) return null
      return p + n
    }

    case 'medical-deduction':
      return parseNum(inputs['medical_amount'] ?? '')

    case 'mortgage-interest-deduction': {
      const raw = parseNum(inputs['mortgage_interest_amount'] ?? '')
      if (raw === null) return null
      const cap = getNumber('itemized_deduction_mortgage_interest')

      if (!ctx.savingsInvestmentEnabled) {
        return Math.min(raw, cap)
      }

      const savingsDeduction = ctx.savingsInvestmentDeductionAmount ?? 0
      const remaining = Math.max(0, raw - savingsDeduction)
      return Math.min(remaining, cap)
    }

    default:
      return null
  }
}

export type GeneralDeductionResolution =
  | { status: 'standard_only'; amount: number }
  | { status: 'pending_itemized' }
  | { status: 'complete'; amount: number }

export function resolveGeneralDeduction(
  groups: CategoryGroup[],
  cardInputMap: CardInputMap,
  isMarriedFiling: boolean,
  context?: Partial<ItemizedCalcContext>,
): GeneralDeductionResolution {
  const standardKey = isMarriedFiling ? 'standard_deduction_married' : 'standard_deduction_single'
  const standard = getNumber(standardKey)

  const presentItems = groups
    .flatMap((g) => g.items)
    .filter((item) => ITEMIZED_ITEM_IDS.has(item.id))

  if (presentItems.length === 0) {
    return { status: 'standard_only', amount: standard }
  }

  let sum = 0
  for (const item of presentItems) {
    const line = getItemizedItemAmount(item.id, cardInputMap[item.id] ?? {}, context)
    if (line === null) {
      return { status: 'pending_itemized' }
    }
    sum += line
  }

  return { status: 'complete', amount: Math.max(standard, sum) }
}
