import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CHECKLIST_ITEMS, SITUATIONS, SITUATION_GROUPS } from '../src/content/deductions'
import { getValidYear } from '../src/lib/numbers'
import {
  filterBySituations,
  groupByCategory,
  CATEGORY_LABELS,
} from '../src/lib/checklist'
import { formatChecklistMarkdown } from '../src/lib/exportChecklist'
import { ChecklistResult } from '../src/components/ChecklistResult'
import { DeductionCard } from '../src/components/DeductionCard'
import { CHECKLIST_USAGE_REMINDER_COMPLEX_ITEMS, WEALTH_CLAUSE_NOTICE } from '../src/lib/checklistCardCopy'
import { ITEM_INLINE_FIELDS } from '../src/content/inlineFields'
import type { CardInlineField, ChecklistItem } from '../src/types/content'

function makeItem(overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id: 'test-item',
    title: 'Test',
    category: 'general_deductions',
    situations: ['salary_income'],
    why_it_matters: 'test',
    eligibility_cues: [],
    documents_to_prepare: [],
    source_refs: [{ source_id: 'src', label: 'Label', authority: 'Auth' }],
    show_wealth_clause_notice: false,
    ...overrides,
  }
}

// ── Situation-to-item mapping ─────────────────────────────────────────────────

describe('filterBySituations', () => {
  const published = CHECKLIST_ITEMS

  it('returns empty array when no situations selected', () => {
    expect(filterBySituations(published, [])).toHaveLength(0)
  })

  it('salary_income returns baseline items plus gross income', () => {
    const items = filterBySituations(published, ['salary_income'])
    const ids = items.map((i) => i.id)
    expect(ids).toContain('exemption-general')
    expect(ids).toContain('standard-deduction-single')
    expect(ids).toContain('gross-income')
  })

  it('married returns exemption and married standard deduction', () => {
    const items = filterBySituations(published, ['married'])
    const ids = items.map((i) => i.id)
    expect(ids).toContain('exemption-general')
    expect(ids).toContain('standard-deduction-married')
    expect(ids).not.toContain('standard-deduction-single')
  })

  it('married with salary_income does not return single standard deduction', () => {
    const items = filterBySituations(published, ['married', 'salary_income'])
    const ids = items.map((i) => i.id)
    expect(ids).toContain('standard-deduction-married')
    expect(ids).not.toContain('standard-deduction-single')
  })

  it('medical_expenses returns medical deduction item', () => {
    const items = filterBySituations(published, ['medical_expenses'])
    const ids = items.map((i) => i.id)
    expect(ids).toContain('medical-deduction')
  })

  it('rent returns rent deduction item', () => {
    const items = filterBySituations(published, ['rent'])
    const ids = items.map((i) => i.id)
    expect(ids).toContain('exemption-general')
    expect(ids).toContain('standard-deduction-single')
    expect(ids).toContain('rent-deduction')
  })

  it('overseas_income returns AMT item', () => {
    const items = filterBySituations(published, ['overseas_income'])
    const ids = items.map((i) => i.id)
    expect(ids).toContain('overseas-income-amt')
  })

  it('any non-empty situation returns baseline exemption and standard deduction', () => {
    for (const id of ['rent', 'donations', 'salary_income', 'dividends', 'interest_income', 'other_income', 'overseas_income'] as const) {
      const ids = filterBySituations(published, [id]).map((i) => i.id)
      expect(ids).toContain('exemption-general')
      expect(ids).toContain('standard-deduction-single')
    }
  })

  it('does not include the removed senior exemption item', () => {
    expect(published.map((i) => i.id)).not.toContain('exemption-senior-70')
  })

  it('multiple situations return union of matching items', () => {
    const single = filterBySituations(published, ['donations'])
    const combined = filterBySituations(published, ['donations', 'insurance'])
    expect(combined.length).toBeGreaterThan(single.length)
  })

  it('insurance returns insurance deduction item', () => {
    const ids = filterBySituations(published, ['insurance']).map((i) => i.id)
    expect(ids).toContain('insurance-deduction')
  })

  it('disability returns disability special deduction', () => {
    const ids = filterBySituations(published, ['disability']).map((i) => i.id)
    expect(ids).toContain('disability-special-deduction')
  })

  it('long_term_care returns long-term care deduction', () => {
    const ids = filterBySituations(published, ['long_term_care']).map((i) => i.id)
    expect(ids).toContain('long-term-care-deduction')
  })

  it('mortgage_interest returns mortgage interest deduction', () => {
    const ids = filterBySituations(published, ['mortgage_interest']).map((i) => i.id)
    expect(ids).toContain('mortgage-interest-deduction')
  })

  it('childcare returns childcare deduction', () => {
    const ids = filterBySituations(published, ['childcare']).map((i) => i.id)
    expect(ids).toContain('childcare-deduction')
  })

  it('education_tuition returns education tuition deduction', () => {
    const ids = filterBySituations(published, ['education_tuition']).map((i) => i.id)
    expect(ids).toContain('education-tuition-deduction')
  })

  it('savings_investment returns savings investment deduction', () => {
    const ids = filterBySituations(published, ['savings_investment']).map((i) => i.id)
    expect(ids).toContain('savings-investment-deduction')
  })

  it('dividends returns dividends tax choice item', () => {
    const ids = filterBySituations(published, ['dividends']).map((i) => i.id)
    expect(ids).toContain('dividend-income')
  })

  it('interest income returns interest and linked savings investment items', () => {
    const ids = filterBySituations(published, ['interest_income', 'savings_investment']).map((i) => i.id)
    expect(ids).toContain('interest-income')
    expect(ids).toContain('savings-investment-deduction')
  })

  it('other income returns other income item', () => {
    const ids = filterBySituations(published, ['other_income']).map((i) => i.id)
    expect(ids).toContain('other-income')
  })

  it('every SITUATIONS id maps to at least one published item', () => {
    for (const situation of SITUATIONS) {
      const items = filterBySituations(published, [situation.id])
      expect(items.length, `situation "${situation.id}" has no published items`).toBeGreaterThan(0)
    }
  })
})

