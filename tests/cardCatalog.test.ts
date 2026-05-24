import { describe, it, expect } from 'vitest'
import {
  getAllCards,
  getCard,
  getCardNames,
  groupByBank,
} from '../src/lib/cardCatalog'

describe('cardCatalog', () => {
  it('loads all cards (>= 500)', () => {
    const all = getAllCards()
    expect(all.length).toBeGreaterThanOrEqual(500)
  })

  it('includes 823 generic entry (新增以避免 picker 完全找不到該行)', () => {
    const c = getCard('bank823_generic_credit')
    expect(c).not.toBeNull()
    expect(c?.bank_code).toBe('823')
    expect(c?.is_generic).toBe(true)
  })

  it('getCard returns null for unknown id', () => {
    expect(getCard('bank999_does_not_exist')).toBeNull()
  })

  it('getCardNames falls back to raw id when not found', () => {
    const names = getCardNames(['bank823_generic_credit', 'bank999_missing'])
    expect(names[0]).toContain('將來銀行')
    expect(names[1]).toBe('bank999_missing')
  })

  it('groupByBank returns sorted, non-empty groups', () => {
    const groups = groupByBank()
    expect(groups.length).toBeGreaterThanOrEqual(21)
    expect(groups[0].bank_code <= groups[1].bank_code).toBe(true)
    for (const g of groups) expect(g.cards.length).toBeGreaterThan(0)
  })
})
