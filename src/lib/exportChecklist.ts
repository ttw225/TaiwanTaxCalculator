import type { CardInputMap, CategoryId, ChecklistItem } from '../types/content'
import type { CategoryGroup } from './checklist'
import {
  checklistExportMarkdownHeader,
  checklistExportSiteFooter,
  checklistExportSiteHeader,
} from './checklistCardCopy'
import {
  resolveGeneralDeduction,
  getItemizedItemAmount,
  ITEMIZED_ITEM_IDS,
  type GeneralDeductionResolution,
  type ItemizedCalcContext,
} from './generalDeductionEffective'
import {
  INCOME_CARD_CONFIGS,
  INCOME_CARD_IDS,
  calcPersonNetIncome,
  calcRawIncomeTotal,
  getSalaryDeductionCap,
  getVisibleIncomeCardPersons,
  incomeCardIsComplete,
  parseIncomeCardPersons,
  parseIncomeParticipantsFromMap,
  type IncomeCardId,
} from './grossIncome'
import { getNumber } from './numbers'
import {
  COUPLE_LABEL_MAP,
  COUPLE_TYPE_MAP,
  DIVIDEND_LABEL_MAP,
  displayScenarioTitle,
} from './scenarioLabels'
import {
  calcBasicLivingExpenseDifference,
  calcTaxScenarios,
  type ScenarioFormulaEquation,
  type ScenarioFormulaPart,
  type ScenarioFormulaSection,
  type TakeMinCandidate,
  type TaxScenarioPerson,
  type TaxScenarioResult,
} from './taxScenarios'

export interface ExportInput {
  groups: CategoryGroup[]
  cardInputMap: CardInputMap
  isMarriedFiling: boolean
  totalSelected: number
  exportTime: string
}

const PENDING = '待填寫'

// ── tiny parsing helpers (mirrors ChecklistResult.tsx) ───────────────────────

function parseNonNegativeAmount(raw: string | undefined): number {
  if (!raw || raw.trim() === '') return 0
  const value = Number(raw.replace(/,/g, ''))
  return Number.isFinite(value) && value > 0 ? value : 0
}

type ExemptionAgeBand = 'under_70' | 'over_70'

function parseAgeBand(raw: string | undefined): ExemptionAgeBand | null {
  return raw === 'under_70' || raw === 'over_70' ? raw : null
}

function getExemptionByAgeBand(ageBand: ExemptionAgeBand): number {
  return getNumber(ageBand === 'over_70' ? 'exemption_senior_70' : 'exemption_general')
}

function parseCount(raw: string | undefined): number {
  if (!raw || raw.trim() === '') return 0
  const value = Number(raw.replace(/,/g, ''))
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0
}

function fmt(n: number): string {
  return n.toLocaleString('zh-TW')
}

function escapeMd(text: string): string {
  return text.replace(/[\r\n]+/g, ' ').replace(/[[\]]/g, (c) => `\\${c}`)
}

function fmtMoney(n: number | null): string {
  return n === null ? PENDING : `${fmt(n)} 元`
}

// ── special deduction meta (mirrors ChecklistResult.tsx) ─────────────────────

type SpecialFieldDef =
  | { type: 'amount'; fieldId: string; capKey: string | null }
  | { type: 'count'; fieldId: string; perUnitKey: string }
  | { type: 'split'; fieldId: string; firstKey: string; additionalKey: string }

interface SpecialDeductionMeta {
  label: string
  fields: SpecialFieldDef[]
}

const SPECIAL_DEDUCTION_META: Record<string, SpecialDeductionMeta> = {
  'savings-investment-deduction': {
    label: '儲蓄投資',
    fields: [{ type: 'amount', fieldId: 'savings_investment_amount', capKey: 'special_deduction_savings_investment' }],
  },
  'disability-special-deduction': {
    label: '身心障礙',
    fields: [{ type: 'count', fieldId: 'disability_count', perUnitKey: 'special_deduction_disability' }],
  },
  'childcare-deduction': {
    label: '幼兒學前',
    fields: [
      { type: 'split', fieldId: 'childcare_count', firstKey: 'special_deduction_childcare_first', additionalKey: 'special_deduction_childcare_additional' },
    ],
  },
  'education-tuition-deduction': {
    label: '教育學費',
    fields: [{ type: 'count', fieldId: 'education_count', perUnitKey: 'special_deduction_education_tuition' }],
  },
  'long-term-care-deduction': {
    label: '長期照顧',
    fields: [{ type: 'count', fieldId: 'long_term_care_count', perUnitKey: 'special_deduction_long_term_care' }],
  },
  'rent-deduction': {
    label: '房屋租金支出',
    fields: [{ type: 'amount', fieldId: 'rent_amount', capKey: 'special_deduction_rent' }],
  },
}

