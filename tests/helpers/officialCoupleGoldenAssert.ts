import { expect } from 'vitest'
import {
  findScenarioBlockTaxAmount,
  findScenarioEquationResultAmount,
  findScenarioNetAmount,
  type TaxScenario,
} from '../../src/lib/taxScenarios'
import type { OfficialCoupleScenarioGolden } from '../fixtures/officialCoupleFiling114'

/**
 * Asserts official table alignment for one `calcTaxScenarios` scenario (through `regularTax` only; no withholding).
 */
export function expectScenarioMatchesOfficialGolden(
  scenario: TaxScenario,
  golden: OfficialCoupleScenarioGolden,
): void {
  const { formulaSections } = scenario
  expect(scenario.coupleMode).toBe(golden.coupleMode)
  expect(scenario.dividendMode).toBe(golden.dividendMode)

  expect(scenario.grossIncome).toBe(golden.grossIncome)
  expect(scenario.basicLivingExpenseDifference).toBe(golden.basicLivingApplied)
  expect(scenario.taxableIncome).toBe(golden.jointOrTotalNet)

  expect(scenario.regularIncomeTaxBeforeDividendCredit).toBe(golden.regularIncomeTaxBeforeDividendCredit)
  expect(scenario.dividendCredit).toBe(golden.dividendCredit)
  expect(scenario.separateDividendTax).toBe(golden.separateDividendTax)
  expect(scenario.regularTax).toBe(golden.regularTax)

  for (const block of golden.blocks) {
    expect(findScenarioNetAmount(formulaSections, block.netLabel)).toBe(block.net)
    expect(findScenarioBlockTaxAmount(formulaSections, block.netLabel)).toBe(block.tax)
  }

  if (golden.dividendMode === 'merged') {
    expect(findScenarioEquationResultAmount(formulaSections, '股利可抵減稅額')).toBe(golden.dividendCredit)
  } else {
    expect(findScenarioEquationResultAmount(formulaSections, '股利分開計稅稅額')).toBe(golden.separateDividendTax)
  }

  expect(findScenarioEquationResultAmount(formulaSections, '一般所得稅額')).toBe(golden.regularTax)
  expect(findScenarioEquationResultAmount(formulaSections, '應繳納稅額')).toBe(scenario.finalTax)
}