// ── Category grouping ─────────────────────────────────────────────────────────

describe('groupByCategory', () => {
  const published = CHECKLIST_ITEMS

  it('returns groups in priority order: gross income, overseas income, exemptions, general, special', () => {
    const all = filterBySituations(published, SITUATIONS.map((s) => s.id))
    const groups = groupByCategory(all)
    const categories = groups.map((g) => g.category)
    const grossIdx = categories.indexOf('gross_income')
    const overseasIdx = categories.indexOf('overseas_income')
    const exemptIdx = categories.indexOf('exemptions')
    const generalIdx = categories.indexOf('general_deductions')
    const specialIdx = categories.indexOf('special_deductions')
    expect(grossIdx).toBeLessThan(overseasIdx)
    expect(overseasIdx).toBeLessThan(exemptIdx)
    expect(exemptIdx).toBeLessThan(generalIdx)
    expect(generalIdx).toBeLessThan(specialIdx)
    expect(categories).not.toContain('further_check')
  })

  it('groups domestic income cards under gross income; overseas AMT card in its own section', () => {
    const groups = groupByCategory(filterBySituations(published, [
      'salary_income',
      'dividends',
      'interest_income',
      'other_income',
      'overseas_income',
    ]))
    const gross = groups.find((g) => g.category === 'gross_income')
    const overseas = groups.find((g) => g.category === 'overseas_income')
    expect(gross?.label).toBe('綜合所得總額')
    expect(gross?.items.map((i) => i.id)).toEqual([
      'gross-income',
      'dividend-income',
      'interest-income',
      'other-income',
    ])
    expect(gross?.items.map((i) => i.title)).toEqual([
      '薪資收入',
      '股利收入',
      '利息收入',
      '其他收入',
    ])
    expect(overseas?.label).toBe('海外所得')
    expect(overseas?.items.map((i) => i.id)).toEqual(['overseas-income-amt'])
  })

  it('each group has a human-readable label', () => {
    const all = filterBySituations(published, SITUATIONS.map((s) => s.id))
    const groups = groupByCategory(all)
    for (const group of groups) {
      expect(group.label).toBeTruthy()
    }
  })

  it('keeps selected special deduction result cards in homepage order', () => {
    const selected = [
      'savings_investment',
      'disability',
      'childcare',
      'education_tuition',
      'long_term_care',
      'rent',
    ] as const
    const groups = groupByCategory(filterBySituations(published, [...selected]))
    const special = groups.find((g) => g.category === 'special_deductions')
    expect(special?.items.map((i) => i.id)).toEqual([
      'savings-investment-deduction',
      'disability-special-deduction',
      'childcare-deduction',
      'education-tuition-deduction',
      'long-term-care-deduction',
      'rent-deduction',
    ])
  })

  it('keeps directly mapped result card titles aligned with homepage labels', () => {
    const titleBySituation = new Map(
      CHECKLIST_ITEMS
        .filter((item) => item.situations.length === 1)
        .map((item) => [item.situations[0], item.title]),
    )
    const directlyMappedIds = [
      'insurance',
      'medical_expenses',
      'mortgage_interest',
      'childcare',
      'education_tuition',
      'long_term_care',
      'rent',
    ] as const

    for (const id of directlyMappedIds) {
      const situation = SITUATIONS.find((s) => s.id === id)
      expect(titleBySituation.get(id)).toBe(situation?.label)
    }
  })
})

// ── Source requirements ───────────────────────────────────────────────────────

describe('checklist item source integrity', () => {
  it('every item has at least one source_ref', () => {
    for (const item of CHECKLIST_ITEMS) {
      expect(item.source_refs.length).toBeGreaterThan(0)
    }
  })

  it('every source_ref has a non-empty source_id and label', () => {
    for (const item of CHECKLIST_ITEMS) {
      for (const ref of item.source_refs) {
        expect(ref.source_id).toBeTruthy()
        expect(ref.label).toBeTruthy()
      }
    }
  })

  it('every item has a non-empty why_it_matters', () => {
    for (const item of CHECKLIST_ITEMS) {
      expect(item.why_it_matters).toBeTruthy()
    }
  })

  it('all source_ids use stable public identifiers', () => {
    for (const item of CHECKLIST_ITEMS) {
      for (const ref of item.source_refs) {
        expect(ref.source_id).toMatch(/^[a-z0-9_:-]+$/)
      }
    }
  })

  it('every source_ref has public source detail text', () => {
    for (const item of CHECKLIST_ITEMS) {
      for (const ref of item.source_refs) {
        expect(ref.label).toBeTruthy()
        expect(ref.authority).toBeTruthy()
      }
    }
  })
})

// ── User-facing traceability ─────────────────────────────────────────────────

