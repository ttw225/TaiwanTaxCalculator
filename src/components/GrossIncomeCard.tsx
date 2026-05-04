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
  incomeRaw: string       // the string value being edited
  isFixed: boolean        // 本人 or 配偶 — cannot be deleted or relabeled
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

  // Persons stored in persons_json: everyone except self
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
    <div className="border border-gray-200 rounded-lg p-4 bg-white print-card" data-testid={`checklist-card-${item.id}`}>
      {/* Header */}
      <div className="flex items-start gap-2 mb-2">
        <h3 className="font-medium text-gray-900 flex-1 text-sm">{item.title}</h3>
        {removable && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`移除項目：${item.title}`}
            data-testid={`remove-item-${item.id}`}
            className="no-print inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700"
          >
            ×
          </button>
        )}
      </div>

      <p className="text-sm text-gray-700 mb-3">{item.why_it_matters}</p>

      {sourceSituationLabels.length > 0 && (
        <p
          className="mb-3 text-xs text-indigo-700"
          data-testid={`card-source-situations-${item.id}`}
          title={`情境：${sourceSituationLabels.join('、')}`}
        >
          情境：{sourceSituationLabels.slice(0, 2).join('、')}
          {sourceSituationLabels.length > 2 ? ` +${sourceSituationLabels.length - 2}` : ''}
        </p>
      )}

      {/* Person rows */}
      <div className="rounded border border-blue-100 bg-blue-50/40 p-3 space-y-0">
        {/* Self row */}
        <PersonRow
          person={selfPerson}
          incomeRaw={selfRaw}
          isFixed
          onIncomeChange={handleSelfIncomeChange}
        />

        {/* Other persons (spouse + extras) from persons_json */}
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

      {/* Add person button */}
      <button
        type="button"
        onClick={handleAddPerson}
        className="no-print mt-2 flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors"
        data-testid="gross-income-add-person"
      >
        <span aria-hidden="true">＋</span>
        <span>新增受扶養親屬</span>
      </button>

      {/* Privacy notice */}
      <p className="mt-2 text-xs text-gray-400">
        資料僅在您的瀏覽器處理，不會傳送至任何伺服器
      </p>

      {/* Result */}
      <div className="mt-3 border-t border-gray-100 pt-3">
        <div className="text-xs text-gray-500 space-y-0.5">
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
      </div>

      {/* Source refs */}
      <div className="mt-3">
        <details className="group">
          <summary className="cursor-pointer select-none text-xs font-medium text-gray-500 hover:text-gray-700">
            來源與官方參考
          </summary>
          <ul className="mt-2 space-y-1">
            {item.source_refs.map((ref) => (
              <li key={ref.source_id} className="text-xs text-gray-500">
                {ref.url ? (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 underline underline-offset-2 hover:text-gray-800"
                  >
                    {ref.label}
                  </a>
                ) : (
                  <span className="text-gray-600">{ref.label}</span>
                )}
                {ref.authority && <span className="text-gray-400"> · {ref.authority}</span>}
              </li>
            ))}
          </ul>
        </details>
      </div>

      {/* Notes */}
      <div className="mt-3">
        <details className="group">
          <summary className="cursor-pointer select-none text-xs font-medium text-gray-500 hover:text-gray-700">
            注意事項
          </summary>
          <div className="mt-2 space-y-1.5 text-xs text-gray-500">
            <p>納稅義務人、配偶或申報受扶養親屬有「薪資收入」者，應分別就「薪資所得特別扣除額」或「必要費用」2擇1減除，減除後的餘額為薪資所得。</p>
            <p>本網站簡化此流程，統一採用「薪資所得特別扣除額」計算，還請海涵！</p>
          </div>
        </details>
      </div>
    </div>
  )
}
