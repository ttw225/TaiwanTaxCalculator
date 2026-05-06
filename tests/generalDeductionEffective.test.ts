import { describe, it, expect } from 'vitest'
import { getItemizedItemAmount, resolveGeneralDeduction } from '../src/lib/generalDeductionEffective'
import type { CardInputMap } from '../src/types/content'
import type { CategoryGroup } from '../src/lib/checklist'
import type { ChecklistItem } from '../src/types/content'

function item(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: 'test-item',
    title: 'Test',
    category: 'general_deductions',
    situations: ['salary_income'],
    why_it_matters: 'test',
    eligibility_cues: [],
    documents_to_prepare: [],
    source_refs: [{ source_id: 'src', label: 'Label' }],
    show_wealth_clause_notice: false,
    ...overrides,
  }
}

describe('resolveGeneralDeduction', () => {
  const standardSingle = 131_000
  const standardMarried = 262_000

  it('returns standard_only when no itemized checklist cards', () => {
    const groups: CategoryGroup[] = [
      {
        category: 'general_deductions',
        label: '一般扣除額（標準或列舉擇一）',
        items: [item({ id: 'standard-deduction-single', title: '標準' })],
      },
    ]
    const cardInputMap: CardInputMap = {}
    expect(resolveGeneralDeduction(groups, cardInputMap, false)).toEqual({
      status: 'standard_only',
      amount: standardSingle,
    })
  })

  it('returns pending_itemized when an itemized card has unfilled amount', () => {
    const groups: CategoryGroup[] = [
      {
        category: 'general_deductions',
        label: '一般扣除額（標準或列舉擇一）',
        items: [
          item({ id: 'standard-deduction-single' }),
          item({ id: 'donations-deduction', title: '捐贈' }),
        ],
      },
    ]
    expect(resolveGeneralDeduction(groups, {}, false)).toEqual({ status: 'pending_itemized' })
  })

  it('returns complete with max when itemized sum exceeds standard (single)', () => {
    const groups: CategoryGroup[] = [
      {
        category: 'general_deductions',
        label: '一般扣除額（標準或列舉擇一）',
        items: [item({ id: 'donations-deduction', title: '捐贈' })],
      },
    ]
    const cardInputMap: CardInputMap = {
      'donations-deduction': { donation_amount_government: '500000' },
    }
    expect(resolveGeneralDeduction(groups, cardInputMap, false)).toEqual({
      status: 'complete',
      amount: 500_000,
    })
  })

  it('returns complete with standard when itemized sum is below standard', () => {
    const groups: CategoryGroup[] = [
      {
        category: 'general_deductions',
        label: '一般扣除額（標準或列舉擇一）',
        items: [item({ id: 'donations-deduction', title: '捐贈' })],
      },
    ]
    const cardInputMap: CardInputMap = {
      'donations-deduction': { donation_amount_government: '50000' },
    }
    expect(resolveGeneralDeduction(groups, cardInputMap, false)).toEqual({
      status: 'complete',
      amount: standardSingle,
    })
  })

  it('uses married standard when married filing', () => {
    const groups: CategoryGroup[] = [
      {
        category: 'general_deductions',
        label: '一般扣除額（標準或列舉擇一）',
        items: [item({ id: 'standard-deduction-married', title: '標準已婚' })],
      },
    ]
    expect(resolveGeneralDeduction(groups, {}, true)).toEqual({
      status: 'standard_only',
      amount: standardMarried,
    })
  })

  it('requires every present itemized line before complete', () => {
    const groups: CategoryGroup[] = [
      {
        category: 'general_deductions',
        label: '一般扣除額（標準或列舉擇一）',
        items: [
          item({ id: 'donations-deduction', title: '捐贈' }),
          item({ id: 'medical-deduction', title: '醫療' }),
        ],
      },
    ]
    const partial: CardInputMap = {
      'donations-deduction': { donation_amount_government: '400000' },
    }
    expect(resolveGeneralDeduction(groups, partial, false)).toEqual({ status: 'pending_itemized' })
  })

  it('adds personal insurance and NHI premium without applying per-person cap', () => {
    expect(
      getItemizedItemAmount('insurance-deduction', {
        insurance_personal_amount: '50000',
        insurance_nhi_amount: '10000',
      }),
    ).toBe(60_000)
  })

  it('treats negative inputs as invalid in itemized formula', () => {
    expect(
      getItemizedItemAmount('donations-deduction', {
        donation_amount_government: '-1',
      }),
    ).toBeNull()
    expect(
      getItemizedItemAmount('insurance-deduction', {
        insurance_personal_amount: '-1',
        insurance_nhi_amount: '0',
      }),
    ).toBeNull()
  })

  it('caps qualified donations at 20% of gross income', () => {
    expect(
      getItemizedItemAmount(
        'donations-deduction',
        { donation_amount_qualified: '300000', donation_amount_government: '0' },
        { grossIncomeAmount: 1_000_000 },
      ),
    ).toBe(200_000)
  })

  it('treats qualified donations as pending when gross income is missing', () => {
    expect(
      getItemizedItemAmount(
        'donations-deduction',
        { donation_amount_qualified: '1' },
        { grossIncomeAmount: null },
      ),
    ).toBeNull()
  })

  it('subtracts savings investment deduction from mortgage interest when enabled', () => {
    expect(
      getItemizedItemAmount(
        'mortgage-interest-deduction',
        { mortgage_interest_amount: '300000' },
        { savingsInvestmentEnabled: true, savingsInvestmentDeductionAmount: 100_000 },
      ),
    ).toBe(200_000)
  })

  it('keeps mortgage interest responsive when savings investment is enabled but unfilled', () => {
    expect(
      getItemizedItemAmount(
        'mortgage-interest-deduction',
        { mortgage_interest_amount: '1' },
        { savingsInvestmentEnabled: true, savingsInvestmentDeductionAmount: null },
      ),
    ).toBe(1)
  })
})
