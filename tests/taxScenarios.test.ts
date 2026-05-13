import { describe, expect, it } from 'vitest'
import { calcTaxScenarios, type TaxScenarioInputs } from '../src/lib/taxScenarios'

const baseSingle: TaxScenarioInputs = {
  isMarried: false,
  persons: [
    {
      id: 'self',
      label: '本人',
      salaryNetIncome: 300_000,
      dividendIncome: 0,
      interestIncome: 0,
      otherIncome: 0,
    },
  ],
  exemptionAmount: 97_000,
  selfExemptionAmount: 97_000,
  spouseExemptionAmount: 0,
  generalDeductionAmount: 131_000,
  specialDeductionAmount: 0,
  savingsInvestmentDeductionAmount: 0,
  overseasIncome: 0,
  overseasTaxPaid: 0,
}

const baseMarried: TaxScenarioInputs = {
  isMarried: true,
  persons: [
    {
      id: 'self',
      label: '本人',
      salaryNetIncome: 800_000,
      dividendIncome: 0,
      interestIncome: 0,
      otherIncome: 0,
    },
    {
      id: 'spouse',
      label: '配偶',
      salaryNetIncome: 600_000,
      dividendIncome: 0,
      interestIncome: 0,
      otherIncome: 0,
    },
  ],
  exemptionAmount: 194_000,
  selfExemptionAmount: 97_000,
  spouseExemptionAmount: 97_000,
  generalDeductionAmount: 262_000,
  specialDeductionAmount: 0,
  savingsInvestmentDeductionAmount: 0,
  overseasIncome: 0,
  overseasTaxPaid: 0,
}

describe('calcTaxScenarios', () => {
  it('returns one scenario for single filing without dividends', () => {
    const result = calcTaxScenarios(baseSingle)
    expect(result.scenarios).toHaveLength(1)
    expect(result.bestScenario.coupleMode).toBe('single')
    expect(result.bestScenario.dividendMode).toBe('none')
  })

  it('returns two scenarios for single filing with dividends', () => {
    const result = calcTaxScenarios({
      ...baseSingle,
      persons: [{ ...baseSingle.persons[0], dividendIncome: 500_000 }],
    })
    expect(result.scenarios).toHaveLength(2)
    expect(result.scenarios.map((s) => s.dividendMode)).toEqual(['merged', 'separate_28'])
  })

  it('returns five couple scenarios without dividends', () => {
    const result = calcTaxScenarios(baseMarried)
    expect(result.scenarios).toHaveLength(5)
    expect(result.scenarios.map((s) => s.coupleMode)).toEqual([
      'joint',
      'self_salary_separate',
      'spouse_salary_separate',
      'self_all_income_separate',
      'spouse_all_income_separate',
    ])
  })

  it('returns ten couple scenarios with dividends', () => {
    const result = calcTaxScenarios({
      ...baseMarried,
      persons: baseMarried.persons.map((person) =>
        person.id === 'self'
          ? { ...person, dividendIncome: 100_000 }
          : { ...person, dividendIncome: 50_000 },
      ),
    })
    expect(result.scenarios).toHaveLength(10)
  })

  it('uses a senior self exemption in single filing', () => {
    const result = calcTaxScenarios({
      ...baseSingle,
      exemptionAmount: 145_500,
      selfExemptionAmount: 145_500,
    })
    expect(result.bestScenario.taxableIncome).toBe(23_500)
    expect(result.bestScenario.regularTax).toBe(1_175)
  })

  it('uses spouse senior exemption for spouse separate modes', () => {
    const result = calcTaxScenarios({
      ...baseMarried,
      exemptionAmount: 242_500,
      spouseExemptionAmount: 145_500,
    })
    const spouseSalarySeparate = result.scenarios.find((scenario) => scenario.coupleMode === 'spouse_salary_separate')
    const spouseAllIncomeSeparate = result.scenarios.find((scenario) => scenario.coupleMode === 'spouse_all_income_separate')

    expect(spouseSalarySeparate?.formulas.find((line) => line.label === '配偶薪資分開計稅淨額')?.amount).toBe(454_500)
    expect(spouseAllIncomeSeparate?.formulas.find((line) => line.label === '配偶各類所得分開計稅淨額')?.amount).toBe(454_500)
  })

  it('chooses the lower dividend mode after credit or 28% separate tax', () => {
    const result = calcTaxScenarios({
      ...baseSingle,
      persons: [{ ...baseSingle.persons[0], salaryNetIncome: 5_000_000, dividendIncome: 1_000_000 }],
      exemptionAmount: 97_000,
      selfExemptionAmount: 97_000,
      spouseExemptionAmount: 0,
      generalDeductionAmount: 131_000,
    })
    expect(result.bestScenario.dividendMode).toBe('separate_28')
  })

  it('calculates core AMT supplement only after overseas income reaches threshold', () => {
    const below = calcTaxScenarios({ ...baseSingle, overseasIncome: 999_999 })
    expect(below.bestScenario.amtSupplement).toBe(0)

    const above = calcTaxScenarios({
      ...baseSingle,
      persons: [{ ...baseSingle.persons[0], salaryNetIncome: 0 }],
      overseasIncome: 8_000_000,
      overseasTaxPaid: 30_000,
    })
    expect(above.bestScenario.basicIncome).toBe(8_000_000)
    expect(above.bestScenario.basicTax).toBe(100_000)
    expect(above.bestScenario.overseasTaxCredit).toBe(30_000)
    expect(above.bestScenario.amtSupplement).toBe(70_000)
    expect(above.bestScenario.finalTax).toBe(70_000)
  })

  it('matches the official couple filing example for the best merged-dividend mode before withholding', () => {
    const result = calcTaxScenarios({
      isMarried: true,
      persons: [
        {
          id: 'self',
          label: '本人',
          salaryNetIncome: 1_800_000,
          dividendIncome: 1_000_000,
          interestIncome: 150_000,
          otherIncome: 400_000,
        },
        {
          id: 'spouse',
          label: '配偶',
          salaryNetIncome: 1_300_000,
          dividendIncome: 600_000,
          interestIncome: 100_000,
          otherIncome: 200_000,
        },
        {
          id: 'extra-0',
          label: '扶養親屬',
          salaryNetIncome: 0,
          dividendIncome: 0,
          interestIncome: 100_000,
          otherIncome: 0,
        },
      ],
      exemptionAmount: 291_000,
      selfExemptionAmount: 97_000,
      spouseExemptionAmount: 97_000,
      generalDeductionAmount: 262_000,
      specialDeductionAmount: 270_000,
      savingsInvestmentDeductionAmount: 270_000,
      overseasIncome: 0,
      overseasTaxPaid: 0,
    })

    const best = result.bestScenario
    expect(best.coupleMode).toBe('spouse_all_income_separate')
    expect(best.dividendMode).toBe('merged')
    expect(best.regularIncomeTaxBeforeDividendCredit).toBe(678_400)
    expect(best.dividendCredit).toBe(80_000)
    expect(best.finalTax).toBe(598_400)
  })
})