describe('ChecklistResult traceability UI', () => {
  const groups = groupByCategory(CHECKLIST_ITEMS)
  const html = renderToStaticMarkup(
    createElement(ChecklistResult, {
      groups,
      totalSelected: SITUATIONS.length,
      selectedSituations: [],
      cardInputMap: {},
      onCardInputChange: () => undefined,
      onReset: () => undefined,
    }),
  )

  it('shows public reference and filing reminder wording', () => {
    expect(html).toContain('來源與官方參考')
    expect(html).toContain('使用提醒')
    expect(html).toContain('財政部電子申報系統')
  })

  it('does not expose internal verification status labels', () => {
    expect(html).not.toContain('已驗證')
    expect(html).not.toContain('部分驗證')
    expect(html).not.toContain('研究待補')
    expect(html).not.toContain('verified')
    expect(html).not.toContain('partially_verified')
    expect(html).not.toContain('unverified')
  })

  it('shows high-risk official confirmation language', () => {
    expect(html).toContain('請以財政部電子申報系統與官方資料確認')
  })
})

// ── Standard vs itemized filing reminder panel ────────────────────────────────

describe('ChecklistResult standard vs itemized filing reminder panel', () => {
  const published = CHECKLIST_ITEMS

  function summaryRowMarkup(html: string, testId: string): string {
    const rowIndex = html.indexOf(`data-testid="${testId}"`)
    expect(rowIndex).toBeGreaterThanOrEqual(0)
    const nextRowIndex = html.indexOf('data-testid="summary-row-', rowIndex + 1)
    return html.slice(rowIndex, nextRowIndex === -1 ? undefined : nextRowIndex)
  }

  function renderResult(selectedSituations: Parameters<typeof filterBySituations>[1]) {
    const groups = groupByCategory(filterBySituations(published, selectedSituations))
    return renderToStaticMarkup(
      createElement(ChecklistResult, {
        groups,
        totalSelected: selectedSituations.length,
        selectedSituations,
        cardInputMap: {},
        onCardInputChange: () => undefined,
        onReset: () => undefined,
      }),
    )
  }

  it('shows the single standard deduction baseline for non-married users', () => {
    const html = renderResult(['salary_income'])
    expect(html).toContain('data-testid="standard-itemized-panel"')
    expect(html).toContain('推薦：標準扣除')
    expect(html).not.toContain('建議確認')
    expect(html).toContain('131,000')
  })

  it('shows self age but not spouse age for single filing exemption inputs', () => {
    const html = renderResult(['salary_income'])
    expect(html).toContain('本人年齡')
    expect(html).not.toContain('配偶年齡')
  })

  it('shows self and spouse age for married filing exemption inputs', () => {
    const html = renderResult(['married', 'salary_income'])
    expect(html).toContain('本人年齡')
    expect(html).toContain('配偶年齡')
  })

  it('keeps exemption summary pending until required age band is selected', () => {
    const html = renderResult(['salary_income'])
    expect(summaryRowMarkup(html, 'summary-row-exemptions')).toContain('前往填寫')
  })

  it('calculates exemption summary from filer age and dependent counts', () => {
    const groups = groupByCategory(filterBySituations(published, ['salary_income']))
    const html = renderToStaticMarkup(
      createElement(ChecklistResult, {
        groups,
        totalSelected: 1,
        selectedSituations: ['salary_income'],
        cardInputMap: {
          'exemption-general': {
            self_age_band: 'over_70',
            exemption_under70_count: '1',
            exemption_over70_count: '1',
          },
        },
        onCardInputChange: () => undefined,
        onReset: () => undefined,
      }),
    )
    expect(summaryRowMarkup(html, 'summary-row-exemptions')).toContain('388,000 元')
  })

  it('ignores stale income inputs for cards that are not currently selected', () => {
    const groups = groupByCategory(filterBySituations(published, ['salary_income']))
    const html = renderToStaticMarkup(
      createElement(ChecklistResult, {
        groups,
        totalSelected: 1,
        selectedSituations: ['salary_income'],
        cardInputMap: {
          'exemption-general': { self_age_band: 'under_70' },
          'gross-income': { self_income: '300000' },
          'dividend-income': { self_income: '100000' },
          'overseas-income-amt': { overseas_income_amount: '8000000' },
        },
        onCardInputChange: () => undefined,
        onReset: () => undefined,
      }),
    )
    const grossSummaryRow = summaryRowMarkup(html, 'summary-row-gross_income')
    expect(grossSummaryRow).toContain('82,000 元')
    expect(grossSummaryRow).not.toContain('182,000 元')
  })

  it('renders the standard vs itemized panel inside the general deductions section', () => {
    const html = renderResult(['salary_income'])
    const generalSectionIndex = html.indexOf('data-testid="checklist-section-general_deductions"')
    const generalLabelIndex = html.indexOf('一般扣除額（標準或列舉擇一）', generalSectionIndex)
    const panelIndex = html.indexOf('data-testid="standard-itemized-panel"', generalSectionIndex)
    const specialSectionIndex = html.indexOf('data-testid="checklist-section-special_deductions"')

    expect(generalSectionIndex).toBeGreaterThanOrEqual(0)
    expect(generalLabelIndex).toBeGreaterThan(generalSectionIndex)
    expect(panelIndex).toBeGreaterThan(generalLabelIndex)
    expect(specialSectionIndex === -1 || panelIndex < specialSectionIndex).toBe(true)
  })

  it('shows the married standard deduction baseline and hides the single standard item for married users', () => {
    const html = renderResult(['married', 'salary_income'])
    expect(html).toContain('data-testid="standard-itemized-panel"')
    expect(html).toContain('262,000')
    expect(html).toContain('推薦：標準扣除')
    expect(html).not.toContain('建議確認')
    expect(html).not.toContain('標準扣除額（單身）')
    expect(html).toContain('標準扣除額（配偶合併申報）')
  })

  it('shows married standard title when itemized cards are present', () => {
    const html = renderResult(['married', 'donations'])
    expect(html).toContain('data-testid="standard-itemized-panel"')
    expect(html).toContain('262,000')
    expect(html).toContain('標準扣除額（配偶合併申報）')
    expect(html).not.toContain('標準扣除額（單身）')
  })

  it('shows document prompts for selected itemizable situations', () => {
    const html = renderResult(['donations', 'medical_expenses', 'mortgage_interest', 'rent'])
    expect(html).toContain('列舉扣除額')
    expect(html).toContain('正式捐贈收據')
    expect(html).toContain('醫療收據正本')
    expect(html).toContain('銀行房貸年度利息繳納證明')
    expect(html).not.toContain('房屋租金支出：租賃契約書影本')
  })

  it('stays visible with an empty itemized prompt state', () => {
    const html = renderResult(['salary_income'])
    expect(html).toContain('data-testid="standard-itemized-panel"')
    expect(html).toContain('目前清單中沒有列舉扣除相關項目')
  })

  it('includes source and official confirmation language without best-choice claims', () => {
    const html = renderResult(['donations'])
    expect(html).toContain('114年度申報書說明')
    expect(html).toContain('財政部電子申報系統')
    expect(html).toContain('申報提醒')
    expect(html).not.toContain('最佳選擇')
    expect(html).not.toContain('最划算')
  })

  it('keeps the general deduction section header blank when itemized amounts are incomplete', () => {
    const published = CHECKLIST_ITEMS
    const groups = groupByCategory(filterBySituations(published, ['donations']))
    const html = renderToStaticMarkup(
      createElement(ChecklistResult, {
        groups,
        totalSelected: 1,
        selectedSituations: ['donations'],
        cardInputMap: {},
        onCardInputChange: () => undefined,
        onReset: () => undefined,
      }),
    )
    const generalIdx = html.indexOf('data-testid="checklist-section-general_deductions"')
    expect(generalIdx).toBeGreaterThanOrEqual(0)
    const afterGeneral = html.slice(generalIdx, generalIdx + 800)
    expect(afterGeneral).not.toContain('待填入')
    expect(html).toContain('前往填寫')
  })

  it('shows max(standard, itemized) in the section header when itemized lines are complete', () => {
    const published = CHECKLIST_ITEMS
    const groups = groupByCategory(filterBySituations(published, ['donations']))
    const html = renderToStaticMarkup(
      createElement(ChecklistResult, {
        groups,
        totalSelected: 1,
        selectedSituations: ['donations'],
        cardInputMap: { 'donations-deduction': { donation_amount_government: '500000' } },
        onCardInputChange: () => undefined,
        onReset: () => undefined,
      }),
    )
    const generalIdx = html.indexOf('data-testid="checklist-section-general_deductions"')
    expect(generalIdx).toBeGreaterThanOrEqual(0)
    const afterGeneral = html.slice(generalIdx, generalIdx + 800)
    expect(afterGeneral).toContain('500,000')
    expect(afterGeneral).not.toContain('待填入')
  })

  it('shows standard method label in summary when standard deduction is used', () => {
    const html = renderResult(['salary_income'])
    expect(html).toContain('data-testid="general-deduction-method-label"')
    expect(html).toContain('標準')
  })

  it('shows itemized method label in summary when itemized deduction is used', () => {
    const groups = groupByCategory(filterBySituations(CHECKLIST_ITEMS, ['donations']))
    const html = renderToStaticMarkup(
      createElement(ChecklistResult, {
        groups,
        totalSelected: 1,
        selectedSituations: ['donations'],
        cardInputMap: { 'donations-deduction': { donation_amount_government: '500000' } },
        onCardInputChange: () => undefined,
        onReset: () => undefined,
      }),
    )
    expect(html).toContain('data-testid="general-deduction-method-label"')
    expect(html).toContain('列舉')
  })

  it('keeps summary method as standard when itemized total equals standard', () => {
    const groups = groupByCategory(filterBySituations(CHECKLIST_ITEMS, ['donations']))
    const html = renderToStaticMarkup(
      createElement(ChecklistResult, {
        groups,
        totalSelected: 1,
        selectedSituations: ['donations'],
        cardInputMap: { 'donations-deduction': { donation_amount_government: '131000' } },
        onCardInputChange: () => undefined,
        onReset: () => undefined,
      }),
    )
    expect(html).toContain('推薦：標準扣除（金額相同）')
    expect(html).toContain('data-testid="general-deduction-method-label"')
    expect(html).toContain('標準')
    expect(html).not.toContain('兩者皆可（金額相同）')
  })

  it('highlights standard card when standard deduction is recommended', () => {
    const groups = groupByCategory(filterBySituations(CHECKLIST_ITEMS, ['donations']))
    const html = renderToStaticMarkup(
      createElement(ChecklistResult, {
        groups,
        totalSelected: 1,
        selectedSituations: ['donations'],
        cardInputMap: { 'donations-deduction': { donation_amount_government: '100000' } },
        onCardInputChange: () => undefined,
        onReset: () => undefined,
      }),
    )
    expect(html).toContain('data-testid="standard-deduction-container" class="rounded-xl border px-4 py-3 border-blue-400 bg-blue-50/30 shadow-sm"')
    expect(html).toContain('data-testid="itemized-deduction-card" class="rounded-xl border px-4 py-3 border-gray-200"')
    expect(html).toContain('<p class="mb-0 text-base font-semibold text-blue-700">標準扣除額：131,000 元 (單身)</p>')
    expect(html).toContain('<p class="mb-2 text-base font-semibold text-gray-400">列舉扣除額</p>')
    expect(html).toContain('checklist-formula-card border-gray-300 bg-gray-50')
  })

  it('highlights itemized card when itemized deduction is recommended', () => {
    const groups = groupByCategory(filterBySituations(CHECKLIST_ITEMS, ['donations']))
    const html = renderToStaticMarkup(
      createElement(ChecklistResult, {
        groups,
        totalSelected: 1,
        selectedSituations: ['donations'],
        cardInputMap: { 'donations-deduction': { donation_amount_government: '500000' } },
        onCardInputChange: () => undefined,
        onReset: () => undefined,
      }),
    )
    expect(html).toContain('data-testid="itemized-deduction-card" class="rounded-xl border px-4 py-3 border-blue-400 bg-blue-50/30 shadow-sm"')
    expect(html).toContain('data-testid="standard-deduction-container" class="rounded-xl border px-4 py-3 border-gray-200"')
    expect(html).toContain('<p class="mb-0 text-base font-semibold text-gray-400">標準扣除額：131,000 元 (單身)</p>')
    expect(html).toContain('<p class="mb-2 text-base font-semibold text-blue-700">列舉扣除額</p>')
  })

  it('keeps standard highlight when itemized total equals standard', () => {
    const groups = groupByCategory(filterBySituations(CHECKLIST_ITEMS, ['donations']))
    const html = renderToStaticMarkup(
      createElement(ChecklistResult, {
        groups,
        totalSelected: 1,
        selectedSituations: ['donations'],
        cardInputMap: { 'donations-deduction': { donation_amount_government: '131000' } },
        onCardInputChange: () => undefined,
        onReset: () => undefined,
      }),
    )
    expect(html).toContain('data-testid="standard-deduction-container" class="rounded-xl border px-4 py-3 border-blue-400 bg-blue-50/30 shadow-sm"')
    expect(html).toContain('data-testid="itemized-deduction-card" class="rounded-xl border px-4 py-3 border-gray-200"')
  })
})

