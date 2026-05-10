import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  CardInputMap,
  CategoryId,
  Situation,
  SituationId,
} from '../types/content'
import type { CategoryGroup } from '../lib/checklist'
import { CHECKLIST_USAGE_REMINDER_COMPLEX_ITEMS } from '../lib/checklistCardCopy'
import { formatChecklistMarkdown } from '../lib/exportChecklist'
import { resolveGeneralDeduction, type ItemizedCalcContext } from '../lib/generalDeductionEffective'
import { getNumber } from '../lib/numbers'
import { animateScrollToY } from '../lib/scrollAnimation'
import { ITEM_INLINE_FIELDS } from '../content/inlineFields'
import {
  INCOME_CARD_CONFIGS,
  INCOME_CARD_IDS,
  INCOME_PARTICIPANTS_ITEM_ID,
  calcPersonNetIncome,
  calcRawIncomeTotal,
  incomeCardIsComplete,
  parseIncomeCardPersons,
  parseIncomeParticipantsFromMap,
  serializeIncomeAmounts,
  serializeIncomeParticipants,
  type GrossIncomePerson,
  type IncomeCardId,
  type IncomeParticipant,
} from '../lib/grossIncome'
import { FormulaRow } from './checklist/FormulaRow'
import { StandardItemizedPanel } from './checklist/StandardItemizedPanel'
import { DecisionToolsPanel } from './DecisionToolsPanel'
import { DeductionCard } from './DeductionCard'
import { IncomeCard } from './IncomeCard'
import { TaxSummaryPanel } from './TaxSummaryPanel'
import { PageHeading } from './ui/PageHeading'
import { Card, CardBody } from './ui/Card'
import { ChecklistCardShell } from './checklist/ChecklistCardShell'

export interface RemovalImpactPreview {
  itemId: string
  itemTitle: string
  hasInputLoss: boolean
}

export interface AddableSituationGroup {
  id: string
  title: string
  description: string
  situations: Situation[]
}

interface Props {
  groups: CategoryGroup[]
  totalSelected: number
  selectedSituations: SituationId[]
  itemSourceSituationLabelsById?: Record<string, string[]>
  addableSituationGroups?: AddableSituationGroup[]
  cardInputMap: CardInputMap
  pendingRemovalImpact?: RemovalImpactPreview | null
  onCardInputChange: (itemId: string, fieldId: string, value: string) => void
  onReset?: () => void
  onAddSituations?: (ids: SituationId[]) => void
  onRemoveItem?: (itemId: string) => void
  onCancelRemoveItem?: () => void
  onConfirmRemoveItem?: () => void
  scrollToItemId?: string | null
  onScrollHandled?: () => void
}

type SpecialFieldDef =
  | { type: 'amount'; fieldId: string; capKey: string | null }
  | { type: 'count'; fieldId: string; perUnitKey: string }
  | { type: 'split'; fieldId: string; firstKey: string; additionalKey: string }

