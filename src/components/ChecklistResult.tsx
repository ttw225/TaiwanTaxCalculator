import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  CardInputMap,
  CategoryId,
  Situation,
  SituationId,
} from '../types/content'
import type { CategoryGroup } from '../lib/checklist'
import { formatChecklistMarkdown } from '../lib/exportChecklist'
import { CHECKLIST_USAGE_REMINDER_COMPLEX_ITEMS } from '../lib/checklistCardCopy'
import { resolveGeneralDeduction } from '../lib/generalDeductionEffective'
import { getNumber } from '../lib/numbers'
import { animateScrollToY } from '../lib/scrollAnimation'
import { ITEM_INLINE_FIELDS } from '../content/inlineFields'
import { parseGrossIncomePersons, calcTotalGrossIncome, calcPersonNetIncome } from '../lib/grossIncome'
import { FormulaRow } from './checklist/FormulaRow'
import { StandardItemizedPanel } from './checklist/StandardItemizedPanel'
import { DecisionToolsPanel } from './DecisionToolsPanel'
import { DeductionCard } from './DeductionCard'
import { GrossIncomeCard } from './GrossIncomeCard'
import { TaxSummaryPanel } from './TaxSummaryPanel'

export interface RemovalImpactPreview {
  itemId: string
  itemTitle: string
  affectedSituationLabels: string[]
  removedItemTitles: string[]
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

type CopyState = 'idle' | 'success' | 'error'

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
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-gray-900/40 p-4 no-print">
      <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">新增項目</h2>
            <p className="mt-0.5 text-xs text-gray-500">依第一頁邏輯選擇情境後，系統會自動帶入相關卡片</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-sm text-gray-500 hover:border-gray-300 hover:bg-gray-100"
            aria-label="關閉新增情境視窗"
          >
            ×
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto px-4 py-4">
          {groups.length === 0 && (
            <p className="py-8 text-center text-sm text-gray-400">目前沒有可新增的情境</p>
          )}
          {groups.map((group) => (
            <section key={group.id} className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{group.title}</p>
              <p className="mb-2 text-xs text-gray-400">{group.description}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {group.situations.map((situation) => {
                  const isChecked = pendingSituationIds.includes(situation.id)
                  return (
                    <label
                      key={situation.id}
                      className={[
                        'flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 transition-colors',
                        isChecked
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300',
                      ].join(' ')}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleSituation(situation.id)}
                        data-testid={`add-situation-checkbox-${situation.id}`}
                        className="mt-0.5"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-900">{situation.label}</span>
                        <span className="mt-0.5 block text-xs text-gray-500">{situation.description}</span>
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
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
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
              'rounded px-3 py-1.5 text-xs font-medium transition-colors',
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
  const previewTitles = impact.removedItemTitles.slice(0, 3)
  const hasMore = impact.removedItemTitles.length > previewTitles.length

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900/40 p-4 no-print">
      <div className="w-full max-w-lg rounded-lg border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">確認移除此項目</h2>
          <p className="mt-1 text-xs text-gray-500">{impact.itemTitle}</p>
        </div>

        <div className="space-y-3 px-4 py-3 text-xs text-gray-600">
          <div>
            <p className="mb-1">會一併移除的項目（{impact.removedItemTitles.length}）：</p>
            <ul className="list-disc space-y-0.5 pl-4 text-gray-700">
              {previewTitles.map((title) => (
                <li key={title}>{title}</li>
              ))}
              {hasMore && <li>...</li>}
            </ul>
          </div>

          {impact.hasInputLoss && (
            <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-amber-700">
              此次移除會清除已填寫的資料。
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            data-testid="cancel-remove-item-btn"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            data-testid="confirm-remove-item-btn"
          >
            確認移除
          </button>
        </div>
      </div>
    </div>
  )
}

function ExportPanel({
  groups,
  totalSelected,
}: {
  groups: CategoryGroup[]
  totalSelected: number
}) {
  const [copyState, setCopyState] = useState<CopyState>('idle')

  function getMarkdown() {
    return formatChecklistMarkdown(groups, {
      totalSelected,
      exportTime: new Date().toLocaleString('zh-TW'),
    })
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(getMarkdown())
      setCopyState('success')
      setTimeout(() => setCopyState('idle'), 2000)
    } catch {
      setCopyState('error')
      setTimeout(() => setCopyState('idle'), 3000)
    }
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

  const copyLabel =
    copyState === 'success' ? '已複製！' : copyState === 'error' ? '複製失敗' : '複製清單'

  const copyClass =
    copyState === 'success'
      ? 'bg-green-50 text-green-700 border-green-300'
      : copyState === 'error'
        ? 'bg-red-50 text-red-700 border-red-300'
        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'

  return (
    <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-4">
      <p className="mb-1 text-xs font-medium text-blue-800">匯出清單</p>
      <p className="mb-3 text-xs text-blue-700" data-testid="export-privacy-notice">
        本清單在您的瀏覽器中產生，未上傳至伺服器。下載或複製後，檔案可能包含個人稅務情境，請自行保管。
      </p>
      <div className="no-print flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className={`rounded border px-3 py-1.5 text-xs font-medium transition-colors ${copyClass}`}
          data-testid="copy-checklist-btn"
        >
          {copyLabel}
        </button>
        <button
          type="button"
          onClick={handleDownload}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          data-testid="download-checklist-btn"
        >
          下載 Markdown
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          data-testid="print-checklist-btn"
        >
          列印 / 另存 PDF
        </button>
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
  onAddSituations,
  onRemoveItem,
  onCancelRemoveItem,
  onConfirmRemoveItem,
  scrollToItemId,
  onScrollHandled,
}: Props) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
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

  const isMarriedFiling = selectedSituations.includes('married')

  const grossIncomeTotal = useMemo(() => {
    const inputs = cardInputMap['gross-income'] ?? {}
    const persons = parseGrossIncomePersons(inputs, isMarriedFiling)
    return calcTotalGrossIncome(persons)
  }, [cardInputMap, isMarriedFiling])

  const exemptionAmount = useMemo(() => {
    const inputs = cardInputMap['exemption-general'] ?? {}
    const under70 = Number(inputs['exemption_under70_count'] ?? '') || 0
    const over70 = Number(inputs['exemption_over70_count'] ?? '') || 0
    if (under70 === 0 && over70 === 0) return null
    return under70 * getNumber('exemption_general') + over70 * getNumber('exemption_senior_70')
  }, [cardInputMap])

  const generalDeductionResolved = useMemo(
    () => resolveGeneralDeduction(groups, cardInputMap, isMarriedFiling),
    [groups, cardInputMap, isMarriedFiling],
  )

  const generalDeductionAmount =
    generalDeductionResolved.status === 'pending_itemized' ? null : generalDeductionResolved.amount

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
    return persons.map((p) => ({
      id: p.id,
      label: p.label,
      amount: p.income > 0 ? calcPersonNetIncome(p.income) : null,
    }))
  }, [groups, cardInputMap, isMarriedFiling])

  function handleScrollToSection(categoryId: string) {
    const el = sectionRefs.current[categoryId as CategoryId]
    if (!el) return
    animateScrollToY(el.getBoundingClientRect().top + window.scrollY - 80)
  }

  function getSectionSubtotal(group: CategoryGroup): number | null {
    switch (group.category) {
      case 'gross_income':
        return grossIncomeTotal > 0 ? grossIncomeTotal : null
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
    <div className="mx-auto max-w-4xl px-4 py-8 print-container">
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

      <div className="lg:grid lg:grid-cols-[1fr_260px] lg:gap-6 lg:items-start">
        {/* ── Main column ── */}
        <div>
          <div className="mb-1 flex items-center justify-between gap-3">
            <h1 className="text-xl font-semibold text-gray-900">節稅清單</h1>
            <button
              type="button"
              onClick={openAddModal}
              disabled={!canAddMore}
              data-testid="open-add-situation-modal-btn"
              className={[
                'inline-flex items-center gap-1 rounded border px-3 py-1.5 text-xs font-medium transition-colors',
                canAddMore
                  ? 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100'
                  : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300',
              ].join(' ')}
            >
              <span aria-hidden="true">+</span>
              <span>新增項目</span>
            </button>
          </div>
          <p className="mb-4 text-sm text-gray-500">
            根據您選擇的 {totalSelected} 項情況，找到 {totalItems} 個值得確認的項目。
          </p>

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
                <h2 className="mb-3 border-b border-gray-200 pb-1 text-base font-semibold text-gray-700 flex items-baseline gap-2">
                  <span>{group.label}</span>
                  {(() => {
                    const fItems = getFormulaItems(group)
                    if (fItems && fItems.length > 0) {
                      return (
                        <span className="text-xs font-normal text-gray-400">小計（依公式計算）</span>
                      )
                    }
                    if (
                      group.category === 'general_deductions' &&
                      generalDeductionResolved.status === 'pending_itemized'
                    ) {
                      return (
                        <span className="text-xs font-normal text-gray-400">待填入</span>
                      )
                    }
                    const sub = getSectionSubtotal(group)
                    return sub !== null ? (
                      <span className="text-sm font-semibold text-green-700 tabular-nums">
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
                  />
                )}
                {(() => {
                  const fItems = getFormulaItems(group)
                  return fItems && fItems.length > 0 ? (
                    <div className="mb-4">
                      <FormulaRow items={fItems} />
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
                          removable
                          onInputChange={(fieldId, value) => onCardInputChange(item.id, fieldId, value)}
                          onRemove={() => onRemoveItem?.(item.id)}
                        />
                      ) : (
                        <DeductionCard
                          item={item}
                          inlineFields={ITEM_INLINE_FIELDS[item.id] ?? []}
                          inputValues={cardInputMap[item.id] ?? {}}
                          sourceSituationLabels={itemSourceSituationLabelsById[item.id] ?? []}
                          removable
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

          <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs leading-relaxed text-gray-500">
              <strong className="text-gray-700">使用提醒：</strong>
              本清單協助整理可能適用的申報項目，根據114年度相關法規與官方資料整理。
              正式申報結果及稅負計算請以財政部電子申報系統為準，並視個人情況向稅務機關或記帳士確認。
              {CHECKLIST_USAGE_REMINDER_COMPLEX_ITEMS}
            </p>
          </div>

          {hasResults && (
            <ExportPanel
              groups={groups}
              totalSelected={totalSelected}
            />
          )}
        </div>

        {/* ── Sidebar ── */}
        <aside className="no-print mt-6 lg:mt-0 lg:sticky lg:top-6">
          <TaxSummaryPanel
            grossIncome={grossIncomeTotal > 0 ? grossIncomeTotal : null}
            exemptionAmount={exemptionAmount}
            generalDeductionAmount={generalDeductionAmount}
            specialDeductionAmount={hasSpecialDeductions ? specialDeductionAmount : null}
            hasSpecialDeductions={hasSpecialDeductions}
            onScrollToSection={handleScrollToSection}
          />
        </aside>
      </div>
    </div>
  )
}