// ── Annual numbers from canonical source ──────────────────────────────────────

describe('annual number sourcing', () => {
  it('standard_deduction_single item why_it_matters contains 131,000', () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === 'standard-deduction-single')
    expect(item?.why_it_matters).toContain('131,000')
  })

  it('standard_deduction_married item why_it_matters contains 262,000', () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === 'standard-deduction-married')
    expect(item?.why_it_matters).toContain('262,000')
  })

  it('exemption-general item why_it_matters contains 97,000', () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === 'exemption-general')
    expect(item?.why_it_matters).toContain('97,000')
  })

  it('mortgage-interest item why_it_matters contains 300,000', () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === 'mortgage-interest-deduction')
    expect(item?.why_it_matters).toContain('300,000')
  })

  it('long-term-care item why_it_matters contains 180,000', () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === 'long-term-care-deduction')
    expect(item?.why_it_matters).toContain('180,000')
  })

  it('childcare item why_it_matters contains 150,000 and 225,000', () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === 'childcare-deduction')
    expect(item?.why_it_matters).toContain('150,000')
    expect(item?.why_it_matters).toContain('225,000')
  })

  it('rent item why_it_matters contains 180,000', () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === 'rent-deduction')
    expect(item?.why_it_matters).toContain('180,000')
  })

  it('education tuition item why_it_matters contains 25,000', () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === 'education-tuition-deduction')
    expect(item?.why_it_matters).toContain('25,000')
  })

  it('savings investment item why_it_matters contains 270,000', () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === 'savings-investment-deduction')
    expect(item?.why_it_matters).toContain('270,000')
  })

  it('gross-income why_it_matters contains 218,000', () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === 'gross-income')
    expect(item?.why_it_matters).toContain('218,000')
  })

  it('exemption-general eligibility cues use valid_year - 70 birth year', () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === 'exemption-general')
    expect(item?.eligibility_cues.join('\n')).toContain(`民國${getValidYear() - 70}年`)
  })

  it('childcare-deduction eligibility cues use valid_year - 6 birth year', () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === 'childcare-deduction')
    expect(item?.eligibility_cues.join('\n')).toContain(`民國${getValidYear() - 6}年`)
  })

  it('disability-special-deduction why_it_matters contains 218,000', () => {
    const item = CHECKLIST_ITEMS.find((i) => i.id === 'disability-special-deduction')
    expect(item?.why_it_matters).toContain('218,000')
  })
})

