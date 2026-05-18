import { describe, expect, it } from 'vitest'
import {
  calcBasicLivingExpenseDifference,
  calcTaxScenarios,
  type BasicLivingExpenseInputs,
  type CoupleScenarioMode,
  type TaxScenario,
  type TaxScenarioInputs,
} from '../src/lib/taxScenarios'
import {
  etaxFaqLe0k8lg114Goldens,
  etaxFaqLe0k8lg114Inputs,
  mofStrategyHtml114Goldens,
  mofStrategyHtml114Inputs,
  scenarioId,
  SOURCE_ETAX_FAQ_LE0K8LG,
  SOURCE_MOF_STRATEGY_HTML,
} from './fixtures/officialCoupleFiling114'
import { expectScenarioMatchesOfficialGolden } from './helpers/officialCoupleGoldenAssert'

/** 114 年度綜所稅應納稅額懶人包範例表 — (二) 範例說明 */
const EGov114_IIT_SOURCE =
  'docs/references/egov-iit-tax-due-calculation-114.md（我的 E 政府／財政部稅務入口網範例；稅率級距與 src/data/numbers_2026.json 一致）'

/**
 * Asserts pipeline ①–⑦ on the merged path (single or joint) against the egov table.
 * ②③④ come from inputs; ⑤ uses calcBasicLivingExpenseDifference (negative raw → 0).
 */
