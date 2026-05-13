import { calcTax, getNumber } from './numbers'

const DIVIDEND_CREDIT_RATE = 0.085
const DIVIDEND_CREDIT_CAP = 80_000
const DIVIDEND_FLAT_RATE = 0.28
const AMT_OVERSEAS_THRESHOLD = 1_000_000
const AMT_BASIC_INCOME_DEDUCTION = 7_500_000
const AMT_RATE = 0.2

export type TaxPersonId = 'self' | 'spouse' | string

export interface TaxScenarioPerson {
  id: TaxPersonId
  label: string
  salaryNetIncome: number
  dividendIncome: number
  interestIncome: number
  otherIncome: number
}

export type CoupleScenarioMode =
  | 'single'
  | 'joint'
  | 'self_salary_separate'
  | 'spouse_salary_separate'
  | 'self_all_income_separate'
  | 'spouse_all_income_separate'

export type DividendScenarioMode = 'none' | 'merged' | 'separate_28'

export interface FormulaLine {
  label: string
  expression: string
  amount: number
}

export interface TaxScenario {
  id: string
  coupleMode: CoupleScenarioMode
  dividendMode: DividendScenarioMode
  title: string
  dividendTitle: string | null
  grossIncome: number
  basicLivingExpenseDifference: number
  taxableIncome: number
  regularIncomeTaxBeforeDividendCredit: number
  dividendCredit: number
  separateDividendTax: number
  regularTax: number
  basicIncome: number
  basicTax: number
  overseasTaxCredit: number
  amtSupplement: number
  finalTax: number
  formulas: FormulaLine[]
  assumptions: string[]
}

export interface TaxScenarioInputs {
  isMarried: boolean
  persons: TaxScenarioPerson[]
  exemptionAmount: number
  selfExemptionAmount: number
  spouseExemptionAmount: number
  householdMemberCount: number
  generalDeductionAmount: number
  specialDeductionAmount: number
  savingsInvestmentDeductionAmount: number
  overseasIncome: number
  overseasTaxPaid: number
}

export interface BasicLivingExpenseInputs {
  exemptionAmount: number
  householdMemberCount: number
  generalDeductionAmount: number
  specialDeductionAmount: number
}

export interface TaxScenarioResult {
  scenarios: TaxScenario[]
  bestScenario: TaxScenario
  secondBestScenario: TaxScenario | null
  savings: number
  hasDividend: boolean
  hasOverseasIncome: boolean
  hasAmt: boolean
}

function roundTax(value: number): number {
  return Math.round(value)
}

function money(value: number): string {
  return roundTax(value).toLocaleString('zh-TW')
}

function sumPersons(persons: TaxScenarioPerson[], selector: (person: TaxScenarioPerson) => number): number {
  return persons.reduce((sum, person) => sum + Math.max(0, selector(person)), 0)
}

function getPerson(persons: TaxScenarioPerson[], id: 'self' | 'spouse'): TaxScenarioPerson {
  return persons.find((person) => person.id === id) ?? {
    id,
    label: id === 'self' ? '本人' : '配偶',
    salaryNetIncome: 0,
    dividendIncome: 0,
    interestIncome: 0,
    otherIncome: 0,
  }
}

function getPersonExemption(inputs: TaxScenarioInputs, id: 'self' | 'spouse'): number {
  return id === 'self' ? inputs.selfExemptionAmount : inputs.spouseExemptionAmount
}

function personIncome(person: TaxScenarioPerson, includeDividend: boolean): number {
  return person.salaryNetIncome +
    person.interestIncome +
    person.otherIncome +
    (includeDividend ? person.dividendIncome : 0)
}

function calcSplitSavingsDeduction(
  splitPerson: TaxScenarioPerson,
  persons: TaxScenarioPerson[],
  savingsInvestmentDeductionAmount: number,
): number {
  if (savingsInvestmentDeductionAmount <= 0) return 0
  const cap = getNumber('special_deduction_savings_investment')
  const splitInterest = Math.max(0, splitPerson.interestIncome)
  const totalInterest = sumPersons(persons, (person) => person.interestIncome)
  const otherInterest = Math.max(0, totalInterest - splitInterest)

  if (totalInterest <= cap) return Math.min(splitInterest, savingsInvestmentDeductionAmount)
  return Math.min(splitInterest, savingsInvestmentDeductionAmount, Math.max(0, cap - otherInterest))
}