function getSpecialDeductionItemAmount(
  itemId: string,
  inputs: Record<string, string>,
): number | null {
  const meta = SPECIAL_DEDUCTION_META[itemId]
  if (!meta) return null
  let total = 0
  for (const f of meta.fields) {
    const raw = inputs[f.fieldId] ?? ''
    if (raw === '') return null
    const num = Number(raw.replace(/,/g, ''))
    if (f.type === 'amount') {
      if (!Number.isFinite(num) || num <= 0) return null
      const cap = f.capKey ? getNumber(f.capKey) : Infinity
      total += Math.min(num, cap)
    } else if (f.type === 'split') {
      if (Number.isFinite(num) && num < 0) return null
      if (Number.isFinite(num) && num > 0) {
        const count = Math.floor(num)
        total += getNumber(f.firstKey) + Math.max(count - 1, 0) * getNumber(f.additionalKey)
      }
    } else {
      if (Number.isFinite(num) && num < 0) return null
      if (Number.isFinite(num) && num > 0) total += Math.floor(num) * getNumber(f.perUnitKey)
    }
  }
  return total
}

// ── Derived data ─────────────────────────────────────────────────────────────

interface ExemptionResolved {
  amount: number
  selfExemptionAmount: number
  spouseExemptionAmount: number
  householdMemberCount: number
}

interface IncomeSummary {
  id: IncomeCardId
  label: string
  amount: number
  complete: boolean
}

interface DerivedData {
  isMarriedFiling: boolean
  groups: CategoryGroup[]
  cardInputMap: CardInputMap
  participants: ReturnType<typeof parseIncomeParticipantsFromMap>
  presentIncomeCardIds: Set<IncomeCardId>
  incomeSummaries: IncomeSummary[]
  scenarioPersons: TaxScenarioPerson[]
  grossIncomeMergedAmount: number | null
  grossIncomeSeparateDividendAmount: number | null
  dividendIncomeAmount: number
  interestIncomeAmount: number
  overseasIncomeAmount: number
  overseasTaxPaidAmount: number
  hasOverseasIncomeSection: boolean
  exemption: ExemptionResolved | null
  generalDeduction: GeneralDeductionResolution
  generalDeductionAmount: number | null
  generalDeductionMethod: 'standard' | 'itemized' | null
  itemizedContext: Partial<ItemizedCalcContext>
  specialDeductionFormulaItems: { id: string; label: string; amount: number | null }[]
  specialDeductionAmount: number | null
  hasSpecialDeductions: boolean
  savingsInvestmentEnabled: boolean
  savingsInvestmentDeductionAmount: number | null
  basicLivingExpenseDifference: number | null
  taxScenarioResult: TaxScenarioResult | null
}

