import type { CardInputMap, SituationId } from '../../types/content'
import type { CategoryGroup } from '../../lib/checklist'
import { getItemizedItemAmount, ITEMIZED_ITEM_IDS } from '../../lib/generalDeductionEffective'
import { getNumber } from '../../lib/numbers'
import { FormulaRow } from './FormulaRow'

// ── Constants ─────────────────────────────────────────────────────────────────

const ITEMIZED_ITEM_META: Record<string, { label: string }> = {
  'donations-deduction': { label: '捐贈' },
  'insurance-deduction': { label: '保險費' },
  'medical-deduction': { label: '醫療費' },
  'mortgage-interest-deduction': { label: '房貸利息' },
}

const SOURCE = {
  label: '114年度申報書說明',
  authority: '財政部電子申報繳稅服務網',
  url: 'https://download.tax.nat.gov.tw/irx/doc/114%E5%B9%B4%E5%BA%A6%E7%B6%9C%E5%90%88%E6%89%80%E5%BE%97%E7%A8%85%E7%B5%90%E7%AE%97%E7%94%B3%E5%A0%B1%E6%9B%B8%E8%AA%AA%E6%98%8E.pdf',
}

const PANEL_SHELL_CLASS =
  'mb-6 rounded-lg border border-gray-200 bg-gray-50 p-4'

// ── Sub-components ────────────────────────────────────────────────────────────

function Verdict({
  standardAmount,
  itemizedTotal,
  unfilledCount,
  anyFilled,
}: {
  standardAmount: number
  itemizedTotal: number
  unfilledCount: number
  anyFilled: boolean
}) {
  const allFilled = unfilledCount === 0 && anyFilled

  if (allFilled) {
    if (itemizedTotal > standardAmount) {
      return (
        <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
          推薦：列舉扣除（列舉扣除 {'>'} 標準扣除）
        </span>
      )
    }
    if (itemizedTotal === standardAmount) {
      return (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
          兩者皆可（金額相同）
        </span>
      )
    }
    return (
      <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
        推薦：標準扣除（標準扣除 {'>'} 列舉扣除）
      </span>
    )
  }

  if (anyFilled) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
        列舉尚有 {unfilledCount} 項未填
      </span>
    )
  }

  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
      填入列舉金額後可比較
    </span>
  )
}

function SourceFooter() {
  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="text-xs text-yellow-800">
        申報提醒：列舉是否適用、可扣除金額與最終申報結果，請以財政部電子申報系統及官方資料確認。
      </p>
      <p className="mt-1 text-xs text-gray-500">
        來源：
        <a
          href={SOURCE.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-600 underline underline-offset-2 hover:text-gray-800"
        >
          {SOURCE.label}
        </a>
        <span className="text-gray-400"> · {SOURCE.authority}</span>
      </p>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  groups: CategoryGroup[]
  selectedSituations: SituationId[]
  cardInputMap: CardInputMap
}

export function StandardItemizedPanel({ groups, selectedSituations, cardInputMap }: Props) {
  const isMarried = selectedSituations.includes('married')
  const standardKey = isMarried ? 'standard_deduction_married' : 'standard_deduction_single'
  const standardAmount = getNumber(standardKey)

  const presentItems = groups
    .flatMap((g) => g.items)
    .filter((item) => ITEMIZED_ITEM_IDS.has(item.id))

  // No itemized items in checklist → show standard deduction only
  if (presentItems.length === 0) {
    return (
      <section className={PANEL_SHELL_CLASS} data-testid="standard-itemized-panel">
        <div className="mb-3">
          <span className="inline-flex items-center rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
            推薦：標準扣除
          </span>
        </div>
        <p className="text-base text-gray-700">
          114年度標準扣除額為{' '}
          <strong className="font-semibold text-gray-900">
            {standardAmount.toLocaleString('zh-TW')} 元
          </strong>
          。目前清單中沒有列舉扣除相關項目，適用標準扣除額。
        </p>
        <SourceFooter />
      </section>
    )
  }

  // Build formula row items
  const formulaItems = presentItems.map((item) => ({
    id: item.id,
    label: ITEMIZED_ITEM_META[item.id]?.label ?? item.title,
    amount: getItemizedItemAmount(item.id, cardInputMap[item.id] ?? {}),
  }))

  const filledItems = formulaItems.filter((i) => i.amount !== null)
  const unfilledCount = formulaItems.length - filledItems.length
  const itemizedTotal = filledItems.reduce((s, i) => s + (i.amount ?? 0), 0)
  const anyFilled = filledItems.length > 0

  return (
    <section className={PANEL_SHELL_CLASS} data-testid="standard-itemized-panel">
      <div className="mb-3">
        <Verdict
          standardAmount={standardAmount}
          itemizedTotal={itemizedTotal}
          unfilledCount={unfilledCount}
          anyFilled={anyFilled}
        />
      </div>

      <div className="space-y-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            標準扣除額
          </p>
          <div className="rounded-lg border border-gray-200 px-4 py-3">
            <p className="mb-2 text-center text-[11px] font-semibold text-gray-600">
              {isMarried ? '配偶合併申報' : '單身申報'}
            </p>
            <p className="text-center text-base font-bold tabular-nums text-gray-800">
              {standardAmount.toLocaleString('zh-TW')}
              <span className="text-[10px] font-normal text-gray-500"> 元</span>
            </p>
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            列舉扣除額
          </p>
          <FormulaRow items={formulaItems} />
        </div>
      </div>

      <SourceFooter />
    </section>
  )
}