export function calcBasicLivingExpenseDifference(inputs: BasicLivingExpenseInputs): number {
  const basicLivingExpenseTotal =
    getNumber('basic_living_expense') * Math.max(0, Math.floor(inputs.householdMemberCount))
  return Math.max(
    0,
    basicLivingExpenseTotal -
      inputs.exemptionAmount -
      inputs.generalDeductionAmount -
      inputs.specialDeductionAmount,
  )
}

function scenarioTitle(mode: CoupleScenarioMode): string {
  switch (mode) {
    case 'single':
      return '單身申報'
    case 'joint':
      return '夫妻所得合併計稅'
    case 'self_salary_separate':
      return '本人薪資所得分開計稅'
    case 'spouse_salary_separate':
      return '配偶薪資所得分開計稅'
    case 'self_all_income_separate':
      return '本人各類所得分開計稅'
    case 'spouse_all_income_separate':
      return '配偶各類所得分開計稅'
  }
}

function dividendTitle(mode: DividendScenarioMode): string | null {
  switch (mode) {
    case 'none':
      return null
    case 'merged':
      return '股利合併計稅'
    case 'separate_28':
      return '股利分開計稅'
  }
}

function buildAmtLines(
  taxableIncome: number,
  separateDividendAmount: number,
  regularTax: number,
  overseasIncome: number,
  overseasTaxPaid: number,
): Pick<TaxScenario, 'basicIncome' | 'basicTax' | 'overseasTaxCredit' | 'amtSupplement'> & { lines: FormulaLine[] } {
  if (overseasIncome <= 0) {
    return {
      basicIncome: taxableIncome + separateDividendAmount,
      basicTax: 0,
      overseasTaxCredit: 0,
      amtSupplement: 0,
      lines: [],
    }
  }

  if (overseasIncome < AMT_OVERSEAS_THRESHOLD) {
    return {
      basicIncome: taxableIncome + separateDividendAmount,
      basicTax: 0,
      overseasTaxCredit: 0,
      amtSupplement: 0,
      lines: [{
        label: 'AMT 判斷',
        expression: `海外所得 ${money(overseasIncome)} 元未達 1,000,000 元，不計入核心 AMT 試算`,
        amount: 0,
      }],
    }
  }

  const basicIncome = taxableIncome + separateDividendAmount + overseasIncome
  const basicTax = roundTax(Math.max(0, basicIncome - AMT_BASIC_INCOME_DEDUCTION) * AMT_RATE)
  const amtGap = Math.max(0, basicTax - regularTax)
  const overseasTaxCredit = Math.min(Math.max(0, overseasTaxPaid), amtGap)
  const amtSupplement = Math.max(0, amtGap - overseasTaxCredit)

  return {
    basicIncome,
    basicTax,
    overseasTaxCredit,
    amtSupplement,
    lines: [
      {
        label: '基本所得額',
        expression: `${money(taxableIncome)} + ${money(separateDividendAmount)} + ${money(overseasIncome)}`,
        amount: basicIncome,
      },
      {
        label: '基本稅額',
        expression: `max(0, ${money(basicIncome)} - 7,500,000) × 20%`,
        amount: basicTax,
      },
      {
        label: 'AMT 補稅',
        expression: `max(0, ${money(basicTax)} - ${money(regularTax)} - ${money(overseasTaxCredit)})`,
        amount: amtSupplement,
      },
    ],
  }
}

