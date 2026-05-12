import { useState, useRef, useEffect } from 'react'
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
  onRemovePersonFromCard?: (personId: string) => void
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
    return config.requiresExplicitInput ? '' : ''
  }
  if (!person.hasInput && !config.requiresExplicitInput) return ''
  if (!person.hasInput) return ''
  // Extra relatives (extra-N) treat income=0 same as empty — both are valid "no income" states
  if (person.id.startsWith('extra-') && person.income === 0) return ''
  return String(person.income)
}

interface PersonRowProps {
  person: IncomeInputPerson
  config: IncomeCardConfig
  incomeRaw: string
  isFixed: boolean
  labelPlaceholder?: string
  onIncomeChange: (value: string) => void
  onEditLabel?: () => void
  onRemove?: () => void
}

function FormulaCol({ label, amount, amountClass }: { label: string; amount: number; amountClass: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-sm leading-tight text-gray-500">{label}</span>
      <span className={`text-base font-semibold tabular-nums leading-tight ${amountClass}`}>
        {amount.toLocaleString('zh-TW')} 元
      </span>
    </div>
  )
}

function SalaryFormulaInline({
  income,
  deduction,
  net,
  showFullDeductionHint,
}: {
  income: number
  deduction: number
  net: number
  showFullDeductionHint: boolean
}) {
  const netColor = 'text-gray-800'
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <FormulaCol label="薪資收入" amount={income} amountClass="text-gray-700" />
      <span className="select-none self-end pb-[2px] text-sm text-gray-400">−</span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm leading-tight text-gray-500">薪資所得特別扣除額</span>
        <span className="text-base font-semibold tabular-nums leading-tight text-gray-700">
          {deduction.toLocaleString('zh-TW')} 元
          {showFullDeductionHint && <span className="ml-1 text-xs font-normal text-gray-400">（全額扣除）</span>}
        </span>
      </div>
      <span className="select-none self-end pb-[2px] text-sm text-gray-400">＝</span>
      <FormulaCol label="薪資淨額" amount={net} amountClass={netColor} />
    </div>
  )
}

function PencilIcon() {
  return (
    <svg width="28" height="28" viewBox="2 2 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  )
}

function PersonRow({
  person,
  config,
  incomeRaw,
  isFixed,
  labelPlaceholder,
  onIncomeChange,
  onEditLabel,
  onRemove,
}: PersonRowProps) {
  const cap = getSalaryDeductionCap()
  const income = parseIncome(incomeRaw)
  const deduction = calcPersonDeduction(income)
  const net = calcPersonNetIncome(income)
  const hasSalaryFormula = config.kind === 'salary' && person.hasInput && income > 0

  return (
    <div className="border-b border-gray-300 py-3 first:pt-0 last:border-0">
      <div className="mb-1.5 flex items-center gap-2">
        <span className={`text-base font-semibold ${person.label ? 'text-gray-700' : 'text-gray-400'}`}>
          {person.label || labelPlaceholder || '稱謂'}
        </span>
        {!isFixed && onEditLabel && (
          <span
            onClick={onEditLabel}
            aria-label={`編輯 ${person.label || '此人員'} 的稱謂`}
            className="inline-flex h-4 w-4 cursor-pointer items-center justify-center text-gray-400 transition-colors hover:text-gray-600"
          >
            <PencilIcon />
          </span>
        )}
        {!isFixed && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`移除 ${person.label || '此人員'}`}
            className="ml-auto inline-flex h-7 w-7 items-center justify-center text-2xl text-gray-400 transition-colors hover:text-gray-700"
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
          placeholder="輸入金額"
          data-testid={`income-input-${config.id}-${person.id}`}
          className="no-spin w-40 rounded border border-gray-300 px-2 py-1 text-base text-gray-800 focus:border-blue-400 focus:outline-none"
        />
        <span className="text-base text-gray-500">元</span>
      </div>
      {hasSalaryFormula && (
        <div className="mt-2">
          <SalaryFormulaInline
            income={income}
            deduction={deduction}
            net={net}
            showFullDeductionHint={income <= cap}
          />
        </div>
      )}
    </div>
  )
}

interface NameDialogProps {
  title: string
  label: string
  onLabelChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  confirmLabel: string
}

function NameDialog({ title, label, onLabelChange, onConfirm, onCancel, confirmLabel }: NameDialogProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-base font-semibold text-gray-800">{title}</h2>
        <input
          type="text"
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && label.trim()) onConfirm() }}
          placeholder="稱謂"
          autoFocus
          className="w-full rounded border border-gray-300 px-3 py-2 text-base text-gray-800 focus:border-blue-400 focus:outline-none"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={label.trim() === ''}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

