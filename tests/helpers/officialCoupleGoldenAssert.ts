import { expect } from 'vitest'
import type { TaxScenario } from '../../src/lib/taxScenarios'
import type { OfficialCoupleScenarioGolden } from '../fixtures/officialCoupleFiling114'

function formulaAmount(scenario: TaxScenario, label: string): number | undefined {
  return scenario.formulas.find((line) => line.label === label)?.amount
}

/**
 * Asserts official table alignment for one `calcTaxScenarios` scenario (through `regularTax` only; no withholding).
 */
export function expectScenarioMatchesOfficialGolden(
  scenario: TaxScenario,
  golden: OfficialCoupleScenarioGolden,
): void {
  expect(scenario.coupleMode).toBe(golden.coupleMode)
  expect(scenario.dividendMode).toBe(golden.dividendMode)

  expect(scenario.grossIncome).toBe(golden.grossIncome)
  expect(scenario.basicLivingExpenseDifference).toBe(golden.basicLivingApplied)
  expect(scenario.taxableIncome).toBe(golden.jointOrTotalNet)

  expect(scenario.regularIncomeTaxBeforeDividendCredit).toBe(golden.regularIncomeTaxBeforeDividendCredit)
  expect(scenario.dividendCredit).toBe(golden.dividendCredit)
  expect(scenario.separateDividendTax).toBe(golden.separateDividendTax)
  expect(scenario.regularTax).toBe(golden.regularTax)

  expect(formulaAmount(scenario, '綜合所得總額')).toBe(golden.grossIncome)
  expect(formulaAmount(scenario, '基本生活費差額')).toBe(-golden.basicLivingApplied)

  for (const block of golden.blocks) {
    expect(formulaAmount(scenario, block.netLabel)).toBe(block.net)
    expect(formulaAmount(scenario, `${block.netLabel}稅額`)).toBe(block.tax)
  }

  if (golden.dividendMode === 'merged') {
    expect(formulaAmount(scenario, '股利可抵減稅額')).toBe(-golden.dividendCredit)
  } else {
    expect(formulaAmount(scenario, '股利分開計稅稅額')).toBe(golden.separateDividendTax)
  }

  expect(formulaAmount(scenario, '一般稅額')).toBe(golden.regularTax)
  expect(formulaAmount(scenario, '應繳納稅額')).toBe(scenario.finalTax)
}