function assertEgov114MergedPipeline(
  inputs: TaxScenarioInputs,
  scenario: TaxScenario,
  expected: {
    grossIncome: number
    exemptionAmount: number
    generalDeduction: number
    specialDeduction: number
    /** ⑤ 實際從淨額減除之基本生活費差額；懶人包三例皆為 0 */
    basicLivingExpenseApplied: number
    netIncome: number
    tax: number
  },
): void {
  expect(scenario.grossIncome).toBe(expected.grossIncome)
  expect(inputs.exemptionAmount).toBe(expected.exemptionAmount)
  expect(inputs.generalDeductionAmount).toBe(expected.generalDeduction)
  expect(inputs.specialDeductionAmount).toBe(expected.specialDeduction)

  const blInputs: BasicLivingExpenseInputs = {
    exemptionAmount: inputs.exemptionAmount,
    householdMemberCount: inputs.householdMemberCount,
    generalDeductionAmount: inputs.generalDeductionAmount,
    specialDeductionAmount: inputs.specialDeductionAmount,
  }
  expect(calcBasicLivingExpenseDifference(blInputs)).toBe(expected.basicLivingExpenseApplied)
  expect(scenario.basicLivingExpenseDifference).toBe(expected.basicLivingExpenseApplied)

  expect(scenario.taxableIncome).toBe(expected.netIncome)
  expect(scenario.regularIncomeTaxBeforeDividendCredit).toBe(expected.tax)
  expect(scenario.regularTax).toBe(expected.tax)
}

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
  householdMemberCount: 1,
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
  householdMemberCount: 2,
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

  it('builds sectioned formulas without dividend wording when no dividend exists', () => {
    const scenario = calcTaxScenarios(baseSingle).bestScenario
    const serializedSections = JSON.stringify(scenario.formulaSections)
    const basicLivingEquation = scenario.formulaSections[0]?.equations.find((eq) => eq.label === '基本生活費差額')

    expect(scenario.formulaSections.map((section) => section.title)).toEqual(['所得計算', '應繳納稅額'])
    expect(serializedSections).not.toContain('股利')
    expect(basicLivingEquation?.result.amount).toBe(scenario.basicLivingExpenseDifference)
    expect(basicLivingEquation?.parts.map((part) => part.type === 'operand' ? part.operand.label : '')).toContain('基本生活費')
  })

  it('returns two scenarios for single filing with dividends', () => {
    const result = calcTaxScenarios({
      ...baseSingle,
      persons: [{ ...baseSingle.persons[0], dividendIncome: 500_000 }],
    })
    expect(result.scenarios).toHaveLength(2)
    expect(result.scenarios.map((s) => s.dividendMode)).toEqual(['merged', 'separate_28'])
  })

  it('builds dividend handling sections for merged and separate dividend modes', () => {
    const result = calcTaxScenarios({
      ...baseSingle,
      persons: [{ ...baseSingle.persons[0], dividendIncome: 500_000 }],
    })
    const merged = result.scenarios.find((scenario) => scenario.dividendMode === 'merged')
    const separate = result.scenarios.find((scenario) => scenario.dividendMode === 'separate_28')

    expect(merged?.formulaSections.find((section) => section.title === '股利處理')?.equations.map((eq) => eq.label))
      .toEqual(['股利可抵減稅額', '一般所得稅額'])
    expect(separate?.formulaSections.find((section) => section.title === '股利處理')?.equations.map((eq) => eq.label))
      .toEqual(['股利分開計稅稅額', '一般所得稅額'])
  })

  it('omits zero dividend terms from regular-tax formula expressions', () => {
    const withoutDividend = calcTaxScenarios(baseSingle).bestScenario
    expect(withoutDividend.formulas.find((line) => line.label === '一般稅額')?.expression).toBe('3,600')

    const withDividend = calcTaxScenarios({
      ...baseSingle,
      persons: [{ ...baseSingle.persons[0], dividendIncome: 500_000 }],
    })
    const merged = withDividend.scenarios.find((scenario) => scenario.dividendMode === 'merged')
    const separate = withDividend.scenarios.find((scenario) => scenario.dividendMode === 'separate_28')

    expect(merged?.formulas.find((line) => line.label === '一般稅額')?.expression).toBe('28,600 - 42,500')
    expect(separate?.formulas.find((line) => line.label === '一般稅額')?.expression).toBe('3,600 + 140,000')
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

  it('adds unassigned-deduction assumption only for split-tax scenarios', () => {
    const result = calcTaxScenarios(baseMarried)
    const scenariosByMode = new Map(result.scenarios.map((scenario) => [scenario.coupleMode, scenario]))
    const assumption = '未能歸屬到特定個人的扣除額放在非分開計稅方。'

    expect(scenariosByMode.get('joint')?.assumptions).toEqual([])
    expect(scenariosByMode.get('self_salary_separate')?.assumptions).toEqual([assumption])
    expect(scenariosByMode.get('spouse_salary_separate')?.assumptions).toEqual([assumption])
    expect(scenariosByMode.get('self_all_income_separate')?.assumptions).toEqual([assumption])
    expect(scenariosByMode.get('spouse_all_income_separate')?.assumptions).toEqual([assumption])
  })

  it('builds split-tax formula sections as split side, remaining side, and sum', () => {
    const result = calcTaxScenarios(baseMarried)
    const scenario = result.scenarios.find((s) => s.coupleMode === 'spouse_salary_separate')

    expect(scenario?.formulaSections.slice(0, 3).map((section) => section.title)).toEqual([
      '配偶薪資所得分開計稅',
      '不含薪資分開計稅部分',
      '加總',
    ])
    expect(scenario?.formulaSections[0]?.equations.map((eq) => eq.label)).toEqual([
      '配偶薪資分開計稅淨額',
      '配偶薪資分開應納稅額',
    ])
    expect(scenario?.formulaSections[2]?.equations[0]?.result.label).toBe('應納稅額')
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

  it('deducts a positive basic living expense difference from taxable income', () => {
    const result = calcTaxScenarios({
      ...baseSingle,
      persons: [{ ...baseSingle.persons[0], salaryNetIncome: 1_000_000 }],
      exemptionAmount: 194_000,
      householdMemberCount: 2,
    })

    expect(result.bestScenario.basicLivingExpenseDifference).toBe(101_000)
    expect(result.bestScenario.taxableIncome).toBe(574_000)
    expect(result.bestScenario.regularTax).toBe(28_700)
  })

  it('uses spouse senior exemption for spouse separate modes', () => {
    const result = calcTaxScenarios({
      ...baseMarried,
      exemptionAmount: 242_500,
      spouseExemptionAmount: 145_500,
    })
    const spouseSalarySeparate = result.scenarios.find((scenario) => scenario.coupleMode === 'spouse_salary_separate')
    const spouseAllIncomeSeparate = result.scenarios.find((scenario) => scenario.coupleMode === 'spouse_all_income_separate')

    expect(spouseSalarySeparate?.formulaSections.flatMap((s) => s.equations).find((eq) => eq.result.label === '配偶薪資分開計稅淨額')?.result.amount).toBe(454_500)
    expect(spouseAllIncomeSeparate?.formulaSections.flatMap((s) => s.equations).find((eq) => eq.result.label === '配偶各類所得分開計稅淨額')?.result.amount).toBe(454_500)
  })

  it('chooses the lower dividend mode after credit or 28% separate tax', () => {
    const result = calcTaxScenarios({
      ...baseSingle,
      persons: [{ ...baseSingle.persons[0], salaryNetIncome: 5_000_000, dividendIncome: 1_000_000 }],
      exemptionAmount: 97_000,
      selfExemptionAmount: 97_000,
      spouseExemptionAmount: 0,
      householdMemberCount: 1,
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

  it('builds AMT formulas with overseas tax credit', () => {
    const result = calcTaxScenarios({
      ...baseSingle,
      persons: [{ ...baseSingle.persons[0], salaryNetIncome: 0 }],
      overseasIncome: 8_000_000,
      overseasTaxPaid: 30_000,
    })
    const amtSection = result.bestScenario.formulaSections.find((section) => section.title === 'AMT 計算')

    expect(amtSection?.equations.map((eq) => eq.label)).toEqual([
      '基本所得額',
      '基本稅額',
      '海外稅額扣抵',
      'AMT 補稅',
    ])
    expect(amtSection?.equations.find((eq) => eq.label === '海外稅額扣抵')?.result.amount).toBe(30_000)
    expect(amtSection?.equations.find((eq) => eq.label === 'AMT 補稅')?.result.amount).toBe(70_000)
  })

  it('does not mention dividends in sectioned formulas when only overseas income exists', () => {
    const scenario = calcTaxScenarios({ ...baseSingle, overseasIncome: 8_000_000 }).bestScenario
    expect(JSON.stringify(scenario.formulaSections)).not.toContain('股利')
    expect(scenario.formulaSections.map((section) => section.title)).toContain('AMT 計算')
  })

  it('omits AMT formula lines when overseas income is zero', () => {
    const result = calcTaxScenarios(baseSingle)
    expect(result.hasOverseasIncome).toBe(false)
    expect(result.bestScenario.formulas.some((line) => line.label.includes('AMT'))).toBe(false)
    expect(result.bestScenario.formulas.at(-1)?.expression).toBe('3,600')
  })

  it('keeps AMT judgment lines when overseas income is positive but below threshold', () => {
    const result = calcTaxScenarios({ ...baseSingle, overseasIncome: 500_000 })
    expect(result.hasOverseasIncome).toBe(true)
    expect(result.hasAmt).toBe(false)
    expect(result.bestScenario.formulas.some((line) => line.label === 'AMT 判斷')).toBe(true)
  })

  describe(`official couple filing — MOF strategy HTML (${SOURCE_MOF_STRATEGY_HTML})`, () => {
    it('picks spouse all-income separate with merged dividend (lowest regularTax)', () => {
      const result = calcTaxScenarios(mofStrategyHtml114Inputs)
      expect(result.bestScenario.coupleMode).toBe('spouse_all_income_separate')
      expect(result.bestScenario.dividendMode).toBe('merged')
      expect(result.bestScenario.regularTax).toBe(598_400)
    })

    it.each(mofStrategyHtml114Goldens)('golden $coupleMode + $dividendMode', (golden) => {
      const result = calcTaxScenarios(mofStrategyHtml114Inputs)
      const scenario = result.scenarios.find(
        (s) => s.coupleMode === golden.coupleMode && s.dividendMode === golden.dividendMode,
      )
      expect(scenario, scenarioId(golden)).toBeDefined()
      expectScenarioMatchesOfficialGolden(scenario!, golden)
    })
  })

  describe(`official couple filing — eTax FAQ LE0K8lg (${SOURCE_ETAX_FAQ_LE0K8LG})`, () => {
    it('picks spouse all-income separate with merged dividend (lowest regularTax)', () => {
      const result = calcTaxScenarios(etaxFaqLe0k8lg114Inputs)
      expect(result.bestScenario.coupleMode).toBe('spouse_all_income_separate')
      expect(result.bestScenario.dividendMode).toBe('merged')
      expect(result.bestScenario.regularTax).toBe(589_400)
    })

    it.each(etaxFaqLe0k8lg114Goldens)('golden $coupleMode + $dividendMode', (golden) => {
      const result = calcTaxScenarios(etaxFaqLe0k8lg114Inputs)
      const scenario = result.scenarios.find(
        (s) => s.coupleMode === golden.coupleMode && s.dividendMode === golden.dividendMode,
      )
      expect(scenario, scenarioId(golden)).toBeDefined()
      expectScenarioMatchesOfficialGolden(scenario!, golden)
    })
  })

  describe(`egov 114 merged examples (${EGov114_IIT_SOURCE})`, () => {
    it('column 1 — single filer, standard deduction, zero net and tax', () => {
      const inputs: TaxScenarioInputs = {
        isMarried: false,
        persons: [
          {
            id: 'self',
            label: '本人',
            salaryNetIncome: 228_000,
            dividendIncome: 0,
            interestIncome: 0,
            otherIncome: 0,
          },
        ],
        exemptionAmount: 97_000,
        selfExemptionAmount: 97_000,
        spouseExemptionAmount: 0,
        householdMemberCount: 1,
        generalDeductionAmount: 131_000,
        specialDeductionAmount: 0,
        savingsInvestmentDeductionAmount: 0,
        overseasIncome: 0,
        overseasTaxPaid: 0,
      }
      const result = calcTaxScenarios(inputs)
      const merged = result.scenarios.find((s) => s.coupleMode === 'single' && s.dividendMode === 'none')
      expect(merged).toBeDefined()
      assertEgov114MergedPipeline(inputs, merged!, {
        grossIncome: 228_000,
        exemptionAmount: 97_000,
        generalDeduction: 131_000,
        specialDeduction: 0,
        basicLivingExpenseApplied: 0,
        netIncome: 0,
        tax: 0,
      })
    })

    it('column 2 — married, senior dependent, standard deduction, long-term care', () => {
      const inputs: TaxScenarioInputs = {
        isMarried: true,
        persons: [
          {
            id: 'self',
            label: '本人',
            salaryNetIncome: 782_000,
            dividendIncome: 0,
            interestIncome: 0,
            otherIncome: 0,
          },
          {
            id: 'spouse',
            label: '配偶',
            salaryNetIncome: 0,
            dividendIncome: 0,
            interestIncome: 0,
            otherIncome: 0,
          },
        ],
        exemptionAmount: 339_500,
        selfExemptionAmount: 97_000,
        spouseExemptionAmount: 97_000,
        householdMemberCount: 3,
        generalDeductionAmount: 262_000,
        specialDeductionAmount: 180_000,
        savingsInvestmentDeductionAmount: 0,
        overseasIncome: 0,
        overseasTaxPaid: 0,
      }
      const result = calcTaxScenarios(inputs)
      const merged = result.scenarios.find((s) => s.coupleMode === 'joint' && s.dividendMode === 'none')
      expect(merged).toBeDefined()
      assertEgov114MergedPipeline(inputs, merged!, {
        grossIncome: 782_000,
        exemptionAmount: 339_500,
        generalDeduction: 262_000,
        specialDeduction: 180_000,
        basicLivingExpenseApplied: 0,
        netIncome: 500,
        tax: 25,
      })
    })

    it('column 3 — dual income, toddler, itemized; merged pipeline + MOF split modes', () => {
      const inputs: TaxScenarioInputs = {
        isMarried: true,
        persons: [
          {
            id: 'self',
            label: '本人',
            salaryNetIncome: 882_000,
            dividendIncome: 0,
            interestIncome: 0,
            otherIncome: 0,
          },
          {
            id: 'spouse',
            label: '配偶',
            salaryNetIncome: 482_000,
            dividendIncome: 0,
            interestIncome: 0,
            otherIncome: 0,
          },
        ],
        exemptionAmount: 291_000,
        selfExemptionAmount: 97_000,
        spouseExemptionAmount: 97_000,
        householdMemberCount: 3,
        generalDeductionAmount: 282_000,
        specialDeductionAmount: 150_000,
        savingsInvestmentDeductionAmount: 0,
        overseasIncome: 0,
        overseasTaxPaid: 0,
      }
      const result = calcTaxScenarios(inputs)
      const merged = result.scenarios.find((s) => s.coupleMode === 'joint' && s.dividendMode === 'none')
      expect(merged).toBeDefined()
      assertEgov114MergedPipeline(inputs, merged!, {
        grossIncome: 1_364_000,
        exemptionAmount: 291_000,
        generalDeduction: 282_000,
        specialDeduction: 150_000,
        basicLivingExpenseApplied: 0,
        netIncome: 641_000,
        tax: 35_620,
      })

      const byMode = (mode: CoupleScenarioMode) =>
        result.scenarios.find((s) => s.coupleMode === mode && s.dividendMode === 'none')

      expect(byMode('self_salary_separate')?.regularTax).toBe(52_900)
      expect(byMode('spouse_salary_separate')?.regularTax).toBe(32_050)
      expect(byMode('self_all_income_separate')?.regularTax).toBe(52_900)
      expect(byMode('spouse_all_income_separate')?.regularTax).toBe(32_050)
      expect(result.bestScenario.finalTax).toBe(32_050)
      expect(result.bestScenario.coupleMode).toBe('spouse_salary_separate')
    })
  })
})
