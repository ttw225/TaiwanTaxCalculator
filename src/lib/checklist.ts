import type { CardInputMap, CategoryId, ChecklistItem, SituationId } from '../types/content'

// Publication gate: unverified items must not appear in production UI
export function applyPublicationGate(items: ChecklistItem[]): ChecklistItem[] {
  return items.filter((item) => item.verification_status !== 'unverified')
}

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
  exemptions: 0,
  general_deductions: 1,
  special_deductions: 2,
  further_check: 3,
}

// 標準扣除額 and 列舉扣除額 are mutually exclusive filing choices shown together
// so that users understand both options before deciding; items note the exclusivity
export const CATEGORY_LABELS: Record<CategoryId, string> = {
  exemptions: '免稅額',
  general_deductions: '一般扣除額（標準或列舉擇一）',
  special_deductions: '特別扣除額',
  further_check: '需進一步確認',
}

export interface CategoryGroup {
  category: CategoryId
  label: string
  items: ChecklistItem[]
}

type CardSortRule = {
  fieldId: string
  situationId: SituationId
  boost: number
}

export const CARD_SORT_RULES: CardSortRule[] = [
  { fieldId: 'mortgage_interest_amount', situationId: 'mortgage_interest', boost: -2 },
  { fieldId: 'rent_amount',              situationId: 'rent',              boost: -2 },
  { fieldId: 'medical_amount',           situationId: 'medical_expenses',  boost: -2 },
  { fieldId: 'donation_amount',          situationId: 'donations',         boost: -1 },
  { fieldId: 'dependents_count',         situationId: 'dependents',        boost: -2 },
]

// Heuristic stable sort of items within each category based on per-card inputs.
// Lower score = shown earlier. Category order and membership are never changed.
// Caller should debounce calls (300ms) after cardInputMap changes.
export function sortByTriage(
  groups: CategoryGroup[],
  cardInputMap: CardInputMap,
): CategoryGroup[] {
  const hasInput = Object.keys(cardInputMap).some(
    (k) => Object.values(cardInputMap[k]).some((v) => v !== ''),
  )

  if (!hasInput) return groups.map((g) => ({ ...g, items: [...g.items] }))

  return groups.map((group) => {
    const scored = group.items.map((item, originalIndex) => {
      let score = 0
      for (const rule of CARD_SORT_RULES) {
        const fieldFilled = Object.values(cardInputMap).some(
          (fields) => fields[rule.fieldId] !== undefined && fields[rule.fieldId] !== '',
        )
        if (fieldFilled && item.situations.includes(rule.situationId)) {
          score += rule.boost
        }
      }
      return { item, score, originalIndex }
    })
    scored.sort((a, b) => a.score !== b.score ? a.score - b.score : a.originalIndex - b.originalIndex)
    return { ...group, items: scored.map((s) => s.item) }
  })
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