// ── CATEGORY_LABELS coverage ──────────────────────────────────────────────────

describe('CATEGORY_LABELS', () => {
  it('covers all categories used in CHECKLIST_ITEMS', () => {
    const usedCategories = new Set(CHECKLIST_ITEMS.map((i) => i.category))
    for (const cat of usedCategories) {
      expect(CATEGORY_LABELS[cat]).toBeTruthy()
    }
  })
})

// ── SITUATION_GROUPS coverage ─────────────────────────────────────────────────

describe('SITUATION_GROUPS', () => {
  const allGroupedIds = SITUATION_GROUPS.flatMap((g) => g.situationIds)
  const allSituationIds = SITUATIONS.map((s) => s.id)

  it('contains exactly 4 groups', () => {
    expect(SITUATION_GROUPS).toHaveLength(4)
  })

  it('groups are in filing order: filing-method, income-sources, general-deductions, special-deductions', () => {
    expect(SITUATION_GROUPS.map((g) => g.id)).toEqual([
      'filing-method',
      'income-sources',
      'general-deductions',
      'special-deductions',
    ])
  })

  it('orders special deduction situations by the requested homepage order', () => {
    const special = SITUATION_GROUPS.find((g) => g.id === 'special-deductions')
    expect(special?.situationIds).toEqual([
      'disability',
      'childcare',
      'education_tuition',
      'long_term_care',
      'rent',
    ])
  })

  it('union of all visible situationIds equals all 15 public SITUATIONS ids', () => {
    expect(SITUATIONS).toHaveLength(15)
    expect(allGroupedIds.sort()).toEqual(allSituationIds.sort())
  })

  it('no situationId appears in more than one group', () => {
    const seen = new Set<string>()
    for (const id of allGroupedIds) {
      expect(seen.has(id), `duplicate situationId "${id}"`).toBe(false)
      seen.add(id)
    }
  })

  it('each group has a non-empty title and description', () => {
    for (const group of SITUATION_GROUPS) {
      expect(group.title).toBeTruthy()
      expect(group.description).toBeTruthy()
    }
  })
})

