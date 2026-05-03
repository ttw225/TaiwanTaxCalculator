import { useEffect, useRef, useState } from 'react'
import type {
  CardInputMap,
  Situation,
  SituationId,
} from '../types/content'
import type { CategoryGroup } from '../lib/checklist'
import { formatChecklistMarkdown } from '../lib/exportChecklist'
import { getNumber } from '../lib/numbers'
import { animateScrollToY } from '../lib/scrollAnimation'
import { ITEM_INLINE_FIELDS } from '../content/inlineFields'
import { DecisionToolsPanel } from './DecisionToolsPanel'
import { DeductionCard } from './DeductionCard'

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
  onOpenPersonalized: () => void
  onReset?: () => void
  onAddSituations?: (ids: SituationId[]) => void
  onRemoveItem?: (itemId: string) => void
  onCancelRemoveItem?: () => void
  onConfirmRemoveItem?: () => void
  scrollToItemId?: string | null
  onScrollHandled?: () => void
}

const STANDARD_DEDUCTION_SOURCE = {
  label: '114年度申報書說明',
  authority: '財政部電子申報繳稅服務網',
  url: 'https://download.tax.nat.gov.tw/irx/doc/114%E5%B9%B4%E5%BA%A6%E7%B6%9C%E5%90%88%E6%89%80%E5%BE%97%E7%A8%85%E7%B5%90%E7%AE%97%E7%94%B3%E5%A0%B1%E6%9B%B8%E8%AA%AA%E6%98%8E.pdf',
}

const ITEMIZED_EDUCATION_ITEM_IDS = new Set([
  'donations-deduction',
  'insurance-deduction',
  'medical-deduction',
  'mortgage-interest-deduction',
])

function formatTwd(value: number) {
  return value.toLocaleString('zh-TW')
}

function StandardItemizedEducationPanel({
  groups,
  selectedSituations,
}: {
  groups: CategoryGroup[]
  selectedSituations: SituationId[]
}) {
  const isMarried = selectedSituations.includes('married')
  const baselineKey = isMarried ? 'standard_deduction_married' : 'standard_deduction_single'
  const baselineLabel = isMarried ? '配偶合併申報標準扣除額' : '單身標準扣除額'
  const baselineAmount = formatTwd(getNumber(baselineKey))
  const itemizedItems = groups
    .flatMap((group) => group.items)
    .filter((item) => ITEMIZED_EDUCATION_ITEM_IDS.has(item.id) && item.documents_to_prepare.length > 0)

  return (
    <section className="mb-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4" data-testid="standard-itemized-panel">
      <div className="mb-3 flex items-start gap-2">
        <div className="flex-1">
          <p className="text-xs font-medium text-yellow-800">標準扣除 vs 列舉扣除</p>
          <h2 className="mt-1 text-base font-semibold text-gray-900">先用標準扣除額當文件準備基準</h2>
        </div>
        <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
          建議確認
        </span>
      </div>

      <p className="text-sm text-gray-700">
        114年度{baselineLabel}為 <strong className="font-semibold text-gray-900">{baselineAmount} 元</strong>。
        標準扣除額與列舉扣除額只能擇一使用；這裡只協助整理可能要準備的列舉文件，不計算或宣稱哪一種較適合。
      </p>

      <div className="mt-3 rounded border border-yellow-100 bg-white/70 p-3">
        <p className="text-xs font-medium text-gray-600">已選情境的列舉文件提示</p>
        {itemizedItems.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {itemizedItems.map((item) => (
              <li key={item.id} className="text-xs text-gray-700">
                <span className="font-medium text-gray-800">{item.title}：</span>
                {item.documents_to_prepare.join('、')}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-xs text-gray-500">目前沒有選到列舉扣除相關情境，因此尚無列舉文件提示。</p>
        )}
      </div>

      <div className="mt-3 border-t border-yellow-100 pt-3">
        <p className="text-xs text-yellow-800">
          申報提醒：列舉是否適用、可扣除金額與最終申報結果，請以財政部電子申報系統及官方資料確認。
        </p>
        <p className="mt-1 text-xs text-gray-500">
          來源：
          <a
            href={STANDARD_DEDUCTION_SOURCE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 underline underline-offset-2 hover:text-gray-800"
          >
            {STANDARD_DEDUCTION_SOURCE.label}
          </a>
          <span className="text-gray-400"> · {STANDARD_DEDUCTION_SOURCE.authority}</span>
        </p>
      </div>
    </section>
  )
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
  onOpenPersonalized,
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 print-container">
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

      <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 no-print">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-emerald-800">個人化工作表</p>
            <p className="mt-1 text-xs text-gray-600">需要進一步整理個人資料時，可到獨立頁面產生行動報告。</p>
          </div>
          <button
            type="button"
            onClick={onOpenPersonalized}
            className="rounded border border-emerald-300 bg-white px-3 py-1.5 text-xs font-medium text-emerald-800 transition-colors hover:bg-emerald-100"
            data-testid="open-personalized-page-btn"
          >
            開啟工作表
          </button>
        </div>
      </div>

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
            <h2 className="mb-3 border-b border-gray-200 pb-1 text-base font-semibold text-gray-700">
              {group.label}
            </h2>
            {group.category === 'general_deductions' && (
              <StandardItemizedEducationPanel groups={groups} selectedSituations={selectedSituations} />
            )}
            <div className="space-y-3">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  ref={(element) => {
                    itemRefs.current[item.id] = element
                  }}
                  data-testid={`checklist-item-${item.id}`}
                >
                  <DeductionCard
                    item={item}
                    inlineFields={ITEM_INLINE_FIELDS[item.id] ?? []}
                    inputValues={cardInputMap[item.id] ?? {}}
                    sourceSituationLabels={itemSourceSituationLabelsById[item.id] ?? []}
                    removable
                    onInputChange={(fieldId, value) => onCardInputChange(item.id, fieldId, value)}
                    onRemove={() => onRemoveItem?.(item.id)}
                  />
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
          標示「需進一步確認」的項目因規定複雜或有排富條款，建議諮詢後再決定是否申報。
        </p>
      </div>

      {hasResults && (
        <ExportPanel
          groups={groups}
          totalSelected={totalSelected}
        />
      )}
    </div>
  )
}