interface AddRelativeMenuProps {
  extrasNotInThisCard: IncomeParticipant[]
  onSelectExisting: (personId: string) => void
  onNewRelative: () => void
  direction: 'above' | 'below'
}

function AddRelativeMenu({ extrasNotInThisCard, onSelectExisting, onNewRelative, direction }: AddRelativeMenuProps) {
  return (
    <div className={['absolute left-0 z-20 min-w-[160px] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg', direction === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'].join(' ')}>
      {extrasNotInThisCard.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onSelectExisting(p.id)}
          className="block w-full px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          {p.label || p.id}
        </button>
      ))}
      {extrasNotInThisCard.length > 0 && <div className="mx-3 border-t border-gray-200" />}
      <button
        type="button"
        onClick={onNewRelative}
        className="block w-full px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        新增
      </button>
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
  onRemovePersonFromCard,
}: Props) {
  const [dialogMode, setDialogMode] = useState<'add' | 'edit' | null>(null)
  const [dialogLabel, setDialogLabel] = useState('')
  const [editingPersonId, setEditingPersonId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuDirection, setMenuDirection] = useState<'above' | 'below'>('below')
  const menuContainerRef = useRef<HTMLDivElement>(null)
  const menuAnchorRef = useRef<HTMLDivElement>(null)

  const persons = parseIncomeCardPersons(inputValues, participants)
  const visiblePersons = persons.filter((p) => p.id === 'self' || p.id === 'spouse' || p.hasInput)

  const amountPersons = visiblePersons.map(({ id, label, income }) => ({ id, label, income }))
  const total = config.kind === 'salary'
    ? visiblePersons.reduce((sum, p) => sum + calcPersonNetIncome(p.income), 0)
    : calcRawIncomeTotal(amountPersons)
  const isComplete = incomeCardIsComplete(config, visiblePersons)

  const participantsInJson = participants.filter((p) => p.id !== 'self')
  const extraPersonsOrdered = participantsInJson.filter((p) => p.id.startsWith('extra-'))
  const globalExtras = participants.filter((p) => p.id.startsWith('extra-'))
  const extrasInThisCard = new Set(
    persons.filter((p) => p.id.startsWith('extra-') && p.hasInput).map((p) => p.id),
  )
  const extrasNotInThisCard = globalExtras.filter((p) => !extrasInThisCard.has(p.id))

  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  useEffect(() => {
    if (!menuOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [menuOpen])

  function updateAmount(targetId: string, value: string) {
    if (targetId === 'self') {
      onInputChange('self_income', value)
      return
    }
    const next = persons
      .filter((p) => p.id !== 'self')
      .filter((p) => {
        if (p.id === targetId) return !config.requiresExplicitInput || targetId.startsWith('extra-') ? true : value.trim() !== ''
        return p.id === 'spouse' || p.hasInput
      })
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
    if (onRemovePersonFromCard) {
      onRemovePersonFromCard(targetId)
    } else {
      const next = participantsInJson.filter((p) => p.id !== targetId)
      onParticipantsChange(next, targetId)
    }
  }

  function openAddDialog() {
    const extraNums = globalExtras
      .map((p) => parseInt(p.id.slice('extra-'.length), 10))
      .filter((n) => Number.isFinite(n))
    const nextNum = extraNums.length > 0 ? Math.max(...extraNums) + 1 : 0
    setDialogLabel(defaultExtraDependentLabel(nextNum))
    setDialogMode('add')
    setMenuOpen(false)
  }

  function openEditDialog(personId: string, currentLabel: string) {
    setEditingPersonId(personId)
    setDialogLabel(currentLabel)
    setDialogMode('edit')
  }

  function closeDialog() {
    setDialogMode(null)
    setEditingPersonId(null)
    setDialogLabel('')
  }

  function handleClickAdd() {
    if (extrasNotInThisCard.length === 0) {
      openAddDialog()
    } else {
      if (!menuOpen) {
        const rect = menuAnchorRef.current?.getBoundingClientRect()
        if (rect) setMenuDirection(rect.bottom > window.innerHeight / 2 ? 'above' : 'below')
      }
      setMenuOpen((v) => !v)
    }
  }

  function handleCreateNew() {
    const label = dialogLabel.trim()
    if (!label) return

    const extraNums = participantsInJson
      .filter((p) => p.id.startsWith('extra-'))
      .map((p) => parseInt(p.id.slice('extra-'.length), 10))
      .filter((n) => Number.isFinite(n))
    const nextNum = extraNums.length > 0 ? Math.max(...extraNums) + 1 : 0
    const nextId = `extra-${nextNum}`

    onParticipantsChange([...participantsInJson, { id: nextId, label }])

    const currentInCard = persons
      .filter((p) => p.id !== 'self' && (p.id === 'spouse' || p.hasInput))
      .map((p) => ({ id: p.id, label: p.label, income: p.income }))
    onInputChange('persons_json', serializeIncomeAmounts([...currentInCard, { id: nextId, label, income: 0 }]))

    closeDialog()
  }

  function handleSaveLabel() {
    if (!editingPersonId || !dialogLabel.trim()) return
    handlePersonLabelChange(editingPersonId, dialogLabel.trim())
    closeDialog()
  }

  function handleAddExisting(personId: string) {
    const currentInCard = persons
      .filter((p) => p.id !== 'self' && (p.id === 'spouse' || p.hasInput))
      .map((p) => ({ id: p.id, label: p.label, income: p.income }))
    const person = participants.find((p) => p.id === personId)
    if (!person) return
    onInputChange('persons_json', serializeIncomeAmounts([
      ...currentInCard,
      { id: personId, label: person.label, income: 0 },
    ]))
    setMenuOpen(false)
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
          股利收入會在摘要中同時比較「合併計稅並扣抵」與「28% 分開計稅」，系統會採用稅額較低的組合。
        </p>
      )}

      <div className="rounded-xl border border-gray-300 bg-gray-100/70 p-3">
        <div className="space-y-0">
          {visiblePersons.map((person) => {
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
                onEditLabel={isFixed ? undefined : () => openEditDialog(person.id, person.label)}
                onRemove={isFixed ? undefined : () => handleRemovePerson(person.id)}
              />
            )
          })}
        </div>

        <div className="mt-2 border-t border-gray-200 pt-3" ref={menuContainerRef}>
          <div className="relative" ref={menuAnchorRef}>
            <button
              type="button"
              onClick={handleClickAdd}
              data-testid={`income-add-person-${config.id}`}
              className="no-print inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-2.5 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              新增共同報稅者
            </button>
            {menuOpen && (
              <AddRelativeMenu
                extrasNotInThisCard={extrasNotInThisCard}
                onSelectExisting={handleAddExisting}
                onNewRelative={openAddDialog}
                direction={menuDirection}
              />
            )}
          </div>
        </div>
      </div>

      <div className="mt-3">
        {isComplete ? (
          <p className="text-base font-medium text-gray-700 tabular-nums" data-testid={`income-total-${config.id}`}>
            小計 {formatTwd(total)} 元
          </p>
        ) : (
          <p className="text-base font-medium text-gray-300" data-testid={`income-total-${config.id}`}>小計 未填寫</p>
        )}
      </div>

      {dialogMode === 'add' && (
        <NameDialog
          title="新增共同報稅者"
          label={dialogLabel}
          onLabelChange={setDialogLabel}
          onConfirm={handleCreateNew}
          onCancel={closeDialog}
          confirmLabel="新增"
        />
      )}
      {dialogMode === 'edit' && (
        <NameDialog
          title="編輯稱謂"
          label={dialogLabel}
          onLabelChange={setDialogLabel}
          onConfirm={handleSaveLabel}
          onCancel={closeDialog}
          confirmLabel="儲存"
        />
      )}
    </ChecklistCardShell>
  )
}
