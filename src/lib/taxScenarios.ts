import { calcTax, getBrackets, getNumber } from './numbers'

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

/** Compact flat row derived from `formulaSections` (tests / golden asserts). */
export interface FormulaLine {
  label: string
  expression: string
  amount: number
}

/** Lookup equation result amount by equation or result label. */
export function findScenarioEquationResultAmount(
  sections: ScenarioFormulaSection[],
  label: string,
): number | undefined {
  for (const section of sections) {
    for (const eq of section.equations) {
      if (eq.label === label || eq.result.label === label) {
        return eq.result.amount
      }
    }
  }
  return undefined
}

/** Net income amount for an official-golden block (remaining-side labels differ in sections). */
export function findScenarioNetAmount(
  sections: ScenarioFormulaSection[],
  netLabel: string,
): number | undefined {
  const mapped =
    netLabel.includes('不含') && netLabel.endsWith('所得淨額') ? '剩餘所得淨額' : netLabel
  return findScenarioEquationResultAmount(sections, mapped)
}

/** Tax amount for an official-golden net block (labels differ between flat vs sectioned UI). */
export function findScenarioBlockTaxAmount(
  sections: ScenarioFormulaSection[],
  netLabel: string,
): number | undefined {
  if (netLabel === '綜合所得淨額') {
    return findScenarioEquationResultAmount(sections, '應納稅額')
  }
  if (netLabel.endsWith('計稅淨額')) {
    return findScenarioEquationResultAmount(sections, netLabel.replace(/計稅淨額$/, '應納稅額'))
  }
  if (netLabel.includes('不含') && netLabel.endsWith('所得淨額')) {
    return findScenarioEquationResultAmount(sections, '剩餘部分應納稅額')
  }
  return findScenarioEquationResultAmount(sections, `${netLabel}稅額`)
}

interface DeriveFormulaLinesContext {
  inputs: TaxScenarioInputs
  taxableParts: { label: string; taxableIncome: number; tax: number }[]
  includeDividend: boolean
  dividendMode: DividendScenarioMode
  totalDividend: number
  dividendCredit: number
  separateDividendTax: number
  regularIncomeTaxBeforeDividendCredit: number
  regularTax: number
  finalTax: number
  basicLivingExpenseDifference: number
  overseasIncome: number
  amtSupplement: number
}

function basicLivingExpenseExpression(inputs: TaxScenarioInputs): string {
  return `max(0, ${money(getNumber('basic_living_expense'))} × ${Math.max(0, Math.floor(inputs.householdMemberCount))} - ${money(inputs.exemptionAmount)} - ${money(inputs.generalDeductionAmount)} - ${money(inputs.specialDeductionAmount)})`
}

function equationTextExpression(eq: ScenarioFormulaEquation): string {
  const textPart = eq.parts.find((part): part is Extract<ScenarioFormulaPart, { type: 'text' }> => part.type === 'text')
  if (textPart) return textPart.text

  const chunks: string[] = []
  for (const part of eq.parts) {
    if (part.type === 'operand') {
      chunks.push(money(part.operand.amount))
    } else if (part.type === 'operator') {
      chunks.push(part.operator === '−' ? '-' : part.operator)
    }
  }
  return chunks.join(' ')
}

