import type { ChecklistItem } from '../types/content'
import {
  getSalaryDeductionCap,
  calcPersonDeduction,
  calcPersonNetIncome,
  calcTotalGrossIncome,
  parseGrossIncomePersons,
  serializePersonsJson,
  type GrossIncomePerson,
} from '../lib/grossIncome'
import { ChecklistCardShell } from './checklist/ChecklistCardShell'

interface Props {
  item: ChecklistItem
  inputValues: Record<string, string>
  isMarriedFiling: boolean
  sourceSituationLabels?: string[]
  removable?: boolean
  onInputChange: (fieldId: string, value: string) => void
  onRemove?: () => void
}

function formatTwd(n: number) {
  return n.toLocaleString('zh-TW')
}

function parseRawIncome(raw: string): number {
  if (!raw || raw.trim() === '') return 0
  const n = Number(raw.replace(/,/g, ''))
  return isNaN(n) || n < 0 ? 0 : n
}

interface PersonRowProps {
  person: GrossIncomePerson
  incomeRaw: string
  isFixed: boolean
  onIncomeChange: (value: string) => void
  onLabelChange?: (value: string) => void
  onRemove?: () => void
}

function PersonRow({ person, incomeRaw, isFixed, onIncomeChange, onLabelChange, onRemove }: PersonRowProps) {
  const cap = getSalaryDeductionCap()
  const income = parseRawIncome(incomeRaw)
  const deduction = calcPersonDeduction(income)
  const net = calcPersonNetIncome(income)
  const hasIncome = income > 0

  return (
    <div className="border-b border-blue-100 last:border-0 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2 mb-1.5">
        {isFixed ? (
          <span className="text-xs font-semibold text-gray-700 min-w-[3rem]">{person.label}</span>
        ) : (
          <input
            type="text"
            value={person.label}
            onChange={(e) => onLabelChange?.(e.target.value)}
            placeholder="稱謂（如：父親）"
            data-testid={`gross-income-label-${person.id}`}
            className="text-xs font-semibold text-gray-700 border border-gray-200 rounded px-1.5 py-0.5 w-28 focus:border-blue-400 focus:outline-none"
          />
        )}
        {!isFixed && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`移除 ${person.label || '此人員'}`}
            className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 text-xs text-gray-400 hover:border-red-300 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            ×
          </button>
        )}
      </div>
      <label className="mt-1 block text-xs text-gray-500">
        薪資收入
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min="0"
          value={incomeRaw}
          onChange={(e) => onIncomeChange(e.target.value)}
          placeholder="輸入金額"
          data-testid={`gross-income-input-${person.id}`}
          className="w-40 rounded border border-gray-300 px-2 py-1 text-xs text-gray-800 focus:border-blue-400 focus:outline-none"
        />
        <span className="text-xs text-gray-500">元</span>
      </div>
      {hasIncome && (
        <p className="mt-1.5 text-xs text-gray-500">
          {'綜合所得 ＝ 薪資收入 − 薪資所得特別扣除額 ＝ '}
          <span className="font-medium text-gray-700">{formatTwd(income)} 元</span>
          {' − '}
          <span className="font-medium text-indigo-700">{formatTwd(deduction)} 元</span>
          {income <= cap && <span className="text-gray-400">（全額扣除）</span>}
          {' ＝ '}
          <span className={`font-medium ${net > 0 ? 'text-gray-800' : 'text-green-700'}`}>
            {formatTwd(net)} 元
          </span>
        </p>
      )}
    </div>
  )
}