function buildScenario(
  inputs: TaxScenarioInputs,
  coupleMode: CoupleScenarioMode,
  dividendMode: DividendScenarioMode,
): TaxScenario {
  const includeDividend = dividendMode !== 'separate_28'
  const totalDividend = sumPersons(inputs.persons, (person) => person.dividendIncome)
  const grossIncome = sumPersons(inputs.persons, (person) => personIncome(person, includeDividend))
  const basicLivingExpenseDifference = calcBasicLivingExpenseDifference(inputs)
  const assumptions = [
    '未能歸屬到特定個人的扣除額放在非分開計稅方。',
  ]

  let taxableParts: { label: string; taxableIncome: number; tax: number }[]

  if (coupleMode === 'single' || coupleMode === 'joint') {
    const taxableIncome = Math.max(
      0,
      grossIncome -
        inputs.exemptionAmount -
        inputs.generalDeductionAmount -
        inputs.specialDeductionAmount -
        basicLivingExpenseDifference,
    )
    taxableParts = [{ label: '綜合所得淨額', taxableIncome, tax: calcTax(taxableIncome) }]
  } else if (coupleMode === 'self_salary_separate' || coupleMode === 'spouse_salary_separate') {
    const splitPersonId = coupleMode === 'self_salary_separate' ? 'self' : 'spouse'
    const splitPerson = getPerson(inputs.persons, splitPersonId)
    const splitExemption = getPersonExemption(inputs, splitPersonId)
    const splitTaxable = Math.max(0, splitPerson.salaryNetIncome - splitExemption)
    const otherTaxable = Math.max(
      0,
      grossIncome -
        splitPerson.salaryNetIncome -
        (inputs.exemptionAmount - splitExemption) -
        inputs.generalDeductionAmount -
        inputs.specialDeductionAmount -
        basicLivingExpenseDifference,
    )
    taxableParts = [
      { label: `${splitPerson.label}薪資分開計稅淨額`, taxableIncome: splitTaxable, tax: calcTax(splitTaxable) },
      { label: '不含薪資分開計稅部分所得淨額', taxableIncome: otherTaxable, tax: calcTax(otherTaxable) },
    ]
  } else {
    const splitPersonId = coupleMode === 'self_all_income_separate' ? 'self' : 'spouse'
    const splitPerson = getPerson(inputs.persons, splitPersonId)
    const splitExemption = getPersonExemption(inputs, splitPersonId)
    const splitGross = personIncome(splitPerson, includeDividend)
    const splitSavingsDeduction = calcSplitSavingsDeduction(
      splitPerson,
      inputs.persons,
      inputs.savingsInvestmentDeductionAmount,
    )
    const otherSpecialDeduction = Math.max(0, inputs.specialDeductionAmount - splitSavingsDeduction)
    const splitTaxable = Math.max(0, splitGross - splitExemption - splitSavingsDeduction)
    const otherTaxable = Math.max(
      0,
      grossIncome -
        splitGross -
        (inputs.exemptionAmount - splitExemption) -
        inputs.generalDeductionAmount -
        otherSpecialDeduction -
        basicLivingExpenseDifference,
    )
    taxableParts = [
      { label: `${splitPerson.label}各類所得分開計稅淨額`, taxableIncome: splitTaxable, tax: calcTax(splitTaxable) },
      { label: '不含各類所得分開計稅部分所得淨額', taxableIncome: otherTaxable, tax: calcTax(otherTaxable) },
    ]
  }

  const taxableIncome = taxableParts.reduce((sum, part) => sum + part.taxableIncome, 0)
  const regularIncomeTaxBeforeDividendCredit = taxableParts.reduce((sum, part) => sum + part.tax, 0)
  const dividendCredit = dividendMode === 'merged'
    ? roundTax(Math.min(totalDividend * DIVIDEND_CREDIT_RATE, DIVIDEND_CREDIT_CAP))
    : 0
  const separateDividendTax = dividendMode === 'separate_28'
    ? roundTax(totalDividend * DIVIDEND_FLAT_RATE)
    : 0
  const regularTax = regularIncomeTaxBeforeDividendCredit - dividendCredit + separateDividendTax
  const amt = buildAmtLines(
    taxableIncome,
    dividendMode === 'separate_28' ? totalDividend : 0,
    regularTax,
    Math.max(0, inputs.overseasIncome),
    Math.max(0, inputs.overseasTaxPaid),
  )
  const finalTax = regularTax + amt.amtSupplement
  const divTitle = dividendTitle(dividendMode)

  const formulas: FormulaLine[] = [
    {
      label: '綜合所得總額',
      expression: includeDividend ? '薪資淨額 + 股利 + 利息 + 其他收入' : '薪資淨額 + 利息 + 其他收入',
      amount: grossIncome,
    },
    {
      label: '基本生活費差額',
      expression: `max(0, ${money(getNumber('basic_living_expense'))} × ${Math.max(0, Math.floor(inputs.householdMemberCount))} - ${money(inputs.exemptionAmount)} - ${money(inputs.generalDeductionAmount)} - ${money(inputs.specialDeductionAmount)})`,
      amount: -basicLivingExpenseDifference,
    },
    ...taxableParts.flatMap((part) => [
      {
        label: part.label,
        expression: '依本方案可減除項目計算',
        amount: part.taxableIncome,
      },
      {
        label: `${part.label}稅額`,
        expression: `${money(part.taxableIncome)} × 級距稅率 - 累進差額`,
        amount: part.tax,
      },
    ]),
  ]

  if (dividendMode === 'merged') {
    formulas.push({
      label: '股利可抵減稅額',
      expression: `min(${money(totalDividend)} × 8.5%, 80,000)`,
      amount: -dividendCredit,
    })
  } else if (dividendMode === 'separate_28') {
    formulas.push({
      label: '股利分開計稅稅額',
      expression: `${money(totalDividend)} × 28%`,
      amount: separateDividendTax,
    })
  }

  formulas.push({
    label: '一般稅額',
    expression: `${money(regularIncomeTaxBeforeDividendCredit)} - ${money(dividendCredit)} + ${money(separateDividendTax)}`,
    amount: regularTax,
  })
  formulas.push(...amt.lines)
  formulas.push({
    label: '應繳納稅額',
    expression: amt.lines.length > 0
      ? `${money(regularTax)} + ${money(amt.amtSupplement)}`
      : `${money(regularTax)}`,
    amount: finalTax,
  })

  return {
    id: `${coupleMode}:${dividendMode}`,
    coupleMode,
    dividendMode,
    title: divTitle ? `${scenarioTitle(coupleMode)}，${divTitle}` : scenarioTitle(coupleMode),
    dividendTitle: divTitle,
    grossIncome,
    basicLivingExpenseDifference,
    taxableIncome,
    regularIncomeTaxBeforeDividendCredit,
    dividendCredit,
    separateDividendTax,
    regularTax,
    basicIncome: amt.basicIncome,
    basicTax: amt.basicTax,
    overseasTaxCredit: amt.overseasTaxCredit,
    amtSupplement: amt.amtSupplement,
    finalTax,
    formulas,
    assumptions,
  }
}

