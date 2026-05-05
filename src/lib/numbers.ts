import rawNumbers from '../data/numbers_2026.json'

interface NumberItem {
  key: string
  value: number
  unit: string
}

interface Bracket {
  up_to: number | null
  rate: number
  quick_deduction: number
}

interface NumbersData {
  valid_year: number
  filing_year: number
  filing_window: string
  items: NumberItem[]
  brackets: Bracket[]
}

const data = rawNumbers as NumbersData

export function getNumber(key: string): number {
  const item = data.items.find((i) => i.key === key)
  if (!item) throw new Error(`numbers_2026: unknown key "${key}"`)
  return item.value
}

export function getBrackets(): Bracket[] {
  return data.brackets
}

export function calcTax(netIncome: number): number {
  if (netIncome <= 0) return 0
  const bracket = data.brackets.find((b) => b.up_to === null || netIncome <= b.up_to)!
  return Math.max(0, Math.round(netIncome * bracket.rate - bracket.quick_deduction))
}