// ── ChecklistResult export UI ─────────────────────────────────────────────────

describe('ChecklistResult export panel', () => {
  const published = CHECKLIST_ITEMS
  const allGroups = groupByCategory(filterBySituations(published, SITUATIONS.map((s) => s.id)))

  const htmlWithResults = renderToStaticMarkup(
    createElement(ChecklistResult, {
      groups: allGroups,
      totalSelected: SITUATIONS.length,
      selectedSituations: [],
      cardInputMap: {},
      onCardInputChange: () => undefined,
      onReset: () => undefined,
    }),
  )

  const htmlEmpty = renderToStaticMarkup(
    createElement(ChecklistResult, {
      groups: [],
      totalSelected: 0,
      selectedSituations: [],
      cardInputMap: {},
      onCardInputChange: () => undefined,
      onReset: () => undefined,
    }),
  )

  it('result page does not show the removed personalized worksheet entry point', () => {
    expect(htmlWithResults).not.toContain('data-testid="open-personalized-page-btn"')
    expect(htmlWithResults).not.toContain('個人化工作表')
    expect(htmlWithResults).not.toContain('開啟工作表')
  })

  it('result page does not show the removed income type radio group', () => {
    expect(htmlWithResults).not.toContain('name="income_type"')
    expect(htmlWithResults).not.toContain('你的主要收入來源是？')
  })

  it('non-empty result still shows usage reminder', () => {
    expect(htmlWithResults).toContain('使用提醒')
    expect(htmlWithResults).toContain('財政部電子申報系統')
  })

  it('non-empty result still shows official confirmation language', () => {
    expect(htmlWithResults).toContain('請以財政部電子申報系統與官方資料確認')
  })

  it('non-empty result shows a single export entry in heading actions', () => {
    expect(htmlWithResults).toContain('>匯出<')
    expect(htmlWithResults.match(/>匯出</g)?.length).toBe(1)
  })

  it('checklist heading action order is reset, export, then add', () => {
    const resetIndex = htmlWithResults.indexOf('>重新試算<')
    const exportIndex = htmlWithResults.indexOf('>匯出<')
    const addIndex = htmlWithResults.indexOf('>新增項目<')

    expect(resetIndex).toBeGreaterThan(-1)
    expect(exportIndex).toBeGreaterThan(resetIndex)
    expect(addIndex).toBeGreaterThan(exportIndex)
  })

  it('checklist heading action spacing aligns with selector action gap', () => {
    expect(htmlWithResults).toContain('flex items-center gap-3')
  })

  it('empty result does not show copy button', () => {
    expect(htmlEmpty).not.toContain('data-testid="copy-checklist-btn"')
  })

  it('empty result does not show download button', () => {
    expect(htmlEmpty).not.toContain('data-testid="download-checklist-btn"')
  })

  it('empty result does not show print button', () => {
    expect(htmlEmpty).not.toContain('data-testid="print-checklist-btn"')
  })

  it('empty result does not show export privacy notice', () => {
    expect(htmlEmpty).not.toContain('data-testid="export-privacy-notice"')
  })

  it('rendered markup includes print stylesheet hook classes', () => {
    expect(htmlWithResults).toContain('print-container')
    expect(htmlWithResults).toContain('print-card')
    expect(htmlWithResults).toContain('no-print')
  })
})

// ── formatChecklistMarkdown ───────────────────────────────────────────────────

