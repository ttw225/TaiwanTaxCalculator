import { getNumber } from './numbers'
import type { CardInputMap } from '../types/content'

export interface GrossIncomePerson {
  id: string    // 'self' | 'spouse' | 'extra-0' | 'extra-1' | ...
  label: string
  income: number
}

export interface IncomeParticipant {
  id: string
  label: string
}

export interface IncomeInputPerson extends GrossIncomePerson {
  hasInput: boolean
}

export type IncomeCardId =
  | 'gross-income'
  | 'dividend-income'
  | 'interest-income'
  | 'other-income'

export type IncomeKind = 'salary' | 'dividend' | 'interest' | 'other'

export interface IncomeCardConfig {
  id: IncomeCardId
  kind: IncomeKind
  inputLabel: string
  formulaLabel: string
  placeholder: string
  requiresExplicitInput: boolean
}

export const INCOME_PARTICIPANTS_ITEM_ID = 'income-participants'

export const INCOME_CARD_CONFIGS: Record<IncomeCardId, IncomeCardConfig> = {
  'gross-income': {
    id: 'gross-income',
    kind: 'salary',
    inputLabel: '薪資收入',
    formulaLabel: '薪資淨額',
    placeholder: '輸入金額',
    requiresExplicitInput: true,
  },
  'dividend-income': {
    id: 'dividend-income',
    kind: 'dividend',
    inputLabel: '股利收入',
    formulaLabel: '股利收入',
    placeholder: '預設 0',
    requiresExplicitInput: false,
  },
  'interest-income': {
    id: 'interest-income',
    kind: 'interest',
    inputLabel: '利息收入',
    formulaLabel: '利息收入',
    placeholder: '預設 0',
    requiresExplicitInput: false,
  },
  'other-income': {
    id: 'other-income',
    kind: 'other',
    inputLabel: '其他收入',
    formulaLabel: '其他收入',
    placeholder: '預設 0',
    requiresExplicitInput: false,
  },
}

export const INCOME_CARD_IDS = Object.keys(INCOME_CARD_CONFIGS) as IncomeCardId[]

const SALARY_DEDUCTION_CAP_KEY = 'special_deduction_salary'

export function getSalaryDeductionCap(): number {
  return getNumber(SALARY_DEDUCTION_CAP_KEY)
}

export function calcPersonDeduction(income: number): number {
  return Math.min(income, getSalaryDeductionCap())
}

export function calcPersonNetIncome(income: number): number {
  return Math.max(0, income - calcPersonDeduction(income))
}

/** Next default label when adding an extra dependent (0 → 親屬1, 1 → 親屬2, …). */
export function defaultExtraDependentLabel(extraCountBeforeAdd: number): string {
  return `親屬${extraCountBeforeAdd + 1}`
}

export function parseIncome(raw: string | undefined): number {
  if (!raw || raw.trim() === '') return 0
  const n = Number(raw.replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

// Deserialize an income persons_json field (excludes self).
function parsePersonsJson(raw: string | undefined): GrossIncomePerson[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((p): p is Record<string, unknown> =>
        isObject(p) && typeof p.id === 'string',
      )
      .map((p) => ({
        id: String(p.id),
        label: typeof p.label === 'string' ? p.label : '',
        income: typeof p.income === 'number' && Number.isFinite(p.income) && p.income > 0
          ? p.income
          : 0,
      }))
  } catch {
    return []
  }
}

function parseParticipantsJson(raw: string | undefined): IncomeParticipant[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((p): p is IncomeParticipant =>
        isObject(p) && typeof p.id === 'string' && typeof p.label === 'string',
      )
      .filter((p) => p.id !== 'self')
      .map((p) => ({ id: p.id, label: p.label }))
  } catch {
    return []
  }
}

// Serialize non-self persons back to persons_json value
export function serializePersonsJson(persons: GrossIncomePerson[]): string {
  return JSON.stringify(persons)
}

export function serializeIncomeParticipants(participants: IncomeParticipant[]): string {
  return JSON.stringify(participants.filter((p) => p.id !== 'self'))
}

export function serializeIncomeAmounts(persons: GrossIncomePerson[]): string {
  return JSON.stringify(
    persons
      .filter((p) => p.id !== 'self')
      .map((p) => ({ id: p.id, income: Number.isFinite(p.income) && p.income > 0 ? p.income : 0 })),
  )
}

