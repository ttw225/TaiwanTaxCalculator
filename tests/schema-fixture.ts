import type {
  ChecklistItem,
  SourceRef,
} from '../src/types/content'

// Compile-time fixture: if any field is missing or wrong type, tsc --noEmit fails.
// This file is NOT run by Vitest — it is verified by pnpm typecheck only.

const sampleSource: SourceRef = {
  source_id: 'src-001',
  label: '所得稅法第17條',
  authority: '法務部全國法規資料庫',
  url: 'https://law.moj.gov.tw/LawClass/LawAll.aspx?pcode=G0340003',
}

const sampleItem: ChecklistItem = {
  id: 'deduction-standard-single',
  title: '標準扣除額（單身）',
  category: 'general_deductions',
  situations: ['salary_income'],
  why_it_matters: '可直接扣除 131,000 元，無需收集憑證',
  eligibility_cues: ['所有納稅義務人均可適用'],
  documents_to_prepare: [],
  source_refs: [sampleSource],
  show_wealth_clause_notice: false,
}

// Export to suppress unused-variable errors under noUnusedLocals
export { sampleItem }