describe('formatChecklistMarkdown', () => {
  const medicalItem = {
    id: 'medical-deduction',
    title: 'Medical expense deduction',
    category: 'general_deductions' as const,
    situations: ['medical_expenses' as const],
    why_it_matters: 'Reduces taxable income for qualifying medical costs.',
    eligibility_cues: [],
    documents_to_prepare: ['Medical receipts'],
    source_refs: [
      { source_id: 'ntbt_medical_expenses', label: 'MOF filing guide', authority: '財政部' },
    ],
    show_wealth_clause_notice: false,
  }

  const groups = [
    {
      category: 'general_deductions' as const,
      label: 'General deductions',
      items: [medicalItem],
    },
  ]

  const md = formatChecklistMarkdown(groups, { totalSelected: 1 })

  // Requirement: Markdown Export Content — section/content
  it('contains the category label as a heading', () => {
    expect(md).toContain('General deductions')
  })

  it('contains the item title', () => {
    expect(md).toContain('Medical expense deduction')
  })

  it('contains the document to prepare as a checklist bullet', () => {
    expect(md).toContain('Medical receipts')
  })

  it('contains the public source label', () => {
    expect(md).toContain('MOF filing guide')
  })

  it('contains the source authority', () => {
    expect(md).toContain('財政部')
  })

  it('includes reminder wording about confirming in official filing system', () => {
    expect(md).toContain('財政部電子申報系統')
  })

  it('includes selected situation count', () => {
    expect(md).toContain('1 項')
  })

  it('does not contain raw source_id', () => {
    expect(md).not.toContain('ntbt_medical_expenses')
  })

  // Requirement: Export Privacy Notice — local generation and user-managed storage wording
  it('includes local-generation wording', () => {
    expect(md).toContain('瀏覽器中產生')
  })

  it('includes user-managed storage wording', () => {
    expect(md).toContain('請自行保管')
  })

  it('uses the updated usage reminder in header without removed badge wording', () => {
    const headerMd = formatChecklistMarkdown([], { totalSelected: 0 })
    expect(headerMd).toContain(CHECKLIST_USAGE_REMINDER_COMPLEX_ITEMS)
    expect(headerMd).not.toContain('標示「需進一步確認」的項目')
  })
})

// ── DeductionCard inline input ────────────────────────────────────────────────

