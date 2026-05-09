import type { ChecklistItem } from '../types/content'
import {
  calcPersonDeduction,
  calcPersonNetIncome,
  calcRawIncomeTotal,
  defaultExtraDependentLabel,
  getSalaryDeductionCap,
  incomeCardIsComplete,
  parseIncome,
  parseIncomeCardPersons,
  serializeIncomeAmounts,
  type IncomeCardConfig,
  type IncomeInputPerson,
  type IncomeParticipant,
} from '../lib/grossIncome'
import { ChecklistCardShell } from './checklist/ChecklistCardShell'

interface Props {
  item: ChecklistItem
  config: IncomeCardConfig
  inputValues: Record<string, string>
  participants: IncomeParticipant[]
  sourceSituationLabels?: string[]
  removable?: boolean
  onInputChange: (fieldId: string, value: string) => void
  onParticipantsChange: (participants: IncomeParticipant[], removedId?: string) => void
  onRemove?: () => void
}

function formatTwd(n: number) {
  return n.toLocaleString('zh-TW')
}

function getInputRaw(
  person: IncomeInputPerson,
  config: IncomeCardConfig,
  inputValues: Record<string, string>,
): string {
  if (person.id === 'self') {
    const raw = inputValues['self_income']
    if (raw !== undefined) return raw
    return config.requiresExplicitInput ? '' : '0'
  }
  if (!person.hasInput && !config.requiresExplicitInput) return '0'
  if (!person.hasInput) return ''
  return String(person.income)
}

interface PersonRowProps {
  person: IncomeInputPerson
  config: IncomeCardConfig
  incomeRaw: string
  isFixed: boolean
  labelPlaceholder?: string
  onIncomeChange: (value: string) => void
  onLabelChange?: (value: string) => void
  onRemove?: () => void
}

