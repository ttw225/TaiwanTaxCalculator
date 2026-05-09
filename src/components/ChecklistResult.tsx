import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  CardInputMap,
  CategoryId,
  Situation,
  SituationId,
} from '../types/content'
import type { CategoryGroup } from '../lib/checklist'
import { CHECKLIST_USAGE_REMINDER_COMPLEX_ITEMS } from '../lib/checklistCardCopy'
import { resolveGeneralDeduction, type ItemizedCalcContext } from '../lib/generalDeductionEffective'
import { getNumber } from '../lib/numbers'
import { animateScrollToY } from '../lib/scrollAnimation'
import { ITEM_INLINE_FIELDS } from '../content/inlineFields'
import { parseGrossIncomePersons, calcPersonNetIncome } from '../lib/grossIncome'
import { FormulaRow } from './checklist/FormulaRow'
import { StandardItemizedPanel } from './checklist/StandardItemizedPanel'
import { DecisionToolsPanel } from './DecisionToolsPanel'
import { DeductionCard } from './DeductionCard'
import { GrossIncomeCard } from './GrossIncomeCard'
import { TaxSummaryPanel } from './TaxSummaryPanel'
import { PageHeading } from './ui/PageHeading'
import { Card, CardBody } from './ui/Card'

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
])

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
  pendingSituationIds: SituationId[]
  onToggleSituation: (id: SituationId) => void
  onCancel: () => void
  onConfirm: () => void
}

