import { getBrackets, getNumber } from './numbers'

// NT$ threshold for overseas income AMT lane (law_amt_act)
const AMT_OVERSEAS_THRESHOLD = 1_000_000

// 8.5% credit cap for dividend Option A (law_income_tax_act)
const DIVIDEND_CREDIT_RATE = 0.085
const DIVIDEND_CREDIT_CAP = 80_000
// Option B flat rate
const DIVIDEND_FLAT_RATE = 0.28

export function calcBracketTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0
  const brackets = getBrackets()
  for (const bracket of brackets) {
    if (bracket.up_to === null || taxableIncome <= bracket.up_to) {
      return Math.round(taxableIncome * bracket.rate - bracket.quick_deduction)
    }
  }
  // fallback: top bracket (should never reach here due to up_to: null)
  const top = brackets[brackets.length - 1]
  return Math.round(taxableIncome * top.rate - top.quick_deduction)
}

export interface DividendOptions {
  dividendAmount: number
  marginalRate: number
  optionA: { credit: number; tax: number }
  optionB: { tax: number }
  recommended: 'A' | 'B' | 'equal'
  savings: number
}

export function calcDividendOptions(dividendAmount: number, marginalRate: number): DividendOptions {
  const amount = Math.max(0, dividendAmount)
  const credit = Math.min(amount * DIVIDEND_CREDIT_RATE, DIVIDEND_CREDIT_CAP)
  const optionATax = Math.round(amount * marginalRate - credit)
  const optionBTax = Math.round(amount * DIVIDEND_FLAT_RATE)

  let recommended: 'A' | 'B' | 'equal'
  if (optionATax < optionBTax) recommended = 'A'
  else if (optionBTax < optionATax) recommended = 'B'
  else recommended = 'equal'

  return {
    dividendAmount: amount,
    marginalRate,
    optionA: { credit, tax: optionATax },
    optionB: { tax: optionBTax },
    recommended,
    savings: Math.abs(optionATax - optionBTax),
  }
}

export interface CoupleFilingMode {
  label: string
  taxableIncome: number
  tax: number
}

export interface CoupleFilingOptions {
  husbandSalary: number
  wifeSalary: number
  modes: [CoupleFilingMode, CoupleFilingMode, CoupleFilingMode]
  bestIndex: number
  savings: number
}

export function calcCoupleFilingOptions(husbandSalary: number, wifeSalary: number): CoupleFilingOptions {
  const h = Math.max(0, husbandSalary)
  const w = Math.max(0, wifeSalary)
  const STANDARD_MARRIED = getNumber('standard_deduction_married') // 262,000
  const SALARY_DED = getNumber('special_deduction_salary')          // 218,000
  const EXEMPTION = getNumber('exemption_general')                   // 97,000

  // Mode 0: joint filing (合併申報)
  const jointTaxable = Math.max(
    0,
    h + w - STANDARD_MARRIED - SALARY_DED * 2 - EXEMPTION * 2,
  )
  const jointTax = calcBracketTax(jointTaxable)

  // Mode 1 & 2: separate salary computation (薪資分開計稅)
  // Each spouse gets half standard deduction (simplified — full standard goes to primary in practice,
  // but Taiwan separate-salary mode splits differently; this simplified model splits equally to avoid
  // over-benefiting either mode in estimates)
  const halfStandard = STANDARD_MARRIED / 2
  const hTaxable = Math.max(0, h - halfStandard - SALARY_DED - EXEMPTION)
  const wTaxable = Math.max(0, w - halfStandard - SALARY_DED - EXEMPTION)
  const sepHusbandPrimaryTax = calcBracketTax(hTaxable) + calcBracketTax(wTaxable)

  // Mode 2: wife primary (妻主申、夫薪資分開計稅) — symmetric for pure salary
  const sepWifePrimaryTax = calcBracketTax(wTaxable) + calcBracketTax(hTaxable)

  const modes: [CoupleFilingMode, CoupleFilingMode, CoupleFilingMode] = [
    { label: '合併申報', taxableIncome: jointTaxable, tax: jointTax },
    { label: '夫主申・妻薪資分開', taxableIncome: hTaxable + wTaxable, tax: sepHusbandPrimaryTax },
    { label: '妻主申・夫薪資分開', taxableIncome: wTaxable + hTaxable, tax: sepWifePrimaryTax },
  ]

  const minTax = Math.min(...modes.map((m) => m.tax))
  const bestIndex = modes.findIndex((m) => m.tax === minTax)
  const sortedTaxes = [...modes.map((m) => m.tax)].sort((a, b) => a - b)
  const savings = sortedTaxes[1] - sortedTaxes[0]

  return { husbandSalary: h, wifeSalary: w, modes, bestIndex, savings }
}

export interface AmtThresholdResult {
  overseasIncome: number
  aboveThreshold: boolean
  threshold: number
}

export function checkAmtThreshold(overseasIncome: number): AmtThresholdResult {
  return {
    overseasIncome,
    aboveThreshold: overseasIncome >= AMT_OVERSEAS_THRESHOLD,
    threshold: AMT_OVERSEAS_THRESHOLD,
  }
}