function deriveExportData(input: ExportInput): DerivedData {
  const { groups, cardInputMap, isMarriedFiling } = input

  const participants = parseIncomeParticipantsFromMap(cardInputMap, isMarriedFiling)

  const presentIncomeCardIds = new Set<IncomeCardId>(
    groups
      .flatMap((g) => g.items)
      .map((item) => item.id)
      .filter((id): id is IncomeCardId => INCOME_CARD_IDS.includes(id as IncomeCardId)),
  )

  const incomeSummaries: IncomeSummary[] = INCOME_CARD_IDS
    .filter((id) => presentIncomeCardIds.has(id))
    .map((id) => {
      const config = INCOME_CARD_CONFIGS[id]
      const persons = parseIncomeCardPersons(cardInputMap[id] ?? {}, participants)
      const visible = getVisibleIncomeCardPersons(persons)
      const amount = config.kind === 'salary'
        ? persons.reduce((sum, p) => sum + calcPersonNetIncome(p.income), 0)
        : calcRawIncomeTotal(persons.map((p) => ({ id: p.id, label: p.label, income: p.income })))
      return {
        id,
        label: config.formulaLabel,
        amount,
        complete: incomeCardIsComplete(config, visible),
      }
    })

  const scenarioPersons: TaxScenarioPerson[] = (() => {
    const byId = new Map<string, TaxScenarioPerson>()
    for (const p of participants) {
      byId.set(p.id, {
        id: p.id,
        label: p.label,
        salaryNetIncome: 0,
        dividendIncome: 0,
        interestIncome: 0,
        otherIncome: 0,
      })
    }
    for (const id of presentIncomeCardIds) {
      const config = INCOME_CARD_CONFIGS[id]
      const persons = parseIncomeCardPersons(cardInputMap[id] ?? {}, participants)
      for (const person of persons) {
        const target = byId.get(person.id)
        if (!target) continue
        if (config.kind === 'salary') target.salaryNetIncome = calcPersonNetIncome(person.income)
        else if (config.kind === 'dividend') target.dividendIncome = person.income
        else if (config.kind === 'interest') target.interestIncome = person.income
        else target.otherIncome = person.income
      }
    }
    return Array.from(byId.values())
  })()

  const allComplete = incomeSummaries.every((s) => s.complete)
  const grossIncomeMergedAmount = allComplete
    ? incomeSummaries.reduce((sum, s) => sum + s.amount, 0)
    : null
  const grossIncomeSeparateDividendAmount = allComplete
    ? incomeSummaries.filter((s) => s.id !== 'dividend-income').reduce((sum, s) => sum + s.amount, 0)
    : null
  const dividendIncomeAmount = incomeSummaries.find((s) => s.id === 'dividend-income')?.amount ?? 0
  const interestIncomeAmount = incomeSummaries.find((s) => s.id === 'interest-income')?.amount ?? 0

  const hasOverseasIncomeSection = groups.some((g) => g.category === 'overseas_income')
  const overseasIncomeAmount = hasOverseasIncomeSection
    ? parseNonNegativeAmount(cardInputMap['overseas-income-amt']?.['overseas_income_amount'])
    : 0
  const overseasTaxPaidAmount = hasOverseasIncomeSection
    ? parseNonNegativeAmount(cardInputMap['overseas-income-amt']?.['overseas_income_tax_paid'])
    : 0

  // Exemption
  const exemption: ExemptionResolved | null = (() => {
    const inputs = cardInputMap['exemption-general'] ?? {}
    const selfAgeBand = parseAgeBand(inputs['self_age_band'])
    const spouseAgeBand = isMarriedFiling ? parseAgeBand(inputs['spouse_age_band']) : null
    if (!selfAgeBand || (isMarriedFiling && !spouseAgeBand)) return null
    const selfExemptionAmount = getExemptionByAgeBand(selfAgeBand)
    const spouseExemptionAmount = spouseAgeBand ? getExemptionByAgeBand(spouseAgeBand) : 0
    const under = parseCount(inputs['exemption_under70_count'])
    const over = parseCount(inputs['exemption_over70_count'])
    const dependentAmount = under * getNumber('exemption_general') + over * getNumber('exemption_senior_70')
    return {
      amount: selfExemptionAmount + spouseExemptionAmount + dependentAmount,
      selfExemptionAmount,
      spouseExemptionAmount,
      householdMemberCount: 1 + (isMarriedFiling ? 1 : 0) + under + over,
    }
  })()

  // Savings-investment
  const specialDeductionGroup = groups.find((g) => g.category === 'special_deductions')
  const hasSpecialDeductions = (specialDeductionGroup?.items.length ?? 0) > 0
  const savingsInvestmentEnabled =
    specialDeductionGroup?.items.some((i) => i.id === 'savings-investment-deduction') ?? false
  const savingsInvestmentDeductionAmount = savingsInvestmentEnabled
    ? Math.min(interestIncomeAmount, getNumber('special_deduction_savings_investment'))
    : null

  const itemizedContext: Partial<ItemizedCalcContext> = {
    grossIncomeAmount: grossIncomeMergedAmount,
    dividendMergedGrossIncomeAmount: dividendIncomeAmount > 0 ? grossIncomeMergedAmount : null,
    dividendSeparateGrossIncomeAmount: dividendIncomeAmount > 0 ? grossIncomeSeparateDividendAmount : null,
    savingsInvestmentEnabled,
    savingsInvestmentDeductionAmount,
  }

  const generalDeduction = resolveGeneralDeduction(groups, cardInputMap, isMarriedFiling, itemizedContext)
  const generalDeductionAmount =
    generalDeduction.status === 'pending_itemized' ? null : generalDeduction.amount
  const standardKey = isMarriedFiling ? 'standard_deduction_married' : 'standard_deduction_single'
  const generalDeductionMethod: 'standard' | 'itemized' | null =
    generalDeduction.status === 'pending_itemized'
      ? null
      : generalDeduction.status === 'standard_only' || generalDeductionAmount === null
        ? 'standard'
        : (generalDeductionAmount > getNumber(standardKey) ? 'itemized' : 'standard')

  // Special deduction lines
  const specialDeductionFormulaItems = (specialDeductionGroup?.items ?? [])
    .filter((item) => SPECIAL_DEDUCTION_META[item.id])
    .map((item) => ({
      id: item.id,
      label: SPECIAL_DEDUCTION_META[item.id].label,
      amount: item.id === 'savings-investment-deduction'
        ? Math.min(interestIncomeAmount, getNumber('special_deduction_savings_investment'))
        : getSpecialDeductionItemAmount(item.id, cardInputMap[item.id] ?? {}),
    }))
  const specialDeductionAmount = (() => {
    if (specialDeductionFormulaItems.length === 0) return null
    if (specialDeductionFormulaItems.some((i) => i.amount === null)) return null
    return specialDeductionFormulaItems.reduce((sum, i) => sum + (i.amount ?? 0), 0)
  })()

  const basicLivingExpenseDifference = (() => {
    if (
      !exemption ||
      generalDeductionAmount === null ||
      (hasSpecialDeductions && specialDeductionAmount === null)
    ) return null
    return calcBasicLivingExpenseDifference({
      exemptionAmount: exemption.amount,
      householdMemberCount: exemption.householdMemberCount,
      generalDeductionAmount,
      specialDeductionAmount: hasSpecialDeductions ? (specialDeductionAmount ?? 0) : 0,
    })
  })()

  const taxScenarioResult: TaxScenarioResult | null = (() => {
    if (
      !allComplete ||
      !exemption ||
      generalDeductionAmount === null ||
      (hasSpecialDeductions && specialDeductionAmount === null)
    ) return null
    return calcTaxScenarios({
      isMarried: isMarriedFiling,
      persons: scenarioPersons,
      exemptionAmount: exemption.amount,
      selfExemptionAmount: exemption.selfExemptionAmount,
      spouseExemptionAmount: exemption.spouseExemptionAmount,
      householdMemberCount: exemption.householdMemberCount,
      generalDeductionAmount,
      specialDeductionAmount: hasSpecialDeductions ? (specialDeductionAmount ?? 0) : 0,
      savingsInvestmentDeductionAmount: savingsInvestmentDeductionAmount ?? 0,
      overseasIncome: overseasIncomeAmount,
      overseasTaxPaid: overseasTaxPaidAmount,
    })
  })()

  return {
    isMarriedFiling,
    groups,
    cardInputMap,
    participants,
    presentIncomeCardIds,
    incomeSummaries,
    scenarioPersons,
    grossIncomeMergedAmount,
    grossIncomeSeparateDividendAmount,
    dividendIncomeAmount,
    interestIncomeAmount,
    overseasIncomeAmount,
    overseasTaxPaidAmount,
    hasOverseasIncomeSection,
    exemption,
    generalDeduction,
    generalDeductionAmount,
    generalDeductionMethod,
    itemizedContext,
    specialDeductionFormulaItems,
    specialDeductionAmount,
    hasSpecialDeductions,
    savingsInvestmentEnabled,
    savingsInvestmentDeductionAmount,
    basicLivingExpenseDifference,
    taxScenarioResult,
  }
}