const SPECIAL_DEDUCTION_META: Record<string, { label: string; fields: SpecialFieldDef[] }> = {
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

const FORMULA_SECTION_BOX_CLASS = 'rounded-xl border border-gray-200 px-4 py-3'
const NON_REMOVABLE_ITEM_IDS = new Set([
  'exemption-general',
  'standard-deduction-single',
  'standard-deduction-married',
  'savings-investment-deduction',
])
const SITE_HEADER_HEIGHT = 56
const CONTENT_TOP_GAP = 12
const SECTION_HEADER_BUFFER_PX = 10

function getSpecialDeductionItemAmount(
  itemId: string,
  inputs: Record<string, string>,
): number | null {
  const meta = SPECIAL_DEDUCTION_META[itemId]
  if (!meta) return null
  let total = 0
  for (const f of meta.fields) {
    const raw = inputs[f.fieldId] ?? ''
    if (raw === '') return null   // any unfilled field → unfilled card
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

type AddSituationModalProps = {
  groups: AddableSituationGroup[]
  isOpen: boolean
  selectedSituations: SituationId[]
  pendingSituationIds: SituationId[]
  onToggleSituation: (id: SituationId) => void
  onCancel: () => void
  onConfirm: () => void
}

function AddSituationModal({
  groups,
  isOpen,
  selectedSituations,
  pendingSituationIds,
  onToggleSituation,
  onCancel,
  onConfirm,
}: AddSituationModalProps) {
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 p-4 no-print">
      <div className="w-full max-w-3xl flex flex-col max-h-[calc(100dvh-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">新增項目</h2>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-sm text-gray-500 hover:border-gray-300 hover:bg-gray-100"
            aria-label="關閉新增情境視窗"
          >
            ×
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          {groups.length === 0 && (
            <p className="py-8 text-center text-base text-gray-400">目前沒有可新增的情境</p>
          )}
          {groups.map((group) => (
            <section key={group.id} className="mb-5">
              <p className="mb-3 border-b border-gray-200 pb-1 text-xl font-semibold text-gray-900">{group.title}</p>
              <p className="mb-4 text-base text-gray-500">{group.description}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {group.situations.map((situation) => {
                  const isChecked = pendingSituationIds.includes(situation.id)
                  const hasInterestIncome =
                    selectedSituations.includes('interest_income') ||
                    pendingSituationIds.includes('interest_income')
                  const isSavingsInvestment = situation.id === 'savings_investment'
                  const isDisabled = isSavingsInvestment
                  const checked = isSavingsInvestment && hasInterestIncome ? true : isChecked
                  return (
                    <label
                      key={situation.id}
                      onClick={() => {
                        if (isDisabled) return
                        onToggleSituation(situation.id)
                      }}
                      className={[
                        'flex items-start gap-2 rounded-xl border px-3 py-2 transition-colors',
                        isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
                        checked
                          ? 'border-blue-400 bg-blue-50'
                          : isDisabled
                            ? 'border-gray-200 bg-gray-100'
                            : 'border-gray-200 bg-white hover:border-gray-300',
                      ].join(' ')}
                    >
                      <div
                        role="checkbox"
                        aria-checked={checked}
                        data-testid={`add-situation-checkbox-${situation.id}`}
                        className={[
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                          checked ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white',
                        ].join(' ')}
                      >
                        {checked && (
                          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span>
                        <span className="block text-base font-medium text-gray-900">{situation.label}</span>
                        <span className="mt-0.5 block text-sm text-gray-500">{situation.description}</span>
                        {isSavingsInvestment && (
                          <span className="mt-1 block text-xs text-gray-500">
                            {hasInterestIncome
                              ? '已與利息收入連動，會自動套用且不可單獨取消'
                              : '請先新增「利息收入」，系統會自動加入此扣除額'}
                          </span>
                        )}
                      </span>
                    </label>
                  )
                })}
              </div>
            </section>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            data-testid="cancel-add-situations-btn"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pendingSituationIds.length === 0}
            data-testid="confirm-add-situations-btn"
            className={[
              'rounded-xl px-3 py-1.5 text-sm font-medium transition-colors',
              pendingSituationIds.length > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'cursor-not-allowed bg-gray-100 text-gray-400',
            ].join(' ')}
          >
            新增
          </button>
        </div>
      </div>
    </div>
  )
}

function RemoveImpactDialog({
  impact,
  onCancel,
  onConfirm,
}: {
  impact: RemovalImpactPreview
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 p-4 no-print">
      <div className="w-full max-w-lg flex flex-col max-h-[calc(100dvh-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            移除 {impact.itemTitle}
          </h2>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 text-base text-gray-600">
          <p>已填寫的資料將一併清除。{impact.itemId === 'interest-income' && '儲蓄投資特別扣除額卡片會一同移除。'}</p>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            data-testid="cancel-remove-item-btn"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            data-testid="confirm-remove-item-btn"
          >
            移除
          </button>
        </div>
      </div>
    </div>
  )
}

function ResetConfirmDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 p-4 no-print">
      <div className="w-full max-w-lg flex flex-col max-h-[calc(100dvh-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">重新試算？</h2>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 text-base text-gray-600">
          <p>所有已勾選的項目與填寫的試算資料都會被清除。</p>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            data-testid="confirm-reset-btn"
            className="rounded-xl bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
          >
            確認
          </button>
        </div>
      </div>
    </div>
  )
}

function formatTwd(n: number) {
  return n.toLocaleString('zh-TW')
}

function SavingsInvestmentDeductionCard({
  item,
  interestIncomeAmount,
  sourceSituationLabels = [],
  onScrollToItem,
}: {
  item: CategoryGroup['items'][number]
  interestIncomeAmount: number
  sourceSituationLabels?: string[]
  onScrollToItem?: (itemId: string) => void
}) {
  const cap = getNumber('special_deduction_savings_investment')
  const deduction = Math.min(interestIncomeAmount, cap)
  const isOverCap = interestIncomeAmount > cap

  const interestIncomeLink = (
    <a
      href="#interest-income"
      onClick={(event) => {
        if (!onScrollToItem) return
        event.preventDefault()
        onScrollToItem('interest-income')
      }}
      className="inline p-0 m-0 border-0 bg-transparent font-inherit text-gray-600 underline underline-offset-2 hover:text-gray-800 transition-colors leading-none align-baseline"
    >
      利息收入
    </a>
  )

  return (
    <ChecklistCardShell
      item={item}
      sourceSituationLabels={sourceSituationLabels}
      removable={false}
    >
      <div className="mt-3 rounded-xl border border-gray-300 bg-gray-100/70 p-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[14px] leading-tight text-gray-500">可申報</span>
          <span className="text-[16px] font-semibold tabular-nums leading-tight text-gray-800">
            {formatTwd(deduction)} 元
          </span>
        </div>
        <p className={`mt-1 text-sm ${isOverCap ? 'text-red-700' : 'text-gray-500'}`}>
          {isOverCap
            ? <>{interestIncomeLink}已達可申報上限 {formatTwd(cap)} 元</>
            : <>{interestIncomeLink}低於最高可扣除額</>}
        </p>
      </div>
    </ChecklistCardShell>
  )
}

function GrossIncomeFormulaPanel({
  items,
  showDividendScenarios,
  mergedAmount,
  separateDividendAmount,
}: {
  items: { id: string; label: string; amount: number | null }[]
  showDividendScenarios: boolean
  mergedAmount: number | null
  separateDividendAmount: number | null
}) {
  if (!showDividendScenarios) return <FormulaRow items={items} />

  return (
    <div>
      <FormulaRow items={items} />
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="gross-income-dividend-scenarios">
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2">
          <p className="text-sm font-semibold text-green-900">合併計稅</p>
          <p className="mt-1 text-xs leading-relaxed text-green-800">
            綜合所得總額包含薪資、股利、利息與其他收入；後續計算稅額時可再考慮股利可抵減稅額。
          </p>
          <p className="mt-2 text-lg font-bold tabular-nums text-green-800">
            {mergedAmount === null ? '待填寫' : `${formatTwd(mergedAmount)} 元`}
          </p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2">
          <p className="text-sm font-semibold text-blue-900">28% 分開計稅</p>
          <p className="mt-1 text-xs leading-relaxed text-blue-800">
            股利不併入此處的綜合所得總額，改以固定稅率另行計算；本區先列出不含股利的總額。
          </p>
          <p className="mt-2 text-lg font-bold tabular-nums text-blue-800">
            {separateDividendAmount === null ? '待填寫' : `${formatTwd(separateDividendAmount)} 元`}
          </p>
        </div>
      </div>
    </div>
  )
}

export function ChecklistResult({
  groups,
  totalSelected,
  selectedSituations,
  itemSourceSituationLabelsById = {},
  addableSituationGroups = [],
  cardInputMap,
  pendingRemovalImpact,
  onCardInputChange,
  onReset,
  onAddSituations,
  onRemoveItem,
  onCancelRemoveItem,
  onConfirmRemoveItem,
  scrollToItemId,
  onScrollHandled,
}: Props) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exportMenuDirection, setExportMenuDirection] = useState<'above' | 'below'>('below')
  const [pendingSituationIds, setPendingSituationIds] = useState<SituationId[]>([])
  const [stickyHeadingHeight, setStickyHeadingHeight] = useState(0)
  const stickyHeadingRef = useRef<HTMLDivElement | null>(null)
  const exportMenuRef = useRef<HTMLDivElement | null>(null)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const itemRefs = useRef<Record<string, HTMLElement | null>>({})
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0)
  const hasResults = totalItems > 0
  const showExport = hasResults
  const canAddMore = addableSituationGroups.length > 0
  const hasDecisionTools = selectedSituations.some(
    (id) => id === 'dividends' || id === 'married' || id === 'overseas_income',
  )

  const getSectionScrollOffset = useCallback(() => {
    const measuredStickyHeadingHeight = stickyHeadingRef.current?.getBoundingClientRect().height ?? 0
    const effectiveStickyHeadingHeight = stickyHeadingHeight > 0
      ? stickyHeadingHeight
      : Math.ceil(measuredStickyHeadingHeight)
    return SITE_HEADER_HEIGHT + effectiveStickyHeadingHeight + CONTENT_TOP_GAP + SECTION_HEADER_BUFFER_PX
  }, [stickyHeadingHeight])

  useEffect(() => {
    if (!scrollToItemId) return
    if (scrollToItemId.startsWith('section:')) {
      const categoryId = scrollToItemId.slice('section:'.length)
      const target = sectionRefs.current[categoryId as CategoryId]
      if (target) {
        animateScrollToY(target.getBoundingClientRect().top + window.scrollY - getSectionScrollOffset())
      }
      onScrollHandled?.()
      return
    }

    const target = itemRefs.current[scrollToItemId]
    if (target) {
      const targetY = Math.max(
        0,
        Math.round(target.getBoundingClientRect().top + window.scrollY - getSectionScrollOffset()),
      )
      animateScrollToY(targetY)
    }
    onScrollHandled?.()
  }, [getSectionScrollOffset, onScrollHandled, scrollToItemId])

  useEffect(() => {
    function updateStickyHeadingHeight() {
      const height = stickyHeadingRef.current?.getBoundingClientRect().height ?? 0
      setStickyHeadingHeight(Math.ceil(height))
    }

    updateStickyHeadingHeight()
    if (typeof ResizeObserver !== 'undefined' && stickyHeadingRef.current) {
      const observer = new ResizeObserver(() => updateStickyHeadingHeight())
      observer.observe(stickyHeadingRef.current)
      return () => observer.disconnect()
    }

    window.addEventListener('resize', updateStickyHeadingHeight)
    return () => window.removeEventListener('resize', updateStickyHeadingHeight)
  }, [])

  useEffect(() => {
    if (!exportMenuOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setExportMenuOpen(false)
    }
    function onPointerDown(event: MouseEvent) {
      if (!exportMenuRef.current?.contains(event.target as Node)) {
        setExportMenuOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('mousedown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
    }
  }, [exportMenuOpen])

  function openAddModal() {
    setPendingSituationIds([])
    setIsAddModalOpen(true)
  }

  function handleTogglePendingSituation(id: SituationId) {
    if (id === 'savings_investment') return
    setPendingSituationIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      if (id === 'interest_income') {
        if (next.has('interest_income')) next.add('savings_investment')
        else next.delete('savings_investment')
      }
      return Array.from(next)
    })
  }

  function handleCancelAdd() {
    setPendingSituationIds([])
    setIsAddModalOpen(false)
  }

  function handleConfirmAdd() {
    onAddSituations?.(pendingSituationIds)
    setPendingSituationIds([])
    setIsAddModalOpen(false)
  }

  function handleResetClick() {
    setIsResetDialogOpen(true)
  }

  function getMarkdown() {
    return formatChecklistMarkdown(groups, {
      totalSelected,
      exportTime: new Date().toLocaleString('zh-TW'),
    })
  }

  function handleExportMenuToggle() {
    if (!exportMenuOpen) {
      const rect = exportMenuRef.current?.getBoundingClientRect()
      if (rect) setExportMenuDirection(rect.bottom > window.innerHeight / 2 ? 'above' : 'below')
    }
    setExportMenuOpen((v) => !v)
  }

  function handleDownload() {
    const md = getMarkdown()
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'tax-checklist-2026.md'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function handlePrint() {
    window.print()
  }

  const isMarriedFiling = selectedSituations.includes('married')

  const exemptionAmount = useMemo(() => {
    const inputs = cardInputMap['exemption-general'] ?? {}
    const under70 = Number(inputs['exemption_under70_count'] ?? '') || 0
    const over70 = Number(inputs['exemption_over70_count'] ?? '') || 0
    if (under70 === 0 && over70 === 0) return null
    return under70 * getNumber('exemption_general') + over70 * getNumber('exemption_senior_70')
  }, [cardInputMap])

  const specialDeductionGroup = groups.find((g) => g.category === 'special_deductions')
  const hasSpecialDeductions = (specialDeductionGroup?.items.length ?? 0) > 0

  const incomeParticipants = useMemo(
    () => parseIncomeParticipantsFromMap(cardInputMap, isMarriedFiling),
    [cardInputMap, isMarriedFiling],
  )

  const presentIncomeCardIds = useMemo(
    () => new Set(
      groups
        .flatMap((g) => g.items)
        .map((item) => item.id)
        .filter((id): id is IncomeCardId => INCOME_CARD_IDS.includes(id as IncomeCardId)),
    ),
    [groups],
  )

  const incomeSummaries = useMemo(
    () =>
      INCOME_CARD_IDS
        .filter((id) => presentIncomeCardIds.has(id))
        .map((id) => {
          const config = INCOME_CARD_CONFIGS[id]
          const persons = parseIncomeCardPersons(cardInputMap[id] ?? {}, incomeParticipants)
          const amount = config.kind === 'salary'
            ? persons.reduce((sum, p) => sum + calcPersonNetIncome(p.income), 0)
            : calcRawIncomeTotal(persons.map(({ id: personId, label, income }) => ({ id: personId, label, income })))
          return {
            id,
            label: config.formulaLabel,
            amount,
            complete: incomeCardIsComplete(config, persons),
          }
        }),
    [cardInputMap, incomeParticipants, presentIncomeCardIds],
  )

  const allIncomeCardsComplete = incomeSummaries.every((item) => item.complete)
  const grossIncomeMergedAmount = allIncomeCardsComplete
    ? incomeSummaries.reduce((sum, item) => sum + item.amount, 0)
    : null
  const grossIncomeSeparateDividendAmount = allIncomeCardsComplete
    ? incomeSummaries
        .filter((item) => item.id !== 'dividend-income')
        .reduce((sum, item) => sum + item.amount, 0)
    : null
  const dividendIncomeAmount = incomeSummaries.find((item) => item.id === 'dividend-income')?.amount ?? 0
  const hasPositiveDividendIncome = dividendIncomeAmount > 0
  const shouldDeferGrossIncomeSummary =
    hasPositiveDividendIncome &&
    grossIncomeMergedAmount !== null &&
    grossIncomeSeparateDividendAmount !== null
  const grossIncomeAmount = shouldDeferGrossIncomeSummary ? null : grossIncomeMergedAmount
  const grossIncomeAmountForDeductionCaps = grossIncomeMergedAmount
  const shouldShowDividendDonationCaps =
    dividendIncomeAmount > 0 &&
    grossIncomeMergedAmount !== null &&
    grossIncomeSeparateDividendAmount !== null
  const interestIncomeAmount = incomeSummaries.find((item) => item.id === 'interest-income')?.amount ?? 0

  const specialDeductionFormulaItems = useMemo(
    () =>
      (specialDeductionGroup?.items ?? [])
        .filter((item) => SPECIAL_DEDUCTION_META[item.id])
        .map((item) => ({
          id: item.id,
          label: SPECIAL_DEDUCTION_META[item.id].label,
          amount: item.id === 'savings-investment-deduction'
            ? Math.min(interestIncomeAmount, getNumber('special_deduction_savings_investment'))
            : getSpecialDeductionItemAmount(item.id, cardInputMap[item.id] ?? {}),
        })),
    [specialDeductionGroup, cardInputMap, interestIncomeAmount],
  )

  // Derived from formula items so sidebar and formula row share the same filled/unfilled policy.
  // Any unfilled item (amount === null) blocks the total → TaxSummaryPanel shows 待計算.
  const specialDeductionAmount = useMemo(() => {
    if (specialDeductionFormulaItems.length === 0) return null
    if (specialDeductionFormulaItems.some((i) => i.amount === null)) return null
    return specialDeductionFormulaItems.reduce((sum, i) => sum + (i.amount ?? 0), 0)
  }, [specialDeductionFormulaItems])

  const grossIncomeFormulaItems = incomeSummaries.length > 0
    ? incomeSummaries.map((item) => ({
        id: item.id,
        label: item.label,
        amount: item.complete ? item.amount : null,
      }))
    : null

  const savingsInvestmentEnabled = useMemo(() => {
    const specialDeductionGroup = groups.find((g) => g.category === 'special_deductions')
    return (specialDeductionGroup?.items ?? []).some((i) => i.id === 'savings-investment-deduction')
  }, [groups])

  const savingsInvestmentDeductionAmount = useMemo(() => {
    if (!savingsInvestmentEnabled) return null
    return Math.min(interestIncomeAmount, getNumber('special_deduction_savings_investment'))
  }, [interestIncomeAmount, savingsInvestmentEnabled])

  const handleScrollToSection = useCallback((categoryId: string) => {
    const el = sectionRefs.current[categoryId as CategoryId]
    if (!el) return
    animateScrollToY(el.getBoundingClientRect().top + window.scrollY - getSectionScrollOffset())
  }, [getSectionScrollOffset])

  const handleScrollToItem = useCallback((itemId: string) => {
    const el = itemRefs.current[itemId]
    if (!el) return
    animateScrollToY(el.getBoundingClientRect().top + window.scrollY - getSectionScrollOffset())
  }, [getSectionScrollOffset])

  const itemizedCalculationContext: Partial<ItemizedCalcContext> = useMemo(
    () => ({
      grossIncomeAmount: grossIncomeAmountForDeductionCaps,
      dividendMergedGrossIncomeAmount: shouldShowDividendDonationCaps ? grossIncomeMergedAmount : null,
      dividendSeparateGrossIncomeAmount: shouldShowDividendDonationCaps ? grossIncomeSeparateDividendAmount : null,
      savingsInvestmentEnabled,
      savingsInvestmentDeductionAmount,
    }),
    [
      grossIncomeAmountForDeductionCaps,
      grossIncomeMergedAmount,
      grossIncomeSeparateDividendAmount,
      savingsInvestmentEnabled,
      savingsInvestmentDeductionAmount,
      shouldShowDividendDonationCaps,
    ],
  )

  const itemizedFeedbackContext: Partial<ItemizedCalcContext> = useMemo(
    () => ({
      ...itemizedCalculationContext,
      onScrollToSection: handleScrollToSection,
      onScrollToItem: handleScrollToItem,
    }),
    [handleScrollToItem, handleScrollToSection, itemizedCalculationContext],
  )

  const generalDeductionResolved = useMemo(
    () => resolveGeneralDeduction(groups, cardInputMap, isMarriedFiling, itemizedCalculationContext),
    [groups, cardInputMap, isMarriedFiling, itemizedCalculationContext],
  )

  const generalDeductionAmount =
    generalDeductionResolved.status === 'pending_itemized' ? null : generalDeductionResolved.amount
  const generalDeductionMethod =
    generalDeductionResolved.status === 'pending_itemized'
      ? null
      : generalDeductionResolved.status === 'standard_only' || generalDeductionAmount === null
        ? 'standard'
      : (generalDeductionAmount > getNumber(isMarriedFiling ? 'standard_deduction_married' : 'standard_deduction_single')
            ? 'itemized'
            : 'standard')

  function handleRemovePersonFromCard(cardId: IncomeCardId, personId: string) {
    // Remove from this card's persons_json
    const cardPersons = parseIncomeCardPersons(cardInputMap[cardId] ?? {}, incomeParticipants)
      .filter((p) => p.id !== 'self' && p.id !== personId && (p.id === 'spouse' || p.hasInput))
      .map((p): GrossIncomePerson => ({ id: p.id, label: p.label, income: p.income }))
    onCardInputChange(cardId, 'persons_json', serializeIncomeAmounts(cardPersons))

    // If not in any other card, remove from global participants too
    const stillInOtherCard = INCOME_CARD_IDS
      .filter((id) => id !== cardId)
      .some((otherId) =>
        parseIncomeCardPersons(cardInputMap[otherId] ?? {}, incomeParticipants)
          .some((p) => p.id === personId && p.hasInput),
      )

    if (!stillInOtherCard) {
      handleIncomeParticipantsChange(
        incomeParticipants.filter((p) => p.id !== 'self' && p.id !== personId),
        personId,
      )
    }
  }

  function handleIncomeParticipantsChange(nextParticipants: IncomeParticipant[], removedId?: string) {
    onCardInputChange(
      INCOME_PARTICIPANTS_ITEM_ID,
      'persons_json',
      serializeIncomeParticipants(nextParticipants),
    )

    if (!removedId) return
    for (const itemId of INCOME_CARD_IDS) {
      const raw = cardInputMap[itemId]?.['persons_json']
      if (!raw) continue
      const persons = parseIncomeCardPersons(cardInputMap[itemId] ?? {}, incomeParticipants)
        .filter((p) => p.id !== 'self' && p.id !== removedId && p.hasInput)
        .map((p): GrossIncomePerson => ({ id: p.id, label: p.label, income: p.income }))
      onCardInputChange(itemId, 'persons_json', serializeIncomeAmounts(persons))
    }
  }

  function getSectionSubtotal(group: CategoryGroup): number | null {
    switch (group.category) {
      case 'gross_income':
        return grossIncomeAmount
      case 'exemptions':
        return exemptionAmount
      case 'general_deductions':
        return generalDeductionResolved.status === 'pending_itemized'
          ? null
          : generalDeductionResolved.amount
      case 'special_deductions':
        return specialDeductionAmount
      default:
        return null
    }
  }

  function getFormulaItems(group: CategoryGroup) {
    if (group.category === 'special_deductions') return specialDeductionFormulaItems
    if (group.category === 'gross_income') return grossIncomeFormulaItems
    return null
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 print-container">
      <AddSituationModal
        groups={addableSituationGroups}
        isOpen={isAddModalOpen}
        selectedSituations={selectedSituations}
        pendingSituationIds={pendingSituationIds}
        onToggleSituation={handleTogglePendingSituation}
        onCancel={handleCancelAdd}
        onConfirm={handleConfirmAdd}
      />
      {pendingRemovalImpact && (
        <RemoveImpactDialog
          impact={pendingRemovalImpact}
          onCancel={() => onCancelRemoveItem?.()}
          onConfirm={() => onConfirmRemoveItem?.()}
        />
      )}
      {isResetDialogOpen && (
        <ResetConfirmDialog
          onCancel={() => setIsResetDialogOpen(false)}
          onConfirm={() => { setIsResetDialogOpen(false); onReset?.() }}
        />
      )}

      <div
        ref={stickyHeadingRef}
        className="no-print sticky top-14 z-40 -mx-4 mb-2 border-b border-gray-200 bg-gray-50/95 px-4 pt-0 pb-1 backdrop-blur"
      >
        <PageHeading
          title="節稅試算清單"
          description={`根據您選擇的 ${totalSelected} 項情況，找到 ${totalItems} 個值得確認的項目。`}
          className="[&_p]:mb-3 [&_p]:text-sm sm:[&_p]:text-base [&_.no-print]:mt-2"
          actions={(
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleResetClick}
                data-testid="reset-checklist-btn"
                className="inline-flex items-center rounded-xl border border-gray-300 bg-white px-2.5 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                重新試算
              </button>
              {showExport && (
                <div ref={exportMenuRef} className="relative">
                  <button
                    type="button"
                    className="rounded-xl border border-gray-300 bg-white px-2.5 py-1 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                    onClick={handleExportMenuToggle}
                    aria-haspopup="menu"
                    aria-expanded={exportMenuOpen}
                  >
                    匯出
                  </button>
                  {exportMenuOpen && (
                    <div className={['absolute right-0 z-10 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg', exportMenuDirection === 'above' ? 'bottom-full mb-2' : 'top-full mt-2'].join(' ')}>
                      <button
                        type="button"
                        onClick={() => {
                          handlePrint()
                          setExportMenuOpen(false)
                        }}
                        className="block w-full px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        data-testid="print-checklist-btn"
                      >
                        列印 / 另存 PDF
                      </button>
                      <div className="mx-3 border-t border-gray-200" />
                      <button
                        type="button"
                        onClick={() => {
                          handleDownload()
                          setExportMenuOpen(false)
                        }}
                        className="block w-full px-3 py-2 text-left text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        data-testid="download-checklist-btn"
                      >
                        下載 Markdown
                      </button>
                    </div>
                  )}
                </div>
              )}
              <span
                className={[
                  'group relative inline-flex',
                  canAddMore ? '' : 'cursor-help',
                ].join(' ')}
              >
                <button
                  type="button"
                  onClick={openAddModal}
                  disabled={!canAddMore}
                  data-testid="open-add-situation-modal-btn"
                  className={[
                    'inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors',
                    canAddMore
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'cursor-not-allowed bg-gray-100 text-gray-400',
                  ].join(' ')}
                >
                  <span>新增項目</span>
                </button>
                {!canAddMore && (
                  <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 whitespace-nowrap group-hover:opacity-100">
                    所有項目都已加入
                  </span>
                )}
              </span>
            </div>
          )}
        />
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start print-main-layout" style={{ marginTop: `${CONTENT_TOP_GAP}px` }}>
        {/* ── Main column ── */}
        <div>

          <div className={`${hasDecisionTools ? 'mb-6' : ''} no-print`}>
            <DecisionToolsPanel selectedSituations={selectedSituations} />
          </div>

          {!hasResults && (
            <div className="py-12 text-center text-gray-400">
              <p>目前清單中沒有項目</p>
              <p className="mt-2 text-xs text-gray-400">可使用右上角「新增項目」加入要確認的情境</p>
            </div>
          )}

          <div className="space-y-8">
            {groups.map((group) => (
              <section
                key={group.category}
                id={group.category}
                ref={(element) => {
                  sectionRefs.current[group.category] = element
                }}
                data-testid={`checklist-section-${group.category}`}
              >
                <h2 className="mb-3 border-b border-gray-200 pb-1 text-xl font-semibold text-gray-900 flex items-baseline gap-2">
                  <span>{group.label}</span>
                  {(() => {
                    const sub = getSectionSubtotal(group)
                    return sub !== null ? (
                      <span className="text-[20px] font-semibold text-blue-700 tabular-nums">
                        {sub.toLocaleString('zh-TW')} 元
                      </span>
                    ) : null
                  })()}
                </h2>
                {group.category === 'general_deductions' && (
                  <StandardItemizedPanel
                    groups={groups}
                    selectedSituations={selectedSituations}
                    cardInputMap={cardInputMap}
                    itemizedContext={itemizedFeedbackContext}
                  />
                )}
                {(() => {
                  const fItems = getFormulaItems(group)
                  const shouldWrapFormulaBox =
                    group.category === 'gross_income' || group.category === 'special_deductions'
                  return fItems && fItems.length > 0 ? (
                    <div className="mb-4">
                      {shouldWrapFormulaBox ? (
                        <div className={FORMULA_SECTION_BOX_CLASS}>
                          {group.category === 'gross_income' ? (
                            <GrossIncomeFormulaPanel
                              items={fItems}
                              showDividendScenarios={hasPositiveDividendIncome}
                              mergedAmount={grossIncomeMergedAmount}
                              separateDividendAmount={grossIncomeSeparateDividendAmount}
                            />
                          ) : (
                            <FormulaRow items={fItems} />
                          )}
                        </div>
                      ) : (
                        <FormulaRow items={fItems} />
                      )}
                    </div>
                  ) : null
                })()}
                <div className="space-y-3">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      id={item.id}
                      ref={(element) => {
                        itemRefs.current[item.id] = element
                      }}
                      data-testid={`checklist-item-${item.id}`}
                    >
                      {INCOME_CARD_IDS.includes(item.id as IncomeCardId) ? (
                        <IncomeCard
                          item={item}
                          config={INCOME_CARD_CONFIGS[item.id as IncomeCardId]}
                          inputValues={cardInputMap[item.id] ?? {}}
                          participants={incomeParticipants}
                          sourceSituationLabels={itemSourceSituationLabelsById[item.id] ?? []}
                          removable={!NON_REMOVABLE_ITEM_IDS.has(item.id)}
                          onInputChange={(fieldId, value) => onCardInputChange(item.id, fieldId, value)}
                          onParticipantsChange={handleIncomeParticipantsChange}
                          onRemovePersonFromCard={(personId) => handleRemovePersonFromCard(item.id as IncomeCardId, personId)}
                          onRemove={() => onRemoveItem?.(item.id)}
                        />
                      ) : item.id === 'savings-investment-deduction' ? (
                        <SavingsInvestmentDeductionCard
                          item={item}
                          interestIncomeAmount={interestIncomeAmount}
                          sourceSituationLabels={itemSourceSituationLabelsById[item.id] ?? []}
                          onScrollToItem={handleScrollToItem}
                        />
                      ) : (
                        <DeductionCard
                          item={item}
                          inlineFields={ITEM_INLINE_FIELDS[item.id] ?? []}
                          inputValues={cardInputMap[item.id] ?? {}}
                          feedbackContext={itemizedFeedbackContext}
                          sourceSituationLabels={itemSourceSituationLabelsById[item.id] ?? []}
                          removable={!NON_REMOVABLE_ITEM_IDS.has(item.id)}
                          onInputChange={(fieldId, value) => onCardInputChange(item.id, fieldId, value)}
                          onRemove={() => onRemoveItem?.(item.id)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <Card className="mt-8 bg-gray-50">
            <CardBody className="p-4">
              <p className="text-sm leading-relaxed text-gray-500">
                <strong className="text-gray-700">使用提醒：</strong>
                本清單協助整理可能適用的申報項目，根據114年度相關法規與官方資料整理。
                正式申報結果及稅負計算請以財政部電子申報系統為準，並視個人情況向稅務機關或記帳士確認。
                {CHECKLIST_USAGE_REMINDER_COMPLEX_ITEMS}
              </p>
            </CardBody>
          </Card>

          <div className="print-only mt-8">
            <TaxSummaryPanel
              grossIncome={grossIncomeAmount}
              grossIncomePendingCalculation={shouldDeferGrossIncomeSummary}
              exemptionAmount={exemptionAmount}
              generalDeductionAmount={generalDeductionAmount}
              generalDeductionMethod={generalDeductionMethod}
              specialDeductionAmount={hasSpecialDeductions ? specialDeductionAmount : null}
              hasSpecialDeductions={hasSpecialDeductions}
              printMode
            />
          </div>
        </div>

        {/* ── Sidebar ── */}
        <aside
          className="no-print mt-6 lg:mt-0 lg:sticky lg:max-h-[calc(100vh-6rem)] lg:overflow-auto"
          style={{ top: `${SITE_HEADER_HEIGHT + stickyHeadingHeight + CONTENT_TOP_GAP}px` }}
        >
          <TaxSummaryPanel
            grossIncome={grossIncomeAmount}
            grossIncomePendingCalculation={shouldDeferGrossIncomeSummary}
            exemptionAmount={exemptionAmount}
            generalDeductionAmount={generalDeductionAmount}
            generalDeductionMethod={generalDeductionMethod}
            specialDeductionAmount={hasSpecialDeductions ? specialDeductionAmount : null}
            hasSpecialDeductions={hasSpecialDeductions}
            onScrollToSection={handleScrollToSection}
          />
        </aside>
      </div>
    </div>
  )
}