function normalizeParticipants(
  participants: IncomeParticipant[],
  isMarriedFiling: boolean,
): IncomeParticipant[] {
  const byId = new Map<string, IncomeParticipant>()
  for (const person of participants) {
    if (!person.id || person.id === 'self') continue
    byId.set(person.id, {
      id: person.id,
      label: person.id === 'spouse' ? '配偶' : person.label,
    })
  }

  if (isMarriedFiling) {
    byId.set('spouse', { id: 'spouse', label: '配偶' })
  } else {
    byId.delete('spouse')
  }

  const spouse = byId.get('spouse')
  const extras = Array.from(byId.values())
    .filter((p) => p.id !== 'spouse')
    .sort((a, b) => {
      const aNum = a.id.startsWith('extra-') ? Number(a.id.slice('extra-'.length)) : NaN
      const bNum = b.id.startsWith('extra-') ? Number(b.id.slice('extra-'.length)) : NaN
      if (Number.isFinite(aNum) && Number.isFinite(bNum)) return aNum - bNum
      return a.id.localeCompare(b.id)
    })

  return spouse ? [spouse, ...extras] : extras
}

function participantsFromIncomeInputs(cardInputMap: CardInputMap): IncomeParticipant[] {
  for (const itemId of INCOME_CARD_IDS) {
    const persons = parsePersonsJson(cardInputMap[itemId]?.['persons_json'])
    if (persons.length > 0) {
      return persons.map((p) => ({ id: p.id, label: p.label || p.id }))
    }
  }
  return []
}

export function parseIncomeParticipantsFromMap(
  cardInputMap: CardInputMap,
  isMarriedFiling: boolean,
): IncomeParticipant[] {
  const shared = parseParticipantsJson(
    cardInputMap[INCOME_PARTICIPANTS_ITEM_ID]?.['persons_json'],
  )
  const legacy = shared.length > 0 ? shared : participantsFromIncomeInputs(cardInputMap)
  return [
    { id: 'self', label: '本人' },
    ...normalizeParticipants(legacy, isMarriedFiling),
  ]
}

export function parseIncomeCardPersons(
  inputValues: Record<string, string>,
  participants: IncomeParticipant[],
): IncomeInputPerson[] {
  const personsFromJson = parsePersonsJson(inputValues['persons_json'])
  const amountById = new Map(personsFromJson.map((p) => [p.id, p.income]))
  const hasInputById = new Set(personsFromJson.map((p) => p.id))
  const selfRaw = inputValues['self_income']
  const hasSelfInput = typeof selfRaw === 'string' && selfRaw.trim() !== ''

  return participants.map((p) => ({
    ...p,
    income: p.id === 'self' ? parseIncome(selfRaw) : (amountById.get(p.id) ?? 0),
    hasInput: p.id === 'self' ? hasSelfInput : hasInputById.has(p.id),
  }))
}

// Build the full persons list from CardInputMap fields
export function parseGrossIncomePersons(
  inputValues: Record<string, string>,
  isMarriedFiling: boolean,
): GrossIncomePerson[] {
  const personsFromJson = parsePersonsJson(inputValues['persons_json'])

  const self: GrossIncomePerson = {
    id: 'self',
    label: '本人',
    income: parseIncome(inputValues['self_income']),
  }

  // Spouse comes from persons_json if married; ensure it's present
  const hasSpouseInJson = personsFromJson.some((p) => p.id === 'spouse')
  let others = personsFromJson

  if (isMarriedFiling && !hasSpouseInJson) {
    // Auto-insert spouse at the front if not yet in json
    others = [{ id: 'spouse', label: '配偶', income: 0 }, ...others]
  } else if (!isMarriedFiling) {
    // Filter out spouse when not filing jointly
    others = others.filter((p) => p.id !== 'spouse')
  }

  return [self, ...others]
}

export function calcTotalGrossIncome(persons: GrossIncomePerson[]): number {
  return persons.reduce((sum, p) => sum + calcPersonNetIncome(p.income), 0)
}

export function calcRawIncomeTotal(persons: GrossIncomePerson[]): number {
  return persons.reduce((sum, p) => sum + p.income, 0)
}

export function incomeCardIsComplete(config: IncomeCardConfig, persons: IncomeInputPerson[]): boolean {
  if (!config.requiresExplicitInput) return true
  return persons.every((p) => p.hasInput)
}