// ── Item-level renderers (static content shared by every card) ──────────────

function renderStaticItemContent(item: ChecklistItem, lines: string[]) {
  if (item.why_it_matters) {
    lines.push('', item.why_it_matters)
  }
  if (item.eligibility_cues.length > 0) {
    lines.push('', '**適用條件**')
    for (const cue of item.eligibility_cues) lines.push(`- ${cue}`)
  }
  if (item.documents_to_prepare.length > 0) {
    lines.push('', '**需準備文件**')
    for (const doc of item.documents_to_prepare) lines.push(`- [ ] ${doc}`)
  }
  if (item.source_refs.length > 0) {
    lines.push('', '**來源**')
    for (const ref of item.source_refs) {
      const authority = ref.authority ? ` · ${ref.authority}` : ''
      lines.push(`- ${ref.label}${authority}`)
    }
  }
}

// ── Section: gross_income ────────────────────────────────────────────────────

function renderIncomeCard(item: ChecklistItem, data: DerivedData, lines: string[]) {
  const id = item.id as IncomeCardId
  const config = INCOME_CARD_CONFIGS[id]
  const persons = parseIncomeCardPersons(data.cardInputMap[id] ?? {}, data.participants)
  const visible = getVisibleIncomeCardPersons(persons)
  const summary = data.incomeSummaries.find((s) => s.id === id)

  lines.push('', `### ${item.title}`)
  if (item.why_it_matters) lines.push('', item.why_it_matters)

  lines.push('', '**填寫內容**')
  if (visible.length === 0) {
    lines.push(`- ${PENDING}`)
  } else if (config.kind === 'salary') {
    const cap = getSalaryDeductionCap()
    for (const p of visible) {
      if (!p.hasInput) {
        lines.push(`- ${escapeMd(p.label)}：${PENDING}`)
        continue
      }
      const net = calcPersonNetIncome(p.income)
      const deduction = Math.min(p.income, cap)
      const capNote = p.income > cap ? `（已達薪資特別扣除上限 ${fmt(cap)} 元）` : ''
      lines.push(`- ${escapeMd(p.label)}：${config.inputLabel} ${fmt(p.income)} 元 − 薪資特別扣除 ${fmt(deduction)} 元${capNote} → 薪資淨額 ${fmt(net)} 元`)
    }
  } else {
    for (const p of visible) {
      if (!p.hasInput && p.id !== 'self' && p.id !== 'spouse') {
        lines.push(`- ${escapeMd(p.label)}：${PENDING}`)
      } else {
        lines.push(`- ${escapeMd(p.label)}：${config.inputLabel} ${fmt(p.income)} 元`)
      }
    }
  }

  if (summary) {
    lines.push('', `**小計**：${summary.complete ? `${fmt(summary.amount)} 元` : PENDING}`)
  }

  if (item.eligibility_cues.length > 0) {
    lines.push('', '**適用條件**')
    for (const cue of item.eligibility_cues) lines.push(`- ${cue}`)
  }
  if (item.documents_to_prepare.length > 0) {
    lines.push('', '**需準備文件**')
    for (const doc of item.documents_to_prepare) lines.push(`- [ ] ${doc}`)
  }
  if (item.source_refs.length > 0) {
    lines.push('', '**來源**')
    for (const ref of item.source_refs) {
      const authority = ref.authority ? ` · ${ref.authority}` : ''
      lines.push(`- ${ref.label}${authority}`)
    }
  }
}