describe('DeductionCard inline input fields', () => {
  const salaryField: CardInlineField = {
    id: 'salary_amount',
    label: '今年薪資所得總額',
    type: 'number',
    unit: '元',
    capKey: 'special_deduction_salary',
  }

  const noCapField: CardInlineField = {
    id: 'donation_amount_government',
    label: '捐贈金額',
    type: 'number',
    unit: '元',
    capKey: null,
  }

  const qualifiedDonationField: CardInlineField = {
    ...noCapField,
    id: 'donation_amount_qualified',
    label: '一般捐贈金額',
    feedbackRule: 'qualified-donation',
  }

  const mortgageInterestField: CardInlineField = {
    ...noCapField,
    id: 'mortgage_interest_amount',
    label: '購屋借款利息',
    feedbackRule: 'mortgage-interest',
  }

  const perUnitCountField: CardInlineField = {
    id: 'exemption_under70_count',
    label: '一般免稅額人數（未滿 70 歲）',
    type: 'number',
    unit: '人',
    capKey: null,
    perUnitKey: 'exemption_general',
  }

  const choiceField: CardInlineField = {
    id: 'self_age_band',
    label: '本人年齡',
    type: 'choice',
    unit: '',
    capKey: null,
    choices: [
      { value: 'under_70', label: '未滿 70 歲' },
      { value: 'over_70', label: '70 歲以上' },
    ],
  }

  const splitPerUnitCountField: CardInlineField = {
    id: 'childcare_count',
    label: '幼兒人數',
    type: 'number',
    unit: '人',
    capKey: null,
    splitPerUnitKeys: {
      firstKey: 'special_deduction_childcare_first',
      additionalKey: 'special_deduction_childcare_additional',
    },
  }

  it('renders without input area when inlineFields is empty', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, { item: makeItem(), inlineFields: [] }),
    )
    expect(html).not.toContain('type="number"')
  })

  it('renders labeled number input for each inline field', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [salaryField],
        inputValues: {},
      }),
    )
    expect(html).toContain('type="number"')
    expect(html).toContain('今年薪資所得總額')
    expect(html).toContain('元')
  })

  it('renders choice fields as segmented buttons', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [choiceField],
        inputValues: { self_age_band: 'over_70' },
      }),
    )
    expect(html).toContain('data-testid="card-choice-test-item-self_age_band"')
    expect(html).toContain('未滿 70 歲')
    expect(html).toContain('70 歲以上')
    expect(html).toContain('aria-pressed="true"')
  })

  it('shows green cap feedback when value <= cap', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [salaryField],
        inputValues: { salary_amount: '100000' },
      }),
    )
    expect(html).toContain('text-gray-700')
    expect(html).toContain('可申報上限為 218,000 元')
  })

  it('shows red cap feedback when value > cap', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [salaryField],
        inputValues: { salary_amount: '300000' },
      }),
    )
    expect(html).toContain('text-red-700')
    expect(html).toContain('已達可申報上限 218,000 元')
  })

  it('shows cap hint when capped field is empty', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [salaryField],
        inputValues: { salary_amount: '' },
      }),
    )
    expect(html).toContain('可申報上限為 218,000 元')
  })

  it('does not show per-unit formula when count field is empty', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [perUnitCountField],
        inputValues: { exemption_under70_count: '' },
      }),
    )
    expect(html).not.toContain('× 97,000 元 ＝')
  })

  it('shows per-unit formula inline when count field has value', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [perUnitCountField],
        inputValues: { exemption_under70_count: '1' },
      }),
    )
    expect(html).not.toContain('1 人 ×')
    expect(html).toContain('× 97,000 元 ＝ <strong>97,000 元</strong>')
  })

  it('keeps split per-unit formula behavior for childcare fields', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [splitPerUnitCountField],
        inputValues: { childcare_count: '2' },
      }),
    )
    expect(html).toContain('1 人 × 150,000 ＋ 1 人 × 225,000 ＝')
    expect(html).toContain('375,000 元')
  })

  it('shows no feedback when capKey is null', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [noCapField],
        inputValues: { donation_amount_government: '50000' },
      }),
    )
    expect(html).not.toContain('超過上限時以上限試算')
  })

  it('shows qualified donation cap feedback from gross income', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [qualifiedDonationField],
        inputValues: { donation_amount_qualified: '300000' },
        feedbackContext: { grossIncomeAmount: 1_000_000 },
      }),
    )
    expect(html).toContain('text-red-700')
    expect(html).toContain('已達可申報上限 200,000 元')
  })

  it('shows qualified donation cap hint before input when gross income exists', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [qualifiedDonationField],
        inputValues: { donation_amount_qualified: '' },
        feedbackContext: { grossIncomeAmount: 1_000_000 },
      }),
    )
    expect(html).toContain('可申報上限為 200,000 元')
    expect(html).not.toContain('綜合所得總額 20%')
  })

  it('shows both qualified donation caps when dividend income is filled', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [qualifiedDonationField],
        inputValues: { donation_amount_qualified: '300000' },
        feedbackContext: {
          grossIncomeAmount: 1_000_000,
          dividendMergedGrossIncomeAmount: 1_000_000,
          dividendSeparateGrossIncomeAmount: 700_000,
        },
      }),
    )
    expect(html).toContain('若股利合併計稅，捐贈金額上限為 200,000 元')
    expect(html).toContain('若股利分開計稅，捐款金額上限為 140,000 元')
    expect(html).not.toContain('已達可申報上限')
  })

  it('asks for gross income before qualified donation cap can be judged', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [qualifiedDonationField],
        inputValues: { donation_amount_qualified: '1' },
        feedbackContext: { grossIncomeAmount: null },
      }),
    )
    expect(html).toContain('填寫')
    expect(html).toContain('綜合所得總額')
    expect(html).toContain('後顯示申報上限')
  })

  it('shows mortgage interest cap feedback after savings investment deduction', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [mortgageInterestField],
        inputValues: { mortgage_interest_amount: '450000' },
        feedbackContext: {
          savingsInvestmentEnabled: true,
          savingsInvestmentDeductionAmount: 100_000,
        },
      }),
    )
    expect(html).toContain('text-red-700')
    expect(html).toContain('扣除「')
    expect(html).toContain('儲蓄投資特別扣除額')
    expect(html).toContain('」後已達可申報上限 300,000 元')
  })

  it('shows mortgage interest net eligible amount when below cap after savings deduction', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [mortgageInterestField],
        inputValues: { mortgage_interest_amount: '210111' },
        feedbackContext: {
          savingsInvestmentEnabled: true,
          savingsInvestmentDeductionAmount: 100_000,
        },
      }),
    )
    expect(html).toContain('text-gray-700')
    expect(html).toContain('扣除「')
    expect(html).toContain('儲蓄投資特別扣除額')
    expect(html).toContain('」後為 110,111 元')
  })

  it('shows mortgage interest cap hint before input', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem(),
        inlineFields: [mortgageInterestField],
        inputValues: { mortgage_interest_amount: '' },
        feedbackContext: { savingsInvestmentEnabled: true },
      }),
    )
    expect(html).toContain('須先扣除「')
    expect(html).toContain('儲蓄投資特別扣除額')
    expect(html).toContain('」')
    expect(html).not.toContain('可申報上限為 300,000 元')
  })

  it('overseas-income-amt: salary-like and implicit-zero labels omit （選填）', () => {
    const fields = ITEM_INLINE_FIELDS['overseas-income-amt']
    expect(fields).toHaveLength(2)
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem({ id: 'overseas-income-amt', title: '海外所得' }),
        inlineFields: fields,
        inputValues: { overseas_income_amount: '500000' },
      }),
    )
    expect(html).not.toContain('海外所得（選填）')
    expect(html).not.toContain('海外繳納之所得稅（選填）')
    expect(html).toContain('placeholder="輸入金額"')
    expect(html).toContain('placeholder="預設 0"')
    expect(html).toContain('data-testid="card-input-overseas-income-amt-overseas_income_tax_paid"')
    expect(html).toContain('value="500000"')
    expect(html).toContain('value="0"')
  })

  it('overseas-income-amt: tax field reflects stored value when set', () => {
    const fields = ITEM_INLINE_FIELDS['overseas-income-amt']
    const html = renderToStaticMarkup(
      createElement(DeductionCard, {
        item: makeItem({ id: 'overseas-income-amt' }),
        inlineFields: fields,
        inputValues: { overseas_income_tax_paid: '12000' },
      }),
    )
    expect(html).toContain('value="12000"')
  })
})

// ── DeductionCard wealth-clause footer notice ─────────────────────────────────

describe('DeductionCard show_wealth_clause_notice', () => {
  it('does not show wealth-clause notice when false', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, { item: makeItem({ show_wealth_clause_notice: false }) }),
    )
    expect(html).not.toContain(WEALTH_CLAUSE_NOTICE)
  })

  it('shows wealth-clause notice when true', () => {
    const html = renderToStaticMarkup(
      createElement(DeductionCard, { item: makeItem({ show_wealth_clause_notice: true }) }),
    )
    expect(html).toContain(WEALTH_CLAUSE_NOTICE)
  })
})
