import type { CategoryId, ChecklistItem, SituationId } from '../types/content'

const BASELINE_ITEM_IDS = new Set([
  'exemption-general',
  'standard-deduction-single',
  'standard-deduction-married',
])

function getBaselineItemIds(selected: SituationId[]) {
  return new Set([
    'exemption-general',
    selected.includes('married') ? 'standard-deduction-married' : 'standard-deduction-single',
  ])
}

// Return baseline result-page items plus items that match at least one selected situation.
export function filterBySituations(
  items: ChecklistItem[],
  selected: SituationId[],
): ChecklistItem[] {
  if (selected.length === 0) return []
  const baselineIds = getBaselineItemIds(selected)
  return items.filter((item) =>
    baselineIds.has(item.id) ||
    (!BASELINE_ITEM_IDS.has(item.id) && item.situations.some((s) => selected.includes(s)))
  )
}

// Display order for categories
const CATEGORY_ORDER: Record<CategoryId, number> = {
  gross_income: 0,
  overseas_income: 1,
  exemptions: 2,
  general_deductions: 3,
  special_deductions: 4,
}

// 標準扣除額 and 列舉扣除額 are mutually exclusive filing choices shown together
// so that users understand both options before deciding; items note the exclusivity
export const CATEGORY_LABELS: Record<CategoryId, string> = {
  gross_income: '綜合所得總額',
  overseas_income: '海外所得',
  exemptions: '免稅額',
  general_deductions: '一般扣除額（標準或列舉擇一）',
  special_deductions: '特別扣除額',
}

export interface CategoryGroup {
  category: CategoryId
  label: string
  items: ChecklistItem[]
}

// Group items by category in priority order
export function groupByCategory(items: ChecklistItem[]): CategoryGroup[] {
  const map = new Map<CategoryId, ChecklistItem[]>()
  for (const item of items) {
    const existing = map.get(item.category) ?? []
    existing.push(item)
    map.set(item.category, existing)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => CATEGORY_ORDER[a] - CATEGORY_ORDER[b])
    .map(([category, categoryItems]) => ({
      category,
      label: CATEGORY_LABELS[category],
      items: categoryItems,
    }))
}
