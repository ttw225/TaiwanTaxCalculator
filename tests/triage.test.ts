import { describe, it, expect } from 'vitest'
import { CARD_SORT_RULES, sortByTriage } from '../src/lib/checklist'
import type { CategoryGroup } from '../src/lib/checklist'
import type { CardInputMap, ChecklistItem } from '../src/types/content'

// ── Test helpers ──────────────────────────────────────────────────────────────

function makeItem(id: string, situations: ChecklistItem['situations'], category: ChecklistItem['category'] = 'special_deductions'): ChecklistItem {
  return {
    id,
    title: id,
    category,
    situations,
    why_it_matters: '',
    eligibility_cues: [],
    documents_to_prepare: [],
    limitations: [],
    source_refs: [],
    verification_status: 'verified',
    disclaimer_level: 'low',
    next_action: '',
  }
}

function makeGroup(category: ChecklistItem['category'], items: ChecklistItem[]): CategoryGroup {
  return { category, label: category, items }
}

// ── CARD_SORT_RULES ───────────────────────────────────────────────────────────

describe('CARD_SORT_RULES', () => {
  it('contains at least 5 rules', () => {
    expect(CARD_SORT_RULES.length).toBeGreaterThanOrEqual(5)
  })

  it('all boost values are negative integers', () => {
    for (const rule of CARD_SORT_RULES) {
      expect(rule.boost).toBeLessThan(0)
      expect(Number.isInteger(rule.boost)).toBe(true)
    }
  })

  it('contains the required 5 fieldId rules', () => {
    const fieldIds = CARD_SORT_RULES.map((r) => r.fieldId)
    expect(fieldIds).toContain('mortgage_interest_amount')
    expect(fieldIds).toContain('rent_amount')
    expect(fieldIds).toContain('medical_amount')
    expect(fieldIds).toContain('donation_amount')
    expect(fieldIds).toContain('dependents_count')
  })
})

// ── sortByTriage ──────────────────────────────────────────────────────────────

describe('sortByTriage', () => {
  it('preserves item order when cardInputMap is empty', () => {
    const itemA = makeItem('A', ['mortgage_interest'])
    const itemB = makeItem('B', ['salary_income'])
    const itemC = makeItem('C', ['medical_expenses'])
    const groups = [makeGroup('special_deductions', [itemA, itemB, itemC])]

    const result = sortByTriage(groups, {})
    expect(result[0].items.map((i) => i.id)).toEqual(['A', 'B', 'C'])
  })

  it('does not mutate the input groups or items arrays', () => {
    const itemA = makeItem('A', ['mortgage_interest'])
    const itemB = makeItem('B', ['salary_income'])
    const originalItems = [itemA, itemB]
    const groups = [makeGroup('special_deductions', originalItems)]

    const cardInputMap: CardInputMap = { card1: { mortgage_interest_amount: '120000' } }
    sortByTriage(groups, cardInputMap)

    expect(groups[0].items).toEqual([itemA, itemB])
  })

  it('reorders items within category when matching field is filled', () => {
    const itemA = makeItem('A', ['mortgage_interest'])
    const itemB = makeItem('B', ['salary_income'])
    const groups = [makeGroup('special_deductions', [itemB, itemA])]

    const cardInputMap: CardInputMap = { 'mortgage-interest-deduction': { mortgage_interest_amount: '120000' } }
    const result = sortByTriage(groups, cardInputMap)
    expect(result[0].items.map((i) => i.id)).toEqual(['A', 'B'])
  })

  it('stable sort — equal score items retain original order', () => {
    const itemA = makeItem('A', ['mortgage_interest'])
    const itemB = makeItem('B', ['mortgage_interest'])
    const groups = [makeGroup('special_deductions', [itemA, itemB])]

    const cardInputMap: CardInputMap = { card: { mortgage_interest_amount: '120000' } }
    const result = sortByTriage(groups, cardInputMap)
    expect(result[0].items.map((i) => i.id)).toEqual(['A', 'B'])
  })

  it('category isolation — boost in one category does not affect another', () => {
    const exemptItem = makeItem('E1', ['dependents'], 'exemptions')
    const exemptItem2 = makeItem('E2', ['salary_income'], 'exemptions')
    const specialItem = makeItem('S1', ['medical_expenses'], 'special_deductions')
    const groups = [
      makeGroup('exemptions', [exemptItem, exemptItem2]),
      makeGroup('special_deductions', [specialItem]),
    ]

    const cardInputMap: CardInputMap = { card: { medical_amount: '50000' } }
    const result = sortByTriage(groups, cardInputMap)
    expect(result[0].items.map((i) => i.id)).toEqual(['E1', 'E2'])
  })

  it('category order in output matches input order', () => {
    const groups = [
      makeGroup('exemptions', [makeItem('E', ['dependents'])]),
      makeGroup('special_deductions', [makeItem('S', ['mortgage_interest'])]),
    ]
    const cardInputMap: CardInputMap = { card: { mortgage_interest_amount: '100000' } }
    const result = sortByTriage(groups, cardInputMap)
    expect(result.map((g) => g.category)).toEqual(['exemptions', 'special_deductions'])
  })

  it('returns new arrays — does not return same item array reference', () => {
    const itemA = makeItem('A', ['salary_income'])
    const originalItems = [itemA]
    const groups = [makeGroup('special_deductions', originalItems)]

    const result = sortByTriage(groups, {})
    expect(result[0].items).not.toBe(originalItems)
  })

})
