import type { CategoryId, ChecklistItem, SituationId } from '../types/content'

// Return items that match at least one of the selected situations
export function filterBySituations(
  items: ChecklistItem[],
  selected: SituationId[],
): ChecklistItem[] {
  if (selected.length === 0) return []
  const matched = items.filter((item) => item.situations.some((s) => selected.includes(s)))
  if (!selected.includes('married')) return matched
  return matched.filter((item) => item.id !== 'standard-deduction-single')
}

// Display order for categories
const CATEGORY_ORDER: Record<CategoryId, number> = {
  gross_income: 0,
  exemptions: 1,
  general_deductions: 2,
  special_deductions: 3,
}

// 標準扣除額 and 列舉扣除額 are mutually exclusive filing choices shown together
// so that users understand both options before deciding; items note the exclusivity
export const CATEGORY_LABELS: Record<CategoryId, string> = {
  gross_income: '綜合所得總額',
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