function renderGrossIncomeSection(group: CategoryGroup, data: DerivedData, lines: string[]) {
  lines.push('', '---', '', `## ${group.label}`)
  const subtotal = data.grossIncomeMergedAmount
  lines.push('', `**公式**：薪資淨額 + 股利收入 + 利息收入 + 其他收入 = 綜合所得總額`)
  lines.push(`**小計**：${fmtMoney(subtotal)}`)

  if (data.dividendIncomeAmount > 0 && data.grossIncomeMergedAmount !== null && data.grossIncomeSeparateDividendAmount !== null) {
    lines.push('')
    lines.push(`- 股利合併入所得：${fmt(data.grossIncomeMergedAmount)} 元`)
    lines.push(`- 股利 28% 分開計稅：其他所得 ${fmt(data.grossIncomeSeparateDividendAmount)} 元（股利不併計）`)
  }

  for (const item of group.items) {
    renderIncomeCard(item, data, lines)
  }
}

// ── Section: overseas_income ─────────────────────────────────────────────────

function renderOverseasIncomeSection(group: CategoryGroup, data: DerivedData, lines: string[]) {
  lines.push('', '---', '', `## ${group.label}`)
  const inputs = data.cardInputMap['overseas-income-amt'] ?? {}
  const amountRaw = inputs['overseas_income_amount'] ?? ''
  const taxPaidRaw = inputs['overseas_income_tax_paid'] ?? ''
  lines.push('', '**填寫內容**')
  lines.push(`- 海外所得金額：${amountRaw.trim() === '' ? PENDING : `${fmt(data.overseasIncomeAmount)} 元`}`)
  lines.push(`- 已繳國外稅額：${taxPaidRaw.trim() === '' ? PENDING : `${fmt(data.overseasTaxPaidAmount)} 元`}`)
  lines.push('', '> 全年海外所得合計達 100 萬元以上時，須一併納入「基本所得額」計算。基本所得額超過 750 萬元，可能需繳最低稅負（AMT）。')

  for (const item of group.items) {
    if (item.id === 'overseas-income-amt') continue
    lines.push('', `### ${item.title}`)
    renderStaticItemContent(item, lines)
  }
}

// ── Section: exemptions ──────────────────────────────────────────────────────

const AGE_BAND_LABEL: Record<ExemptionAgeBand, string> = {
  under_70: '未滿 70 歲',
  over_70: '滿 70 歲',
}

function renderExemptionsSection(group: CategoryGroup, data: DerivedData, lines: string[]) {
  lines.push('', '---', '', `## ${group.label}`)
  const inputs = data.cardInputMap['exemption-general'] ?? {}
  const selfBand = parseAgeBand(inputs['self_age_band'])
  const spouseBand = data.isMarriedFiling ? parseAgeBand(inputs['spouse_age_band']) : null
  const under = parseCount(inputs['exemption_under70_count'])
  const over = parseCount(inputs['exemption_over70_count'])

  lines.push('', '**填寫內容**')
  lines.push(`- 本人年齡：${selfBand ? AGE_BAND_LABEL[selfBand] : PENDING}${selfBand ? `（免稅額 ${fmt(getExemptionByAgeBand(selfBand))} 元）` : ''}`)
  if (data.isMarriedFiling) {
    lines.push(`- 配偶年齡：${spouseBand ? AGE_BAND_LABEL[spouseBand] : PENDING}${spouseBand ? `（免稅額 ${fmt(getExemptionByAgeBand(spouseBand))} 元）` : ''}`)
  }
  lines.push(`- 未滿 70 歲扶養親屬：${under} 人（每人 ${fmt(getNumber('exemption_general'))} 元）`)
  lines.push(`- 滿 70 歲扶養親屬：${over} 人（每人 ${fmt(getNumber('exemption_senior_70'))} 元）`)
  lines.push('', `**小計**：${fmtMoney(data.exemption?.amount ?? null)}`)

  for (const item of group.items) {
    lines.push('', `### ${item.title}`)
    renderStaticItemContent(item, lines)
  }
}

// ── Section: general_deductions ──────────────────────────────────────────────

const ITEMIZED_LABEL_MAP: Record<string, string> = {
  'donations-deduction': '捐贈',
  'insurance-deduction': '保險費',
  'medical-deduction': '醫藥及生育費',
  'mortgage-interest-deduction': '購屋借款利息',
}