function AddSituationModal({
  groups,
  isOpen,
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
      <div className="w-full max-w-3xl rounded-xl border border-gray-200 bg-white shadow-xl">
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

        <div className="max-h-[36rem] overflow-y-auto px-4 py-4">
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
                  return (
                    <label
                      key={situation.id}
                      onClick={() => onToggleSituation(situation.id)}
                      className={[
                        'flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 transition-colors',
                        isChecked
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300',
                      ].join(' ')}
                    >
                      <div
                        role="checkbox"
                        aria-checked={isChecked}
                        data-testid={`add-situation-checkbox-${situation.id}`}
                        className={[
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                          isChecked ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white',
                        ].join(' ')}
                      >
                        {isChecked && (
                          <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span>
                        <span className="block text-base font-medium text-gray-900">{situation.label}</span>
                        <span className="mt-0.5 block text-sm text-gray-500">{situation.description}</span>
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
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            確認移除此項目：{impact.itemTitle}
          </h2>
        </div>

        <div className="px-4 py-3 text-base text-gray-600">
          <p>將清除「{impact.itemTitle}」已填寫的資料。</p>
          <p className="mt-1 text-sm text-gray-500">您可以隨時加回此項目</p>
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
            確認移除
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
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">重新計算</h2>
        </div>
        <div className="px-4 py-3 text-base text-gray-600">
          <p>將清除項目與所有輸入的試算資料</p>
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
            重新計算
          </button>
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
  const [pendingSituationIds, setPendingSituationIds] = useState<SituationId[]>([])
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const itemRefs = useRef<Record<string, HTMLElement | null>>({})
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0)
  const hasResults = totalItems > 0
  const canAddMore = addableSituationGroups.length > 0

  useEffect(() => {
    if (!scrollToItemId) return
    const target = itemRefs.current[scrollToItemId]
    if (target) {
      const targetRect = target.getBoundingClientRect()
      const targetCenterY = targetRect.top + window.scrollY + targetRect.height / 2
      const viewportCenterY = window.innerHeight / 2
      const targetY = Math.max(0, Math.round(targetCenterY - viewportCenterY))
      animateScrollToY(targetY)
    }
    onScrollHandled?.()
  }, [onScrollHandled, scrollToItemId])

  function openAddModal() {
    setPendingSituationIds([])
    setIsAddModalOpen(true)
  }

  function handleTogglePendingSituation(id: SituationId) {
    setPendingSituationIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
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

  const specialDeductionFormulaItems = useMemo(
    () =>
      (specialDeductionGroup?.items ?? [])
        .filter((item) => SPECIAL_DEDUCTION_META[item.id])
        .map((item) => ({
          id: item.id,
          label: SPECIAL_DEDUCTION_META[item.id].label,
          amount: getSpecialDeductionItemAmount(item.id, cardInputMap[item.id] ?? {}),
        })),
    [specialDeductionGroup, cardInputMap],
  )

  // Derived from formula items so sidebar and formula row share the same filled/unfilled policy.
  // Any unfilled item (amount === null) blocks the total → TaxSummaryPanel shows 待計算.
  const specialDeductionAmount = useMemo(() => {
    if (specialDeductionFormulaItems.length === 0) return null
    if (specialDeductionFormulaItems.some((i) => i.amount === null)) return null
    return specialDeductionFormulaItems.reduce((sum, i) => sum + (i.amount ?? 0), 0)
  }, [specialDeductionFormulaItems])

  const grossIncomeFormulaItems = useMemo(() => {
    const hasGrossIncomeCard = groups.some((g) =>
      g.items.some((item) => item.id === 'gross-income'),
    )
    if (!hasGrossIncomeCard) return null
    const inputs = cardInputMap['gross-income'] ?? {}
    const persons = parseGrossIncomePersons(inputs, isMarriedFiling)
    const hasSelfIncomeInput = (inputs['self_income'] ?? '').trim() !== ''
    const filledPersonIds = new Set<string>()
    const rawPersonsJson = inputs['persons_json']
    if (rawPersonsJson) {
      try {
        const parsed = JSON.parse(rawPersonsJson)
        if (Array.isArray(parsed)) {
          for (const person of parsed) {
            if (
              person &&
              typeof person === 'object' &&
              typeof person.id === 'string' &&
              typeof person.income === 'number'
            ) {
              filledPersonIds.add(person.id)
            }
          }
        }
      } catch {
        // Ignore malformed input and keep the row as unfilled.
      }
    }
    return persons.map((p) => ({
      id: p.id,
      label: p.label,
      amount:
        p.id === 'self'
          ? (hasSelfIncomeInput ? calcPersonNetIncome(p.income) : null)
          : (filledPersonIds.has(p.id) ? calcPersonNetIncome(p.income) : null),
    }))
  }, [groups, cardInputMap, isMarriedFiling])

  const grossIncomeAmount = useMemo(() => {
    if (!grossIncomeFormulaItems || grossIncomeFormulaItems.length === 0) return null
    if (grossIncomeFormulaItems.some((item) => item.amount === null)) return null
    return grossIncomeFormulaItems.reduce((sum, item) => sum + (item.amount ?? 0), 0)
  }, [grossIncomeFormulaItems])

  const savingsInvestmentEnabled = useMemo(() => {
    const specialDeductionGroup = groups.find((g) => g.category === 'special_deductions')
    return (specialDeductionGroup?.items ?? []).some((i) => i.id === 'savings-investment-deduction')
  }, [groups])

  const savingsInvestmentDeductionAmount = useMemo(() => {
    if (!savingsInvestmentEnabled) return null
    return getSpecialDeductionItemAmount(
      'savings-investment-deduction',
      cardInputMap['savings-investment-deduction'] ?? {},
    )
  }, [cardInputMap, savingsInvestmentEnabled])

  const itemizedContext: Partial<ItemizedCalcContext> = useMemo(
    () => ({
      grossIncomeAmount,
      savingsInvestmentEnabled,
      savingsInvestmentDeductionAmount,
      onScrollToSection: handleScrollToSection,
      onScrollToItem: handleScrollToItem,
    }),
    [grossIncomeAmount, savingsInvestmentEnabled, savingsInvestmentDeductionAmount],
  )

  const generalDeductionResolved = useMemo(
    () => resolveGeneralDeduction(groups, cardInputMap, isMarriedFiling, itemizedContext),
    [groups, cardInputMap, isMarriedFiling, itemizedContext],
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

  function handleScrollToSection(categoryId: string) {
    const el = sectionRefs.current[categoryId as CategoryId]
    if (!el) return
    animateScrollToY(el.getBoundingClientRect().top + window.scrollY - 80)
  }

  function handleScrollToItem(itemId: string) {
    const el = itemRefs.current[itemId]
    if (!el) return
    animateScrollToY(el.getBoundingClientRect().top + window.scrollY - 80)
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

      <div className="lg:grid lg:grid-cols-[1fr_360px] lg:gap-6 lg:items-start print-main-layout">
        {/* ── Main column ── */}
        <div>
          <PageHeading
            title="節稅試算清單"
            description={`根據您選擇的 ${totalSelected} 項情況，找到 ${totalItems} 個值得確認的項目。`}
            actions={(
              <>
                <button
                  type="button"
                  onClick={handleResetClick}
                  data-testid="reset-checklist-btn"
                  className="inline-flex items-center rounded-xl border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50"
                >
                  重新計算
                </button>
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
                    <span aria-hidden="true">+</span>
                    <span>新增項目</span>
                  </button>
                  {!canAddMore && (
                    <span className="pointer-events-none absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 whitespace-nowrap group-hover:opacity-100">
                      所有項目都已加入
                    </span>
                  )}
                </span>
              </>
            )}
          />

          <div className="mb-6 no-print">
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
                      <span className="text-base font-semibold text-green-700 tabular-nums">
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
                    itemizedContext={itemizedContext}
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
                          <FormulaRow items={fItems} />
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
                      ref={(element) => {
                        itemRefs.current[item.id] = element
                      }}
                      data-testid={`checklist-item-${item.id}`}
                    >
                      {item.id === 'gross-income' ? (
                        <GrossIncomeCard
                          item={item}
                          inputValues={cardInputMap[item.id] ?? {}}
                          isMarriedFiling={isMarriedFiling}
                          sourceSituationLabels={itemSourceSituationLabelsById[item.id] ?? []}
                          removable={!NON_REMOVABLE_ITEM_IDS.has(item.id)}
                          onInputChange={(fieldId, value) => onCardInputChange(item.id, fieldId, value)}
                          onRemove={() => onRemoveItem?.(item.id)}
                        />
                      ) : (
                        <DeductionCard
                          item={item}
                          inlineFields={ITEM_INLINE_FIELDS[item.id] ?? []}
                          inputValues={cardInputMap[item.id] ?? {}}
                          feedbackContext={itemizedContext}
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
        <aside className="no-print mt-6 lg:mt-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-auto">
          <TaxSummaryPanel
            grossIncome={grossIncomeAmount}
            exemptionAmount={exemptionAmount}
            generalDeductionAmount={generalDeductionAmount}
            generalDeductionMethod={generalDeductionMethod}
            specialDeductionAmount={hasSpecialDeductions ? specialDeductionAmount : null}
            hasSpecialDeductions={hasSpecialDeductions}
            onScrollToSection={handleScrollToSection}
            exportGroups={hasResults ? groups : undefined}
            exportTotalSelected={hasResults ? totalSelected : undefined}
          />
        </aside>
      </div>
    </div>
  )
}
