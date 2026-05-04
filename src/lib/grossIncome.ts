import { getNumber } from './numbers'

export interface GrossIncomePerson {
  id: string    // 'self' | 'spouse' | 'extra-0' | 'extra-1' | ...
  label: string
  income: number
}

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

function parseIncome(raw: string | undefined): number {
  if (!raw || raw.trim() === '') return 0
  const n = Number(raw.replace(/,/g, ''))
  return Number.isFinite(n) && n > 0 ? n : 0
}

// Deserialize the persons_json field (excludes self)
function parsePersonsJson(raw: string | undefined): GrossIncomePerson[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((p): p is GrossIncomePerson =>
        p && typeof p.id === 'string' && typeof p.label === 'string' && typeof p.income === 'number',
      )
      .map((p) => ({ ...p, income: Number.isFinite(p.income) && p.income > 0 ? p.income : 0 }))
  } catch {
    return []
  }
}

// Serialize non-self persons back to persons_json value
export function serializePersonsJson(persons: GrossIncomePerson[]): string {
  return JSON.stringify(persons)
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