function renderGeneralDeductionsSection(group: CategoryGroup, data: DerivedData, lines: string[]) {
  lines.push('', '---', '', `## ${group.label}`)
  const standardKey = data.isMarriedFiling ? 'standard_deduction_married' : 'standard_deduction_single'
  const standard = getNumber(standardKey)

  if (data.generalDeduction.status === 'standard_only') {
    lines.push('', `**選用方法**：標準扣除額`)
    lines.push(`**標準扣除額**：${fmt(standard)} 元`)
    lines.push(`**小計**：${fmt(data.generalDeduction.amount)} 元`)
  } else if (data.generalDeduction.status === 'pending_itemized') {
    lines.push('', `**選用方法**：${PENDING}（列舉項目尚未填寫完成）`)
    lines.push(`**標準扣除額**：${fmt(standard)} 元`)
    lines.push(`**列舉扣除額**：${PENDING}`)
  } else {
    const method = data.generalDeductionMethod === 'itemized' ? '列舉扣除額' : '標準扣除額'
    lines.push('', `**選用方法**：${method}（系統自動取標準與列舉較高者）`)
    lines.push(`**標準扣除額**：${fmt(standard)} 元`)
    const itemizedLines = group.items
      .filter((i) => ITEMIZED_ITEM_IDS.has(i.id))
      .map((i) => ({
        id: i.id,
        label: ITEMIZED_LABEL_MAP[i.id] ?? i.title,
        amount: getItemizedItemAmount(i.id, data.cardInputMap[i.id] ?? {}, data.itemizedContext),
      }))
    if (itemizedLines.length > 0) {
      const itemizedSum = itemizedLines.reduce((sum, l) => sum + (l.amount ?? 0), 0)
      lines.push(`**列舉扣除額**：${fmt(itemizedSum)} 元`)
      for (const l of itemizedLines) {
        lines.push(`  - ${l.label}：${fmtMoney(l.amount)}`)
      }
    }
    lines.push(`**小計**：${fmt(data.generalDeduction.amount)} 元`)
  }

  for (const item of group.items) {
    lines.push('', `### ${item.title}`)
    if (ITEMIZED_ITEM_IDS.has(item.id)) {
      const amount = getItemizedItemAmount(item.id, data.cardInputMap[item.id] ?? {}, data.itemizedContext)
      const userInputs = renderItemizedItemInputs(item.id, data.cardInputMap[item.id] ?? {})
      if (userInputs.length > 0) {
        lines.push('', '**填寫內容**')
        for (const l of userInputs) lines.push(`- ${l}`)
        lines.push(`- 解析後金額：${fmtMoney(amount)}`)
      }
    }
    renderStaticItemContent(item, lines)
  }
}

function renderItemizedItemInputs(itemId: string, inputs: Record<string, string>): string[] {
  const out: string[] = []
  const push = (label: string, raw: string | undefined) => {
    if (raw === undefined || raw.trim() === '') return
    out.push(`${label}：${fmt(parseNonNegativeAmount(raw))} 元`)
  }
  switch (itemId) {
    case 'donations-deduction':
      push('一般公益捐贈（有 20% 上限）', inputs['donation_amount_qualified'])
      push('政府機關等指定用途捐贈（無上限）', inputs['donation_amount_government'])
      break
    case 'insurance-deduction':
      push('人身保險費', inputs['insurance_personal_amount'])
      push('全民健保費', inputs['insurance_nhi_amount'])
      break
    case 'medical-deduction':
      push('醫藥及生育費', inputs['medical_amount'])
      break
    case 'mortgage-interest-deduction':
      push('購屋借款利息', inputs['mortgage_interest_amount'])
      break
  }
  return out
}

// ── Section: special_deductions ──────────────────────────────────────────────

function renderSpecialDeductionsSection(group: CategoryGroup, data: DerivedData, lines: string[]) {
  lines.push('', '---', '', `## ${group.label}`)
  if (data.specialDeductionFormulaItems.length > 0) {
    lines.push('', '**公式**：各項特別扣除額加總')
    for (const item of data.specialDeductionFormulaItems) {
      lines.push(`- ${item.label}：${fmtMoney(item.amount)}`)
    }
    lines.push(`**小計**：${fmtMoney(data.specialDeductionAmount)}`)
  }

  for (const item of group.items) {
    lines.push('', `### ${item.title}`)
    const meta = SPECIAL_DEDUCTION_META[item.id]
    if (meta) {
      const userInputs = renderSpecialItemInputs(item.id, data.cardInputMap[item.id] ?? {}, data)
      if (userInputs.length > 0) {
        lines.push('', '**填寫內容**')
        for (const l of userInputs) lines.push(`- ${l}`)
      }
    }
    renderStaticItemContent(item, lines)
  }
}