/** Builds legacy flat `FormulaLine[]` from structured sections (single source of truth for amounts). */
export function deriveFormulaLinesFromSections(
  sections: ScenarioFormulaSection[],
  ctx: DeriveFormulaLinesContext,
): FormulaLine[] {
  const lines: FormulaLine[] = []
  const grossIncome = findScenarioEquationResultAmount(sections, '綜合所得總額')
  if (grossIncome !== undefined) {
    lines.push({
      label: '綜合所得總額',
      expression: ctx.includeDividend ? '薪資淨額 + 股利 + 利息 + 其他收入' : '薪資淨額 + 利息 + 其他收入',
      amount: grossIncome,
    })
  }

  if (findScenarioEquationResultAmount(sections, '基本生活費差額') !== undefined) {
    lines.push({
      label: '基本生活費差額',
      expression: basicLivingExpenseExpression(ctx.inputs),
      amount: -ctx.basicLivingExpenseDifference,
    })
  }

  for (const part of ctx.taxableParts) {
    lines.push({
      label: part.label,
      expression: '依本方案可減除項目計算',
      amount: part.taxableIncome,
    })
    lines.push({
      label: `${part.label}稅額`,
      expression: `${money(part.taxableIncome)} × 級距稅率 - 累進差額`,
      amount: part.tax,
    })
  }

  if (ctx.dividendMode === 'merged') {
    const credit = findScenarioEquationResultAmount(sections, '股利可抵減稅額')
    if (credit !== undefined) {
      lines.push({
        label: '股利可抵減稅額',
        expression: `min(${money(ctx.totalDividend)} × 8.5%, 80,000)`,
        amount: -ctx.dividendCredit,
      })
    }
  } else if (ctx.dividendMode === 'separate_28') {
    const separateTax = findScenarioEquationResultAmount(sections, '股利分開計稅稅額')
    if (separateTax !== undefined) {
      lines.push({
        label: '股利分開計稅稅額',
        expression: `${money(ctx.totalDividend)} × 28%`,
        amount: ctx.separateDividendTax,
      })
    }
  }

  lines.push({
    label: '一般稅額',
    expression: regularTaxExpression(
      ctx.dividendMode,
      ctx.regularIncomeTaxBeforeDividendCredit,
      ctx.dividendCredit,
      ctx.separateDividendTax,
    ),
    amount: ctx.regularTax,
  })

  const amtSection = sections.find((section) => section.title === 'AMT 計算')
  if (amtSection) {
    for (const eq of amtSection.equations) {
      if (eq.label === '海外稅額扣抵') continue
      lines.push({
        label: eq.label,
        expression: equationTextExpression(eq),
        amount: eq.result.amount,
      })
    }
  }

  const hasAmtLines = amtSection && amtSection.equations.some((eq) => eq.label !== 'AMT 判斷')
  lines.push({
    label: '應繳納稅額',
    expression: hasAmtLines
      ? `${money(ctx.regularTax)} + ${money(ctx.amtSupplement)}`
      : `${money(ctx.regularTax)}`,
    amount: ctx.finalTax,
  })

  return lines
}

export interface ScenarioFormulaOperand {
  label: string
  amount: number
  displayValue?: string
}

export type ScenarioFormulaOperator = '+' | '−' | '×'

export type TakeMinSubPart =
  | { type: 'operand'; operand: ScenarioFormulaOperand }
  | { type: 'operator'; operator: ScenarioFormulaOperator }

export interface TakeMinCandidate {
  label: string
  amount: number
  subParts?: TakeMinSubPart[]
}

export type ScenarioFormulaPart =
  | { type: 'operand'; operand: ScenarioFormulaOperand }
  | { type: 'operator'; operator: ScenarioFormulaOperator }
  | { type: 'text'; text: string }
  | { type: 'floorZero'; isApplied: boolean }
  | { type: 'capAt'; amount: number; isHit: boolean }
  | { type: 'takeMin'; candidates: TakeMinCandidate[]; winner: number }

export interface ScenarioFormulaEquation {
  label: string
  parts: ScenarioFormulaPart[]
  result: ScenarioFormulaOperand
}

