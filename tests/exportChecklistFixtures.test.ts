import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { CHECKLIST_ITEMS } from '../src/content/deductions'
import { filterBySituations, groupByCategory } from '../src/lib/checklist'
import { formatChecklistMarkdown } from '../src/lib/exportChecklist'
import type { CardInputMap, SituationId } from '../src/types/content'

interface Fixture {
  selection: { selected: SituationId[] }
  inputs: { cardInputMap: CardInputMap }
}

function loadFixture(name: string): Fixture {
  const path = resolve(__dirname, 'fixtures/exportChecklist', name)
  return JSON.parse(readFileSync(path, 'utf-8')) as Fixture
}

function exportFromFixture(fixture: Fixture): string {
  const selected = fixture.selection.selected
  const groups = groupByCategory(filterBySituations(CHECKLIST_ITEMS, selected))
  return formatChecklistMarkdown({
    groups,
    cardInputMap: fixture.inputs.cardInputMap,
    isMarriedFiling: selected.includes('married'),
    totalSelected: selected.length,
    exportTime: '2026/05/16 12:00:00',
  })
}

describe('formatChecklistMarkdown · full fixture (married + AMT)', () => {
  const fixture = loadFixture('export-fixture-full.json')
  const md = exportFromFixture(fixture)

  it('uses the new headline and timestamp labels', () => {
    expect(md).toContain('根據您選擇的')
    expect(md).toContain('本文件產生時間')
    // Old labels removed
    expect(md).not.toContain('**已選情境數**')
    expect(md).not.toContain('**項目數**')
    expect(md).not.toContain('**產生時間**')
  })

  it('includes 填寫摘要 aligned with the on-site summary panel (no 基本生活費差額)', () => {
    expect(md).toContain('## 填寫摘要')
    expect(md).toContain('綜合所得總額')
    expect(md).toContain('免稅額')
    expect(md).toContain('一般扣除額')
    expect(md).toContain('特別扣除額')
    // Basic-living difference is part of the formula breakdown, not the summary
    const summarySection = md.split('## 填寫摘要')[1]?.split(/^## /m)[0] ?? ''
    expect(summarySection).not.toContain('基本生活費差額')
  })

  it('summary 海外所得 row shows only the amount, not 已繳國外稅額', () => {
    const summarySection = md.split('## 填寫摘要')[1]?.split(/^## /m)[0] ?? ''
    expect(summarySection).toMatch(/- 海外所得：[\d,]+ 元\s*$/m)
    expect(summarySection).not.toContain('已繳國外稅額')
  })

  it('試算結果 block does not include the second-best savings line', () => {
    expect(md).toContain('## 試算結果')
    expect(md).toContain('推薦組合')
    expect(md).toContain('應繳納稅額')
    const resultSection = md.split('## 試算結果')[1]?.split(/^## /m)[0] ?? ''
    expect(resultSection).not.toMatch(/比次佳組合（.+?）節稅/)
  })

  it('wraps the export with site header and site footer', () => {
    expect(md).toContain('台灣節稅資訊平台')
    expect(md).toContain('## 關於本站')
    expect(md).toContain('## 申報提醒')
  })

  it('lists all scenarios with the first marked ★ 推薦', () => {
    expect(md).toContain('## 所有申報組合')
    expect(md).toContain('★ 推薦')
    // 5 couple modes × 2 dividend modes = 10 scenarios
    const headings = md.match(/^### \d+\. /gm) ?? []
    expect(headings).toHaveLength(10)
  })

  it('shows per-person income breakdown with salary cap note when above cap', () => {
    expect(md).toMatch(/本人：薪資收入 2,000,000 元 − 薪資特別扣除 [\d,]+ 元（已達薪資特別扣除上限/)
    expect(md).toMatch(/配偶：薪資收入 1,200,000 元 − 薪資特別扣除 [\d,]+ 元（已達薪資特別扣除上限/)
  })

  it('includes both dividend-merged and dividend-separate gross-income totals', () => {
    expect(md).toContain('股利合併入所得')
    expect(md).toContain('股利 28% 分開計稅')
  })

  it('renders overseas income section with input numbers', () => {
    expect(md).toContain('## 海外所得')
    expect(md).toContain('海外所得金額：17,800,000 元')
    expect(md).toContain('已繳國外稅額：200,000 元')
  })

  it('renders itemized deduction lines (donations, insurance, medical, mortgage)', () => {
    expect(md).toContain('捐贈')
    expect(md).toContain('保險費')
    expect(md).toContain('醫藥及生育費')
    expect(md).toContain('購屋借款利息')
  })

  it('renders special deduction line items (savings, disability, childcare, education, long-term care, rent)', () => {
    expect(md).toContain('儲蓄投資')
    expect(md).toContain('身心障礙')
    expect(md).toContain('幼兒學前')
    expect(md).toContain('教育學費')
    expect(md).toContain('長期照顧')
    expect(md).toContain('房屋租金支出')
  })

  it('triggers AMT formula section because overseas income ≥ 1M', () => {
    expect(md).toContain('AMT')
  })

  it('uses the 配偶計稅方式 / 股利申報方式 labels for married + dividend', () => {
    expect(md).toContain('配偶計稅方式')
    expect(md).toContain('股利申報方式')
    expect(md).toContain('股利合併')
    expect(md).toContain('股利分開')
  })

  it('scenarios are sorted by finalTax ascending (best first)', () => {
    const scenarioBlocks = md.split(/^### \d+\. /m).slice(1)
    const finalTaxes = scenarioBlocks.map((b) => {
      const m = b.match(/應繳納稅額：([\d,]+) 元/)
      return m ? Number(m[1].replace(/,/g, '')) : NaN
    })
    expect(finalTaxes.every((v) => Number.isFinite(v))).toBe(true)
    const sorted = [...finalTaxes].sort((a, b) => a - b)
    expect(finalTaxes).toEqual(sorted)
  })

  it('keeps the local-generation privacy notice', () => {
    expect(md).toContain('瀏覽器中產生')
    expect(md).toContain('請自行保管')
  })
})

describe('formatChecklistMarkdown · single fixture', () => {
  const fixture = loadFixture('export-fixture-single.json')
  const md = exportFromFixture(fixture)

  it('contains a recommended-scenario block but no second-best savings line', () => {
    expect(md).toContain('## 試算結果')
    expect(md).toContain('推薦組合')
    expect(md).not.toMatch(/比次佳組合（.+?）節稅/)
  })

  it('lists exactly one scenario without the ★ 推薦 prefix (only 1 entry)', () => {
    const headings = md.match(/^### \d+\. /gm) ?? []
    expect(headings).toHaveLength(1)
    expect(md).not.toContain('★ 推薦')
  })

  it('omits 配偶計稅方式 and 股利申報方式 columns when single + no dividend', () => {
    expect(md).not.toContain('配偶計稅方式')
    expect(md).not.toContain('股利申報方式')
  })

  it('omits the 海外所得 section when not selected', () => {
    expect(md).not.toContain('## 海外所得')
  })
})

describe('formatChecklistMarkdown · partial fixture', () => {
  const fixture = loadFixture('export-fixture-partial.json')
  const md = exportFromFixture(fixture)

  it('shows "待填寫" placeholders for missing fields', () => {
    expect(md).toContain('待填寫')
  })

  it('still emits per-section content for what is filled', () => {
    expect(md).toContain('## 綜合所得總額')
    expect(md).toContain('## 免稅額')
    expect(md).toContain('## 特別扣除額')
  })

  it('shows fallback message instead of 試算結果 when not computable', () => {
    expect(md).toContain('尚未填入足夠資料以試算稅額')
    expect(md).not.toContain('## 所有申報組合')
  })
})