function renderSpecialItemInputs(itemId: string, inputs: Record<string, string>, data: DerivedData): string[] {
  const out: string[] = []
  switch (itemId) {
    case 'savings-investment-deduction': {
      const cap = getNumber('special_deduction_savings_investment')
      const deduction = Math.min(data.interestIncomeAmount, cap)
      const note = data.interestIncomeAmount > cap ? `（已達上限 ${fmt(cap)} 元）` : ''
      out.push(`利息收入 ${fmt(data.interestIncomeAmount)} 元 → 可申報 ${fmt(deduction)} 元${note}`)
      break
    }
    case 'disability-special-deduction': {
      const c = parseCount(inputs['disability_count'])
      out.push(`身心障礙人數：${c} 人 × ${fmt(getNumber('special_deduction_disability'))} 元 = ${fmt(c * getNumber('special_deduction_disability'))} 元`)
      break
    }
    case 'childcare-deduction': {
      const c = parseCount(inputs['childcare_count'])
      if (c === 0) {
        out.push(`幼兒人數：${PENDING}`)
      } else {
        const first = getNumber('special_deduction_childcare_first')
        const additional = getNumber('special_deduction_childcare_additional')
        const total = first + Math.max(c - 1, 0) * additional
        out.push(`幼兒人數：${c} 人（第 1 名 ${fmt(first)} 元，第 2 名起每人 ${fmt(additional)} 元）= ${fmt(total)} 元`)
      }
      break
    }
    case 'education-tuition-deduction': {
      const c = parseCount(inputs['education_count'])
      out.push(`大專子女人數：${c} 人 × ${fmt(getNumber('special_deduction_education_tuition'))} 元 = ${fmt(c * getNumber('special_deduction_education_tuition'))} 元`)
      break
    }
    case 'long-term-care-deduction': {
      const c = parseCount(inputs['long_term_care_count'])
      out.push(`長期照顧人數：${c} 人 × ${fmt(getNumber('special_deduction_long_term_care'))} 元 = ${fmt(c * getNumber('special_deduction_long_term_care'))} 元`)
      break
    }
    case 'rent-deduction': {
      const raw = inputs['rent_amount']
      const amount = parseNonNegativeAmount(raw)
      const cap = getNumber('special_deduction_rent')
      const applied = Math.min(amount, cap)
      const note = amount > cap ? `（已達上限 ${fmt(cap)} 元）` : ''
      out.push(`房屋租金支出：${raw?.trim() ? `${fmt(amount)} 元 → 可申報 ${fmt(applied)} 元${note}` : PENDING}`)
      break
    }
  }
  return out
}

// ── Scenario formula rendering ───────────────────────────────────────────────

function partsToString(parts: ScenarioFormulaPart[]): string {
  const chunks: string[] = []
  for (const part of parts) {
    if (part.type === 'operand') {
      const v = part.operand.displayValue ?? `${fmt(part.operand.amount)} 元`
      chunks.push(`${part.operand.label}(${v})`)
    } else if (part.type === 'operator') {
      chunks.push(part.operator)
    } else if (part.type === 'text') {
      chunks.push(part.text)
    } else if (part.type === 'floorZero') {
      if (part.isApplied) chunks.push('〔負數不計，採用 0 元〕')
    } else if (part.type === 'capAt') {
      if (part.isHit) chunks.push(`〔已達上限 ${fmt(part.amount)} 元〕`)
    }
  }
  return chunks.join(' ')
}

function renderTakeMin(candidates: TakeMinCandidate[], winner: number, lines: string[]) {
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i]
    const marker = i === winner ? '★ ' : ''
    if (c.subParts && c.subParts.length > 0) {
      const expr = c.subParts.map((p) => {
        if (p.type === 'operand') {
          const v = p.operand.displayValue ?? `${fmt(p.operand.amount)} 元`
          return `${p.operand.label}(${v})`
        }
        return p.operator
      }).join(' ')
      lines.push(`  - ${marker}${c.label}：${expr} = ${fmt(c.amount)} 元`)
    } else {
      lines.push(`  - ${marker}${c.label}：${fmt(c.amount)} 元`)
    }
  }
}

function renderEquation(equation: ScenarioFormulaEquation, sectionTitle: string, lines: string[]) {
  const hasTakeMin = equation.parts.some((p) => p.type === 'takeMin')
  const showLabel = !(sectionTitle === '應繳納稅額' && equation.label === '應繳納稅額')
  const label = hasTakeMin ? `${equation.label}（取較小值）` : equation.label
  const resultStr = `${equation.result.label} ${equation.result.displayValue ?? `${fmt(equation.result.amount)} 元`}`

  if (hasTakeMin) {
    if (showLabel) lines.push(`- **${label}**`)
    for (const part of equation.parts) {
      if (part.type === 'takeMin') {
        renderTakeMin(part.candidates, part.winner, lines)
      }
    }
    lines.push(`  → ${resultStr}`)
  } else {
    const expr = partsToString(equation.parts)
    if (showLabel) {
      lines.push(`- **${label}**：${expr} = ${resultStr}`)
    } else {
      lines.push(`- ${expr} = ${resultStr}`)
    }
  }
}

function renderScenarioFormulaSections(sections: ScenarioFormulaSection[], lines: string[]) {
  for (const section of sections) {
    lines.push('', `**${section.title}**`)
    for (const eq of section.equations) {
      renderEquation(eq, section.title, lines)
    }
  }
}