export interface ScenarioFormulaSection {
  title: string
  equations: ScenarioFormulaEquation[]
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
  /** Derived from `formulaSections` via `deriveFormulaLinesFromSections` (compact rows for tests). */
  formulas: FormulaLine[]
  formulaSections: ScenarioFormulaSection[]
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

function twd(value: number): string {
  return `${money(value)} 元`
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1).replace(/\.0$/, '')}%`
}

function operand(label: string, amount: number, displayValue = twd(amount)): ScenarioFormulaPart {
  return { type: 'operand', operand: { label, amount, displayValue } }
}

function result(label: string, amount: number, displayValue = twd(amount)): ScenarioFormulaOperand {
  return { label, amount, displayValue }
}

function op(operator: ScenarioFormulaOperator): ScenarioFormulaPart {
  return { type: 'operator', operator }
}

function text(value: string): ScenarioFormulaPart {
  return { type: 'text', text: value }
}

function floorZero(isApplied: boolean): ScenarioFormulaPart {
  return { type: 'floorZero', isApplied }
}

function capAt(amount: number, isHit: boolean): ScenarioFormulaPart {
  return { type: 'capAt', amount, isHit }
}

function takeMin(candidates: TakeMinCandidate[], winner: number): ScenarioFormulaPart {
  return { type: 'takeMin', candidates, winner }
}

function equation(
  label: string,
  parts: ScenarioFormulaPart[],
  resultLabel: string,
  resultAmount: number,
  resultDisplayValue = twd(resultAmount),
): ScenarioFormulaEquation {
  return {
    label,
    parts,
    result: result(resultLabel, resultAmount, resultDisplayValue),
  }
}

function bracketFor(netIncome: number): ReturnType<typeof getBrackets>[number] {
  return getBrackets().find((b) => b.up_to === null || netIncome <= b.up_to) ?? getBrackets()[0]
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
      return '配偶所得合併計稅'
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
): Pick<TaxScenario, 'basicIncome' | 'basicTax' | 'overseasTaxCredit' | 'amtSupplement'> {
  if (overseasIncome <= 0) {
    return {
      basicIncome: taxableIncome + separateDividendAmount,
      basicTax: 0,
      overseasTaxCredit: 0,
      amtSupplement: 0,
    }
  }

  if (overseasIncome < AMT_OVERSEAS_THRESHOLD) {
    return {
      basicIncome: taxableIncome + separateDividendAmount,
      basicTax: 0,
      overseasTaxCredit: 0,
      amtSupplement: 0,
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
  }
}

function regularTaxExpression(
  dividendMode: DividendScenarioMode,
  regularIncomeTaxBeforeDividendCredit: number,
  dividendCredit: number,
  separateDividendTax: number,
): string {
  if (dividendMode === 'merged') {
    return `${money(regularIncomeTaxBeforeDividendCredit)} - ${money(dividendCredit)}`
  }

  if (dividendMode === 'separate_28') {
    return `${money(regularIncomeTaxBeforeDividendCredit)} + ${money(separateDividendTax)}`
  }

  return `${money(regularIncomeTaxBeforeDividendCredit)}`
}

function buildBasicLivingEquation(
  inputs: TaxScenarioInputs,
  basicLivingExpenseDifference: number,
): ScenarioFormulaEquation {
  const householdMemberCount = Math.max(0, Math.floor(inputs.householdMemberCount))
  return equation(
    '基本生活費差額',
    [
      operand('基本生活費', getNumber('basic_living_expense')),
      op('×'),
      operand('人數', householdMemberCount, `${householdMemberCount} 人`),
      op('−'),
      operand('免稅額', inputs.exemptionAmount),
      op('−'),
      operand('一般扣除額', inputs.generalDeductionAmount),
      op('−'),
      operand('特別扣除額', inputs.specialDeductionAmount),
      floorZero(basicLivingExpenseDifference === 0),
    ],
    '基本生活費差額',
    basicLivingExpenseDifference,
  )
}

function buildTaxEquation(
  label: string,
  taxableLabel: string,
  taxableIncome: number,
  resultLabel: string,
  tax: number,
): ScenarioFormulaEquation {
  const bracket = bracketFor(taxableIncome)
  return equation(
    label,
    [
      operand(taxableLabel, taxableIncome),
      op('×'),
      operand('稅率', bracket.rate, percent(bracket.rate)),
      op('−'),
      operand('累進差額', bracket.quick_deduction),
    ],
    resultLabel,
    tax,
  )
}

function buildGrossIncomeEquation(
  includeDividend: boolean,
  salaryNetIncome: number,
  dividendIncome: number,
  interestIncome: number,
  otherIncome: number,
  grossIncome: number,
): ScenarioFormulaEquation {
  const parts: ScenarioFormulaPart[] = [
    operand('薪資淨額', salaryNetIncome),
  ]
  if (includeDividend) {
    parts.push(op('+'), operand('股利', dividendIncome))
  }
  parts.push(
    op('+'),
    operand('利息', interestIncome),
    op('+'),
    operand('其他收入', otherIncome),
  )
  return equation('綜合所得總額', parts, '綜合所得總額', grossIncome)
}

function buildDividendSection(
  dividendMode: DividendScenarioMode,
  totalDividend: number,
  regularIncomeTaxBeforeDividendCredit: number,
  dividendCredit: number,
  separateDividendTax: number,
  regularTax: number,
): ScenarioFormulaSection | null {
  if (dividendMode === 'none') return null

  if (dividendMode === 'merged') {
    return {
      title: '股利處理',
      equations: [
        equation(
          '股利可抵減稅額',
          [
            operand('股利所得', totalDividend),
            op('×'),
            operand('扣抵率', DIVIDEND_CREDIT_RATE, percent(DIVIDEND_CREDIT_RATE)),
            capAt(DIVIDEND_CREDIT_CAP, dividendCredit >= DIVIDEND_CREDIT_CAP),
          ],
          '股利可抵減稅額',
          dividendCredit,
        ),
        equation(
          '一般所得稅額',
          [
            operand('應納稅額', regularIncomeTaxBeforeDividendCredit),
            op('−'),
            operand('股利可抵減稅額', dividendCredit),
          ],
          '一般所得稅額',
          regularTax,
        ),
      ],
    }
  }

  return {
    title: '股利處理',
    equations: [
      equation(
        '股利分開計稅稅額',
        [
          operand('股利所得', totalDividend),
          op('×'),
          operand('稅率', DIVIDEND_FLAT_RATE, percent(DIVIDEND_FLAT_RATE)),
        ],
        '股利分開計稅稅額',
        separateDividendTax,
      ),
      equation(
        '一般所得稅額',
        [
          operand('應納稅額', regularIncomeTaxBeforeDividendCredit),
          op('+'),
          operand('股利分開計稅稅額', separateDividendTax),
        ],
        '一般所得稅額',
        regularTax,
      ),
    ],
  }
}

function buildAmtSection(
  taxableIncome: number,
  separateDividendAmount: number,
  regularTax: number,
  overseasIncome: number,
  overseasTaxPaid: number,
  basicIncome: number,
  basicTax: number,
  overseasTaxCredit: number,
  amtSupplement: number,
): ScenarioFormulaSection | null {
  if (overseasIncome <= 0) return null

  if (overseasIncome < AMT_OVERSEAS_THRESHOLD) {
    return {
      title: 'AMT 計算',
      equations: [
        equation(
          'AMT 判斷',
          [
            operand('海外所得', overseasIncome),
            text('未達 1,000,000 元，不計入核心 AMT 試算'),
          ],
          'AMT 補稅',
          0,
        ),
      ],
    }
  }

  const amtGap = Math.max(0, basicTax - regularTax)

  const basicIncomeParts: ScenarioFormulaPart[] = [
    operand('綜合所得淨額', taxableIncome),
  ]
  if (separateDividendAmount > 0) {
    basicIncomeParts.push(op('+'), operand('股利分開計稅所得', separateDividendAmount))
  }
  basicIncomeParts.push(op('+'), operand('海外所得', overseasIncome))

  return {
    title: 'AMT 計算',
    equations: [
      equation(
        '基本所得額',
        basicIncomeParts,
        '基本所得額',
        basicIncome,
      ),
      equation(
        '基本稅額',
        [
          operand('基本所得額', basicIncome),
          op('−'),
          operand('基本所得額扣除額', AMT_BASIC_INCOME_DEDUCTION),
          floorZero(basicIncome < AMT_BASIC_INCOME_DEDUCTION),
          op('×'),
          operand('稅率', AMT_RATE, percent(AMT_RATE)),
        ],
        '基本稅額',
        basicTax,
      ),
      equation(
        '海外稅額扣抵',
        [
          takeMin(
            [
              { label: '海外已納所得稅', amount: Math.max(0, overseasTaxPaid) },
              {
                label: 'AMT 可扣抵額',
                amount: amtGap,
                subParts: [
                  { type: 'operand', operand: { label: '基本稅額', amount: basicTax, displayValue: twd(basicTax) } },
                  { type: 'operator', operator: '−' },
                  { type: 'operand', operand: { label: '一般所得稅額', amount: regularTax, displayValue: twd(regularTax) } },
                ],
              },
            ],
            Math.max(0, overseasTaxPaid) <= amtGap ? 0 : 1,
          ),
        ],
        '海外稅額扣抵',
        overseasTaxCredit,
      ),
      equation(
        'AMT 補稅',
        [
          operand('基本稅額', basicTax),
          op('−'),
          operand('一般所得稅額', regularTax),
          op('−'),
          operand('海外稅額扣抵', overseasTaxCredit),
          floorZero(basicTax - regularTax - overseasTaxCredit < 0),
        ],
        'AMT 補稅',
        amtSupplement,
      ),
    ],
  }
}

function buildFinalTaxSection(
  regularTax: number,
  amtSupplement: number,
  finalTax: number,
  includeAmt: boolean,
): ScenarioFormulaSection {
  const parts: ScenarioFormulaPart[] = [operand('一般所得稅額', regularTax)]
  if (includeAmt) {
    parts.push(op('+'), operand('AMT 補稅', amtSupplement))
  }
  return {
    title: '應繳納稅額',
    equations: [
      equation('應繳納稅額', parts, '應繳納稅額', finalTax),
    ],
  }
}

function buildScenario(
  inputs: TaxScenarioInputs,
  coupleMode: CoupleScenarioMode,
  dividendMode: DividendScenarioMode,
): TaxScenario {
  const includeDividend = dividendMode === 'merged'
  const totalDividend = sumPersons(inputs.persons, (person) => person.dividendIncome)
  const salaryNetIncome = sumPersons(inputs.persons, (person) => person.salaryNetIncome)
  const interestIncome = sumPersons(inputs.persons, (person) => person.interestIncome)
  const otherIncome = sumPersons(inputs.persons, (person) => person.otherIncome)
  const grossIncome = sumPersons(inputs.persons, (person) => personIncome(person, includeDividend))
  const basicLivingExpenseDifference = calcBasicLivingExpenseDifference(inputs)
  const assumptions: string[] = []
  const incomeSections: ScenarioFormulaSection[] = []

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
    const tax = calcTax(taxableIncome)
    taxableParts = [{ label: '綜合所得淨額', taxableIncome, tax }]
    incomeSections.push({
      title: '所得計算',
      equations: [
        buildGrossIncomeEquation(includeDividend, salaryNetIncome, totalDividend, interestIncome, otherIncome, grossIncome),
        buildBasicLivingEquation(inputs, basicLivingExpenseDifference),
        equation(
          '綜合所得淨額',
          [
            operand('綜合所得總額', grossIncome),
            op('−'),
            operand('免稅額', inputs.exemptionAmount),
            op('−'),
            operand('一般扣除額', inputs.generalDeductionAmount),
            op('−'),
            operand('特別扣除額', inputs.specialDeductionAmount),
            op('−'),
            operand('基本生活費差額', basicLivingExpenseDifference),
          ],
          '綜合所得淨額',
          taxableIncome,
        ),
        buildTaxEquation('應納稅額', '綜合所得淨額', taxableIncome, '應納稅額', tax),
      ],
    })
  } else if (coupleMode === 'self_salary_separate' || coupleMode === 'spouse_salary_separate') {
    const splitPersonId = coupleMode === 'self_salary_separate' ? 'self' : 'spouse'
    const splitPerson = getPerson(inputs.persons, splitPersonId)
    const splitExemption = getPersonExemption(inputs, splitPersonId)
    assumptions.push('未能歸屬到特定個人的扣除額放在非分開計稅方。')
    const splitTaxable = Math.max(0, splitPerson.salaryNetIncome - splitExemption)
    const splitTax = calcTax(splitTaxable)
    const otherExemption = inputs.exemptionAmount - splitExemption
    const otherTaxable = Math.max(
      0,
      grossIncome -
        splitPerson.salaryNetIncome -
        otherExemption -
        inputs.generalDeductionAmount -
        inputs.specialDeductionAmount -
        basicLivingExpenseDifference,
    )
    const otherTax = calcTax(otherTaxable)
    taxableParts = [
      { label: `${splitPerson.label}薪資分開計稅淨額`, taxableIncome: splitTaxable, tax: splitTax },
      { label: '不含薪資分開計稅部分所得淨額', taxableIncome: otherTaxable, tax: otherTax },
    ]
    incomeSections.push(
      {
        title: `${splitPerson.label}薪資所得分開計稅`,
        equations: [
          equation(
            `${splitPerson.label}薪資分開計稅淨額`,
            [
              operand(`${splitPerson.label}薪資淨額`, splitPerson.salaryNetIncome),
              op('−'),
              operand(`${splitPerson.label}免稅額`, splitExemption),
            ],
            `${splitPerson.label}薪資分開計稅淨額`,
            splitTaxable,
          ),
          buildTaxEquation(
            `${splitPerson.label}薪資分開應納稅額`,
            `${splitPerson.label}薪資分開計稅淨額`,
            splitTaxable,
            `${splitPerson.label}薪資分開應納稅額`,
            splitTax,
          ),
        ],
      },
      {
        title: '不含薪資分開計稅部分',
        equations: [
          buildBasicLivingEquation(inputs, basicLivingExpenseDifference),
          equation(
            '剩餘所得淨額',
            [
              operand('綜合所得總額', grossIncome),
              op('−'),
              operand(`${splitPerson.label}薪資淨額`, splitPerson.salaryNetIncome),
              op('−'),
              operand('其餘免稅額', otherExemption),
              op('−'),
              operand('一般扣除額', inputs.generalDeductionAmount),
              op('−'),
              operand('特別扣除額', inputs.specialDeductionAmount),
              op('−'),
              operand('基本生活費差額', basicLivingExpenseDifference),
            ],
            '剩餘所得淨額',
            otherTaxable,
          ),
          buildTaxEquation('剩餘部分應納稅額', '剩餘所得淨額', otherTaxable, '剩餘部分應納稅額', otherTax),
        ],
      },
      {
        title: '加總',
        equations: [
          equation(
            '應納稅額',
            [
              operand(`${splitPerson.label}薪資分開應納稅額`, splitTax),
              op('+'),
              operand('剩餘部分應納稅額', otherTax),
            ],
            '應納稅額',
            splitTax + otherTax,
          ),
        ],
      },
    )
  } else {
    const splitPersonId = coupleMode === 'self_all_income_separate' ? 'self' : 'spouse'
    const splitPerson = getPerson(inputs.persons, splitPersonId)
    const splitExemption = getPersonExemption(inputs, splitPersonId)
    const splitGross = personIncome(splitPerson, includeDividend)
    assumptions.push('未能歸屬到特定個人的扣除額放在非分開計稅方。')
    const splitSavingsDeduction = calcSplitSavingsDeduction(
      splitPerson,
      inputs.persons,
      inputs.savingsInvestmentDeductionAmount,
    )
    const otherSpecialDeduction = Math.max(0, inputs.specialDeductionAmount - splitSavingsDeduction)
    const splitTaxable = Math.max(0, splitGross - splitExemption - splitSavingsDeduction)
    const splitTax = calcTax(splitTaxable)
    const otherExemption = inputs.exemptionAmount - splitExemption
    const otherTaxable = Math.max(
      0,
      grossIncome -
        splitGross -
        otherExemption -
        inputs.generalDeductionAmount -
        otherSpecialDeduction -
        basicLivingExpenseDifference,
    )
    const otherTax = calcTax(otherTaxable)
    taxableParts = [
      { label: `${splitPerson.label}各類所得分開計稅淨額`, taxableIncome: splitTaxable, tax: splitTax },
      { label: '不含各類所得分開計稅部分所得淨額', taxableIncome: otherTaxable, tax: otherTax },
    ]
    incomeSections.push(
      {
        title: `${splitPerson.label}各類所得分開計稅`,
        equations: [
          equation(
            `${splitPerson.label}各類所得分開計稅淨額`,
            [
              operand(`${splitPerson.label}各類所得總額`, splitGross),
              op('−'),
              operand(`${splitPerson.label}免稅額`, splitExemption),
              op('−'),
              operand('分開方儲蓄投資特別扣除額', splitSavingsDeduction),
            ],
            `${splitPerson.label}各類所得分開計稅淨額`,
            splitTaxable,
          ),
          buildTaxEquation(
            `${splitPerson.label}各類所得分開應納稅額`,
            `${splitPerson.label}各類所得分開計稅淨額`,
            splitTaxable,
            `${splitPerson.label}各類所得分開應納稅額`,
            splitTax,
          ),
        ],
      },
      {
        title: '不含各類所得分開計稅部分',
        equations: [
          buildBasicLivingEquation(inputs, basicLivingExpenseDifference),
          equation(
            '剩餘所得淨額',
            [
              operand('綜合所得總額', grossIncome),
              op('−'),
              operand(`${splitPerson.label}各類所得總額`, splitGross),
              op('−'),
              operand('其餘免稅額', otherExemption),
              op('−'),
              operand('一般扣除額', inputs.generalDeductionAmount),
              op('−'),
              operand('其餘特別扣除額', otherSpecialDeduction),
              op('−'),
              operand('基本生活費差額', basicLivingExpenseDifference),
            ],
            '剩餘所得淨額',
            otherTaxable,
          ),
          buildTaxEquation('剩餘部分應納稅額', '剩餘所得淨額', otherTaxable, '剩餘部分應納稅額', otherTax),
        ],
      },
      {
        title: '加總',
        equations: [
          equation(
            '應納稅額',
            [
              operand(`${splitPerson.label}各類所得分開應納稅額`, splitTax),
              op('+'),
              operand('剩餘部分應納稅額', otherTax),
            ],
            '應納稅額',
            splitTax + otherTax,
          ),
        ],
      },
    )
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
  const overseasIncome = Math.max(0, inputs.overseasIncome)
  const overseasTaxPaid = Math.max(0, inputs.overseasTaxPaid)
  const separateDividendAmount = dividendMode === 'separate_28' ? totalDividend : 0
  const amt = buildAmtLines(
    taxableIncome,
    separateDividendAmount,
    regularTax,
    overseasIncome,
    overseasTaxPaid,
  )
  const finalTax = regularTax + amt.amtSupplement
  const divTitle = dividendTitle(dividendMode)
  const dividendSection = buildDividendSection(
    dividendMode,
    totalDividend,
    regularIncomeTaxBeforeDividendCredit,
    dividendCredit,
    separateDividendTax,
    regularTax,
  )
  const amtSection = buildAmtSection(
    taxableIncome,
    separateDividendAmount,
    regularTax,
    overseasIncome,
    overseasTaxPaid,
    amt.basicIncome,
    amt.basicTax,
    amt.overseasTaxCredit,
    amt.amtSupplement,
  )
  const formulaSections = [
    ...incomeSections,
    ...(dividendSection ? [dividendSection] : []),
    ...(amtSection ? [amtSection] : []),
    buildFinalTaxSection(regularTax, amt.amtSupplement, finalTax, overseasIncome > 0),
  ]

  const formulas = deriveFormulaLinesFromSections(formulaSections, {
    inputs,
    taxableParts,
    includeDividend,
    dividendMode,
    totalDividend,
    dividendCredit,
    separateDividendTax,
    regularIncomeTaxBeforeDividendCredit,
    regularTax,
    finalTax,
    basicLivingExpenseDifference,
    overseasIncome,
    amtSupplement: amt.amtSupplement,
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
    formulaSections,
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