export function GrossIncomeCard({
  item,
  inputValues,
  isMarriedFiling,
  sourceSituationLabels = [],
  removable = false,
  onInputChange,
  onRemove,
}: Props) {
  const persons = parseGrossIncomePersons(inputValues, isMarriedFiling)
  const total = calcTotalGrossIncome(persons)
  const hasAnyIncome = persons.some((p) => p.income > 0)

  const personsInJson = persons.filter((p) => p.id !== 'self')

  function updatePersonsJson(next: GrossIncomePerson[]) {
    onInputChange('persons_json', serializePersonsJson(next))
  }

  function handleSelfIncomeChange(value: string) {
    onInputChange('self_income', value)
  }

  function handlePersonIncomeChange(targetId: string, value: string) {
    const next = personsInJson.map((p) =>
      p.id === targetId ? { ...p, income: Number(value.replace(/,/g, '')) || 0 } : p,
    )
    updatePersonsJson(next)
  }

  function handlePersonLabelChange(targetId: string, value: string) {
    const next = personsInJson.map((p) =>
      p.id === targetId ? { ...p, label: value } : p,
    )
    updatePersonsJson(next)
  }

  function handleRemovePerson(targetId: string) {
    const next = personsInJson.filter((p) => p.id !== targetId)
    updatePersonsJson(next)
  }

  function handleAddPerson() {
    const extraNums = personsInJson
      .filter((p) => p.id.startsWith('extra-'))
      .map((p) => parseInt(p.id.slice('extra-'.length), 10))
      .filter((n) => Number.isFinite(n))
    const nextId = extraNums.length > 0 ? Math.max(...extraNums) + 1 : 0
    const next = [...personsInJson, { id: `extra-${nextId}`, label: '', income: 0 }]
    updatePersonsJson(next)
  }

  const selfPerson = persons.find((p) => p.id === 'self')!
  const selfRaw = inputValues['self_income'] ?? ''

  return (
    <ChecklistCardShell
      item={item}
      sourceSituationLabels={sourceSituationLabels}
      removable={removable}
      onRemove={onRemove}
    >
      <div className="rounded border border-blue-100 bg-blue-50/40 p-3 space-y-0">
        <PersonRow
          person={selfPerson}
          incomeRaw={selfRaw}
          isFixed
          onIncomeChange={handleSelfIncomeChange}
        />

        {personsInJson.map((person) => {
          const isFixed = person.id === 'spouse'
          const incomeRaw = String(person.income === 0 && !inputValues['persons_json'] ? '' : person.income || '')
          return (
            <PersonRow
              key={person.id}
              person={person}
              incomeRaw={incomeRaw === '0' ? '' : incomeRaw}
              isFixed={isFixed}
              onIncomeChange={(val) => handlePersonIncomeChange(person.id, val)}
              onLabelChange={isFixed ? undefined : (val) => handlePersonLabelChange(person.id, val)}
              onRemove={isFixed ? undefined : () => handleRemovePerson(person.id)}
            />
          )
        })}
      </div>

      <button
        type="button"
        onClick={handleAddPerson}
        className="no-print mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
        data-testid="gross-income-add-person"
      >
        <span aria-hidden="true">＋</span>
        <span>新增受扶養親屬</span>
      </button>

      <p className="mt-2 text-xs text-gray-400">
        資料僅在您的瀏覽器處理，不會傳送至任何伺服器
      </p>

      <div className="mt-3 text-xs text-gray-500 space-y-0.5">
        <p className="font-medium text-gray-700">綜合所得總額</p>
        {hasAnyIncome ? (
          <>
            {persons
              .filter((p) => p.income > 0)
              .map((p, i) => (
                <div key={p.id} className="flex justify-between gap-4">
                  <span>{i === 0 ? <span className="invisible">＋</span> : '＋'} {p.label}</span>
                  <span className="tabular-nums">{formatTwd(calcPersonNetIncome(p.income))} 元</span>
                </div>
              ))}
            <div className="flex justify-between gap-4 font-semibold text-green-700 border-t border-gray-100 pt-0.5 mt-0.5" data-testid="gross-income-total">
              <span>＝</span>
              <span className="tabular-nums">{formatTwd(total)} 元</span>
            </div>
          </>
        ) : (
          <p className="font-semibold text-gray-300" data-testid="gross-income-total">—</p>
        )}
      </div>
    </ChecklistCardShell>
  )
}