export function calcTaxScenarios(inputs: TaxScenarioInputs): TaxScenarioResult {
  const persons = inputs.isMarried
    ? inputs.persons
    : inputs.persons.filter((person) => person.id !== 'spouse')
  const normalizedInputs = { ...inputs, persons }
  const totalDividend = sumPersons(persons, (person) => person.dividendIncome)
  const hasDividend = totalDividend > 0
  const hasOverseasIncome = Math.max(0, inputs.overseasIncome) > 0
  const coupleModes: CoupleScenarioMode[] = inputs.isMarried
    ? ['joint', 'self_salary_separate', 'spouse_salary_separate', 'self_all_income_separate', 'spouse_all_income_separate']
    : ['single']
  const dividendModes: DividendScenarioMode[] = hasDividend ? ['merged', 'separate_28'] : ['none']

  const scenarios = coupleModes.flatMap((coupleMode) =>
    dividendModes.map((dividendMode) => buildScenario(normalizedInputs, coupleMode, dividendMode)),
  )
  const sorted = [...scenarios].sort((a, b) => a.finalTax - b.finalTax)
  const bestScenario = sorted[0]
  const secondBestScenario = sorted[1] ?? null

  return {
    scenarios,
    bestScenario,
    secondBestScenario,
    savings: secondBestScenario ? secondBestScenario.finalTax - bestScenario.finalTax : 0,
    hasDividend,
    hasOverseasIncome,
    hasAmt: Math.max(0, inputs.overseasIncome) >= AMT_OVERSEAS_THRESHOLD,
  }
}
