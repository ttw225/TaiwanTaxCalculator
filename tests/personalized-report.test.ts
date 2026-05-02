import { beforeEach, describe, expect, it } from 'vitest'
import type { CategoryGroup } from '../src/lib/checklist'
import {
  clearSavedTaxProfile,
  createPersonalizedReport,
  loadSavedTaxProfile,
  normalizeTaxProfile,
  PERSONALIZED_TAX_PROFILE_STORAGE_KEY,
  saveTaxProfile,
} from '../src/lib/personalizedReport'

const groups: CategoryGroup[] = [
  {
    category: 'general_deductions',
    label: '列舉扣除',
    items: [
      {
        id: 'rent-deduction',
        title: '租金支出特別扣除',
        category: 'general_deductions',
        situations: ['rent'],
        why_it_matters: '',
        eligibility_cues: [],
        documents_to_prepare: ['租賃契約書影本', '租金付款證明'],
        limitations: [],
        source_refs: [],
        verification_status: 'verified',
        disclaimer_level: 'medium',
        next_action: '',
      },
      {
        id: 'medical-deduction',
        title: '醫藥及生育費扣除',
        category: 'general_deductions',
        situations: ['medical_expenses'],
        why_it_matters: '',
        eligibility_cues: [],
        documents_to_prepare: ['醫療收據正本'],
        limitations: [],
        source_refs: [],
        verification_status: 'verified',
        disclaimer_level: 'medium',
        next_action: '',
      },
    ],
  },
]

beforeEach(() => {
  localStorage.clear()
})

describe('normalizeTaxProfile', () => {
  it('accepts an empty profile', () => {
    const normalized = normalizeTaxProfile({})
    expect(normalized.housingType).toBe('none')
    expect(normalized.incomeRange).toBe('none')
    expect(normalized.medicalExpenseRange).toBe('none')

    const report = createPersonalizedReport(normalized, groups)
    expect(report.recommendations).toHaveLength(0)
  })

  it('clamps negative amounts to 0', () => {
    const normalized = normalizeTaxProfile({
      rentAmount: -1000,
      dividendAmount: -500,
    })
    expect(normalized.rentAmount).toBe(0)
    expect(normalized.dividendAmount).toBe(0)
  })

  it('preserves valid amount ranges', () => {
    const normalized = normalizeTaxProfile({ medicalExpenseRange: 'high' })
    expect(normalized.medicalExpenseRange).toBe('high')
  })

  it('tolerates partial profiles', () => {
    const normalized = normalizeTaxProfile({ housingType: 'rent' })
    expect(normalized.housingType).toBe('rent')
    expect(normalized.rentAmount).toBeUndefined()
  })
})

describe('createPersonalizedReport', () => {
  it('prioritizes rent deduction and documents', () => {
    const report = createPersonalizedReport({ housingType: 'rent', rentAmount: 120_000 }, groups)
    expect(report.recommendations[0].title).toContain('租屋扣除')
    expect(report.missingDocuments).toContain('租賃契約書影本')
  })

  it('prioritizes medical expense document preparation', () => {
    const report = createPersonalizedReport({ medicalExpenseRange: 'high' }, groups)
    expect(report.recommendations.some((r) => r.title.includes('醫療'))).toBe(true)
    expect(report.warnings.join('\n')).toContain('財政部電子申報系統')
  })

  it('triggers dividend decision guidance and estimate when marginal rate exists', () => {
    const report = createPersonalizedReport({ dividendAmount: 500_000, marginalRate: 0.2 }, groups)
    expect(report.recommendations.some((r) => r.title.includes('股利'))).toBe(true)
    expect(report.estimates.join('\n')).toContain('合併計稅')
    expect(report.estimates.join('\n')).toContain('82,500')
  })

  it('triggers married couple filing guidance', () => {
    const report = createPersonalizedReport({
      isMarried: true,
      selfSalary: 800_000,
      spouseSalary: 600_000,
    }, groups)
    expect(report.recommendations.some((r) => r.title.includes('夫妻申報'))).toBe(true)
    expect(report.warnings.join('\n')).toContain('薪資')
  })

  it('triggers overseas AMT guidance above threshold', () => {
    const report = createPersonalizedReport({ overseasIncome: 1_500_000 }, groups)
    expect(report.recommendations[0].title).toContain('AMT')
    expect(report.warnings.join('\n')).toContain('最低稅負制')
  })
})

describe('personalized worksheet local persistence', () => {
  it('does not write until saveTaxProfile is called', () => {
    normalizeTaxProfile({ rentAmount: 50_000 })
    expect(localStorage.getItem(PERSONALIZED_TAX_PROFILE_STORAGE_KEY)).toBeNull()
  })

  it('writes normalized profile on opt-in save', () => {
    saveTaxProfile({ housingType: 'rent', rentAmount: 50_000 })
    expect(localStorage.getItem(PERSONALIZED_TAX_PROFILE_STORAGE_KEY)).toContain('50000')
  })

  it('clears saved profile', () => {
    saveTaxProfile({ dividendAmount: 100_000 })
    clearSavedTaxProfile()
    expect(localStorage.getItem(PERSONALIZED_TAX_PROFILE_STORAGE_KEY)).toBeNull()
  })

  it('loads corrupted storage safely as empty profile', () => {
    localStorage.setItem(PERSONALIZED_TAX_PROFILE_STORAGE_KEY, '{bad json')
    const loaded = loadSavedTaxProfile()
    expect(loaded.housingType).toBe('none')
    expect(loaded.medicalExpenseRange).toBe('none')
  })
})
