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

export function parseNum(raw: string): number | null {
  if (raw.trim() === '') return null
  const n = Number(raw.replace(/,/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function getItemizedItemAmount(
  itemId: string,
  inputs: Record<string, string>,
): number | null {
  switch (itemId) {
    case 'donations-deduction':
      return parseNum(inputs['donation_amount'] ?? '')

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
      return Math.min(raw, getNumber('itemized_deduction_mortgage_interest'))
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
    const line = getItemizedItemAmount(item.id, cardInputMap[item.id] ?? {})
    if (line === null) {
      return { status: 'pending_itemized' }
    }
    sum += line
  }

  return { status: 'complete', amount: Math.max(standard, sum) }
}