function renderScenarios(result: TaxScenarioResult, lines: string[]) {
  lines.push('', '---', '', '## 所有申報組合')
  const hasMultiple = result.scenarios.length > 1
  lines.push('', `共 ${result.scenarios.length} 種組合，依試算稅額由低到高排列${hasMultiple ? '，第一個為推薦組合' : ''}。`)

  const sorted = [...result.scenarios].sort((a, b) => a.finalTax - b.finalTax)
  const bestId = result.bestScenario.id

  sorted.forEach((scenario, idx) => {
    const isBest = scenario.id === bestId
    const star = isBest && hasMultiple ? '★ 推薦 — ' : ''
    lines.push('', `### ${idx + 1}. ${star}${displayScenarioTitle(scenario.title)}`)
    const couple = COUPLE_LABEL_MAP[scenario.coupleMode] ?? scenario.coupleMode
    const coupleType = COUPLE_TYPE_MAP[scenario.coupleMode] ?? '—'
    const dividend = DIVIDEND_LABEL_MAP[scenario.dividendMode]
    lines.push(`- 申報組合：${couple}`)
    if (result.scenarios.some((s) => s.coupleMode !== 'single')) {
      lines.push(`- 配偶計稅方式：${coupleType}`)
    }
    if (result.hasDividend) {
      lines.push(`- 股利申報方式：${dividend ?? '—'}`)
    }
    lines.push(`- **應繳納稅額：${fmt(scenario.finalTax)} 元**`)

    lines.push('', '**計算過程**')
    renderScenarioFormulaSections(scenario.formulaSections, lines)
  })
}

// ── Top-level summary blocks ─────────────────────────────────────────────────

function renderSummary(data: DerivedData, lines: string[]) {
  lines.push('', '---', '', '## 填寫摘要')
  lines.push(`- 綜合所得總額：${fmtMoney(data.grossIncomeMergedAmount)}`)
  if (data.hasOverseasIncomeSection) {
    lines.push(`- 海外所得：${fmt(data.overseasIncomeAmount)} 元`)
  }
  lines.push(`- 免稅額：${fmtMoney(data.exemption?.amount ?? null)}`)
  const generalLabel = data.generalDeductionMethod === 'itemized'
    ? '一般扣除額（列舉）'
    : data.generalDeductionMethod === 'standard'
      ? '一般扣除額（標準）'
      : '一般扣除額'
  lines.push(`- ${generalLabel}：${fmtMoney(data.generalDeductionAmount)}`)
  if (data.hasSpecialDeductions) {
    lines.push(`- 特別扣除額：${fmtMoney(data.specialDeductionAmount)}`)
  }
}

function renderResultBlock(data: DerivedData, lines: string[]) {
  lines.push('', '## 試算結果')
  const result = data.taxScenarioResult
  if (!result) {
    lines.push('', '> 尚未填入足夠資料以試算稅額。請完成各 section 後重新匯出。')
    return
  }
  const best = result.bestScenario
  lines.push(`- **推薦組合**：${displayScenarioTitle(best.title)}`)
  lines.push(`- **應繳納稅額**：${fmt(best.finalTax)} 元`)
}

// ── Section dispatcher ───────────────────────────────────────────────────────

function renderSection(group: CategoryGroup, data: DerivedData, lines: string[]) {
  switch (group.category) {
    case 'gross_income':
      renderGrossIncomeSection(group, data, lines)
      break
    case 'overseas_income':
      renderOverseasIncomeSection(group, data, lines)
      break
    case 'exemptions':
      renderExemptionsSection(group, data, lines)
      break
    case 'general_deductions':
      renderGeneralDeductionsSection(group, data, lines)
      break
    case 'special_deductions':
      renderSpecialDeductionsSection(group, data, lines)
      break
    default: {
      const _exhaustive: never = group.category as never
      void _exhaustive
      lines.push('', '---', '', `## ${group.label}`)
      for (const item of group.items) {
        lines.push('', `### ${item.title}`)
        renderStaticItemContent(item, lines)
      }
    }
  }
}

const FOOTER = `---

> **本機處理聲明：** 本清單在您的瀏覽器中產生，未上傳至伺服器。
> 下載或複製後，檔案可能包含個人稅務情境，請自行保管。`

const SECTION_ORDER: CategoryId[] = [
  'gross_income',
  'overseas_income',
  'exemptions',
  'general_deductions',
  'special_deductions',
]

export function formatChecklistMarkdown(input: ExportInput): string {
  const data = deriveExportData(input)
  const totalItems = input.groups.reduce((sum, g) => sum + g.items.length, 0)

  const lines: string[] = [
    checklistExportSiteHeader(),
    '',
    checklistExportMarkdownHeader(),
    '',
    `根據您選擇的 ${input.totalSelected} 項情況，找到 ${totalItems} 個值得確認的項目。`,
    `**本文件產生時間**：${input.exportTime}`,
  ]

  renderSummary(data, lines)
  renderResultBlock(data, lines)

  const orderedGroups = [...input.groups].sort(
    (a, b) => SECTION_ORDER.indexOf(a.category) - SECTION_ORDER.indexOf(b.category),
  )
  for (const group of orderedGroups) {
    renderSection(group, data, lines)
  }

  if (data.taxScenarioResult) {
    renderScenarios(data.taxScenarioResult, lines)
  }

  lines.push('', checklistExportSiteFooter())
  lines.push('', FOOTER)
  return lines.join('\n')
}

// Re-export the type alias names the previous version used (no other consumers).
export type { ExportInput as ExportOptions }