function PersonRow({
  person,
  config,
  incomeRaw,
  isFixed,
  labelPlaceholder,
  onIncomeChange,
  onLabelChange,
  onRemove,
}: PersonRowProps) {
  const cap = getSalaryDeductionCap()
  const income = parseIncome(incomeRaw)
  const deduction = calcPersonDeduction(income)
  const net = calcPersonNetIncome(income)
  const hasSalaryFormula = config.kind === 'salary' && person.hasInput && income > 0

  return (
    <div className="border-b border-gray-300 py-3 first:pt-0 last:border-0 last:pb-0">
      <div className="mb-1.5 flex items-center gap-2">
        {isFixed ? (
          <span className="min-w-[3rem] text-base font-semibold text-gray-700">{person.label}</span>
        ) : (
          <input
            type="text"
            value={person.label}
            onChange={(e) => onLabelChange?.(e.target.value)}
            placeholder={labelPlaceholder ?? '稱謂'}
            data-testid={`income-label-${config.id}-${person.id}`}
            className="w-28 rounded border border-gray-200 px-1.5 py-0.5 text-base font-semibold text-gray-700 focus:border-blue-400 focus:outline-none"
          />
        )}
        {!isFixed && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`移除 ${person.label || '此人員'}`}
            className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-200 text-xs text-gray-400 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-500"
          >
            ×
          </button>
        )}
      </div>
      <label className="mt-1 block text-base text-gray-500">
        {config.inputLabel}
      </label>
      <div className="flex items-center gap-1.5">
        <input
          type="number"
          min="0"
          value={incomeRaw}
          onChange={(e) => onIncomeChange(e.target.value)}
          placeholder={config.placeholder}
          data-testid={`income-input-${config.id}-${person.id}`}
          className="no-spin w-40 rounded border border-gray-300 px-2 py-1 text-base text-gray-800 focus:border-blue-400 focus:outline-none"
        />
        <span className="text-base text-gray-500">元</span>
      </div>
      {hasSalaryFormula && (
        <p className="mt-1.5 text-base text-gray-500">
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

export function IncomeCard({
  item,
  config,
  inputValues,
  participants,
  sourceSituationLabels = [],
  removable = false,
  onInputChange,
  onParticipantsChange,
  onRemove,
}: Props) {
  const persons = parseIncomeCardPersons(inputValues, participants)
  const amountPersons = persons.map(({ id, label, income }) => ({ id, label, income }))
  const total = config.kind === 'salary'
    ? persons.reduce((sum, p) => sum + calcPersonNetIncome(p.income), 0)
    : calcRawIncomeTotal(amountPersons)
  const isComplete = incomeCardIsComplete(config, persons)

  const participantsInJson = participants.filter((p) => p.id !== 'self')
  const extraPersonsOrdered = participantsInJson.filter((p) => p.id.startsWith('extra-'))

  function updateAmount(targetId: string, value: string) {
    if (targetId === 'self') {
      onInputChange('self_income', value)
      return
    }
    const next = persons
      .filter((p) => p.id !== 'self')
      .filter((p) =>
        config.requiresExplicitInput
          ? (p.id === targetId ? value.trim() !== '' : p.hasInput)
          : true,
      )
      .map((p) => (
        p.id === targetId
          ? { id: p.id, label: p.label, income: parseIncome(value) }
          : { id: p.id, label: p.label, income: p.income }
      ))
    onInputChange('persons_json', serializeIncomeAmounts(next))
  }

  function handlePersonLabelChange(targetId: string, value: string) {
    const next = participantsInJson.map((p) =>
      p.id === targetId ? { ...p, label: value } : p,
    )
    onParticipantsChange(next)
  }

  function handleRemovePerson(targetId: string) {
    const next = participantsInJson.filter((p) => p.id !== targetId)
    onParticipantsChange(next, targetId)
  }

  function handleAddPerson() {
    const extraNums = participantsInJson
      .filter((p) => p.id.startsWith('extra-'))
      .map((p) => parseInt(p.id.slice('extra-'.length), 10))
      .filter((n) => Number.isFinite(n))
    const nextId = extraNums.length > 0 ? Math.max(...extraNums) + 1 : 0
    const extraCount = participantsInJson.filter((p) => p.id.startsWith('extra-')).length
    const next = [
      ...participantsInJson,
      { id: `extra-${nextId}`, label: defaultExtraDependentLabel(extraCount) },
    ]
    onParticipantsChange(next)
  }

  return (
    <ChecklistCardShell
      item={item}
      sourceSituationLabels={sourceSituationLabels}
      removable={removable}
      onRemove={onRemove}
    >
      {config.kind === 'dividend' && (
        <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800">
          股利收入會同時納入「合併計稅」與「28% 分開計稅」兩種情境試算；正式推薦結果將在後續稅額方案中比較。
        </p>
      )}

      <div className="space-y-0 rounded-xl border border-gray-300 bg-gray-100/70 p-3">
        {persons.map((person) => {
          const isFixed = person.id === 'self' || person.id === 'spouse'
          const extraOrder =
            person.id.startsWith('extra-') ? extraPersonsOrdered.findIndex((p) => p.id === person.id) + 1 : 0
          const labelPlaceholder =
            !isFixed && person.id.startsWith('extra-') && !person.label.trim()
              ? defaultExtraDependentLabel(extraOrder - 1)
              : undefined
          return (
            <PersonRow
              key={person.id}
              person={person}
              config={config}
              incomeRaw={getInputRaw(person, config, inputValues)}
              isFixed={isFixed}
              labelPlaceholder={labelPlaceholder}
              onIncomeChange={(val) => updateAmount(person.id, val)}
              onLabelChange={isFixed ? undefined : (val) => handlePersonLabelChange(person.id, val)}
              onRemove={isFixed ? undefined : () => handleRemovePerson(person.id)}
            />
          )
        })}
      </div>

      <button
        type="button"
        onClick={handleAddPerson}
        className="no-print mt-2 flex items-center gap-1 text-xs text-blue-600 transition-colors hover:text-blue-800"
        data-testid={`income-add-person-${config.id}`}
      >
        <span aria-hidden="true">＋</span>
        <span>新增共同報稅者</span>
      </button>

      <p className="mt-2 text-xs text-gray-400">
        資料僅在您的瀏覽器處理，不會傳送至任何伺服器
      </p>

      <div className="mt-3 space-y-0.5 text-base text-gray-500">
        <p className="font-medium text-gray-700">{config.subtotalLabel}</p>
        {isComplete ? (
          <div className="flex justify-between gap-4 border-t border-gray-100 pt-0.5 font-semibold text-blue-700" data-testid={`income-total-${config.id}`}>
            <span>＝</span>
            <span className="tabular-nums">{formatTwd(total)} 元</span>
          </div>
        ) : (
          <p className="font-semibold text-gray-300" data-testid={`income-total-${config.id}`}>未填寫</p>
        )}
      </div>
    </ChecklistCardShell>
  )
}
