import { Fragment, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { calcTax, getBrackets } from '../lib/numbers'
import type { TaxScenario, TaxScenarioResult } from '../lib/taxScenarios'
import { Card, CardBody, CardHeader } from './ui/Card'

interface Props {
  grossIncome: number | null
  grossIncomePendingCalculation?: boolean
  taxScenarioResult?: TaxScenarioResult | null
  /** When true, show a navigational row (no amount) after gross income */
  hasOverseasIncomeSection?: boolean
  exemptionAmount: number | null
  /** null when itemized cards exist but amounts are not all filled */
  generalDeductionAmount: number | null
  generalDeductionMethod?: 'standard' | 'itemized' | null
  specialDeductionAmount: number | null
  basicLivingExpenseDifference: number | null
  hasSpecialDeductions: boolean
  onScrollToSection?: (categoryId: string) => void
  printMode?: boolean
}

function fmt(n: number) {
  return n.toLocaleString('zh-TW')
}

function GoFill({ sectionId, onScroll }: { sectionId: string; onScroll?: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onScroll?.(sectionId)}
      data-padding="custom"
      className="inline-flex items-baseline p-0 text-base font-semibold leading-6 text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 transition-colors shrink-0"
    >
      前往填寫
    </button>
  )
}

function SummarySectionLink({
  sectionId,
  onScroll,
  children,
}: {
  sectionId: string
  onScroll?: (id: string) => void
  children: ReactNode
}) {
  return (
    <a
      href={`#${sectionId}`}
      onClick={(event) => {
        if (!onScroll) return
        event.preventDefault()
        onScroll(sectionId)
      }}
      className="inline-flex items-center gap-0.5 text-gray-600 hover:text-gray-800 hover:underline underline-offset-2"
    >
      {children}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0 text-gray-400"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </a>
  )
}

function SummaryRow({
  label,
  value,
  isDeduction = false,
  missing = false,
  pendingCalculation = false,
  sectionId,
  onScroll,
}: {
  label: ReactNode
  value: number | null
  isDeduction?: boolean
  missing?: boolean
  pendingCalculation?: boolean
  sectionId: string
  onScroll?: (id: string) => void
}) {
  const hasVal = value !== null && !missing
  return (
    <div
      className="flex min-h-6 items-baseline justify-between gap-2"
      data-testid={`summary-row-${sectionId}`}
    >
      <span className={`text-base shrink-0 ${hasVal ? 'text-gray-700' : 'text-muted'}`}>
        {label}
      </span>
      <span className="inline-flex min-h-6 shrink-0 items-baseline leading-6">
        {pendingCalculation ? (
          <span className="text-sm text-muted shrink-0">待計算</span>
        ) : missing ? (
          <GoFill sectionId={sectionId} onScroll={onScroll} />
        ) : hasVal ? (
          <span className="text-base font-semibold leading-6 tabular-nums text-gray-800">
            {isDeduction && value! > 0 ? '−' : ''}{fmt(value!)} 元
          </span>
        ) : (
          <span className="text-base leading-6 text-gray-200">—</span>
        )}
      </span>
    </div>
  )
}

function TaxFormulaDialog({
  scenarioResult,
  onClose,
}: {
  scenarioResult?: TaxScenarioResult | null
  onClose: () => void
}) {

  const dialog = (
    <div
      data-testid="tax-formula-dialog-overlay"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 p-4 no-print"
    >
      <div
        data-testid="tax-formula-dialog"
        className="w-full max-w-2xl flex flex-col max-h-[calc(100dvh-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">
            {scenarioResult ? '稅額組合試算明細' : '「所得稅應納稅額」公式'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-sm text-gray-500 hover:border-gray-300 hover:bg-gray-100"
          >
            ×
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4">
          {scenarioResult ? (
            <div className="space-y-4">
              <p className="text-base leading-relaxed text-gray-700">
                以下列出本頁已填資料可展開的全部組合。
                {scenarioResult.hasOverseasIncome && (
                  <>
                    海外所得 AMT 不是可選方案；
                    若基本稅額高於一般稅額，會加上 AMT 補稅後再排序。
                  </>
                )}
              </p>
              {scenarioResult.scenarios.map((scenario) => {
                const isBest = scenario.id === scenarioResult.bestScenario.id
                return (
                  <section
                    key={scenario.id}
                    className={`rounded-lg border px-3 py-3 ${isBest ? 'border-blue-300 bg-blue-50/60' : 'border-gray-200 bg-white'}`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className={`text-sm font-semibold ${isBest ? 'text-blue-900' : 'text-gray-900'}`}>
                        {scenario.title}
                      </h3>
                      {isBest && (
                        <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-xs font-semibold text-white">
                          最低
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      {scenario.formulas.map((line, index) => (
                        <div key={`${scenario.id}-${index}`} className="grid grid-cols-[6.5rem_1fr_auto] gap-2 text-sm">
                          <span className="text-gray-500">{line.label}</span>
                          <span className="text-gray-600">{line.expression}</span>
                          <span className={`tabular-nums font-semibold ${line.amount < 0 ? 'text-green-700' : 'text-gray-900'}`}>
                            {fmt(line.amount)} 元
                          </span>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-500">
                      假設：{scenario.assumptions.join('；')}
                    </p>
                  </section>
                )
              })}
            </div>
          ) : (
            <>
              <div className="mb-4 space-y-1 text-base text-gray-700">
                <p>
                  所得淨額：<span className="font-semibold text-gray-900">綜合所得總額 − 免稅額 − 一般扣除額 − 特別扣除額 − 基本生活費差額</span>
                </p>
                <p>
                  應納稅額：<span className="font-semibold text-gray-900">所得淨額 × 稅率 − 累進差額</span>
                </p>
              </div>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <table className="w-full border-collapse text-base">
                  <thead className="relative z-20">
                    <tr className="bg-gray-50 text-sm uppercase tracking-wide text-gray-500">
                      <th className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-left font-medium first:rounded-tl-xl last:rounded-tr-xl">綜合所得淨額區間</th>
                      <th className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-left font-medium first:rounded-tl-xl last:rounded-tr-xl">稅率</th>
                      <th className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-left font-medium first:rounded-tl-xl last:rounded-tr-xl">累進差額</th>
                    </tr>
                  </thead>
                  <tbody className="relative z-0 [&_tr+tr_td]:border-t [&_tr+tr_td]:border-gray-200">
                    {getBrackets().map((b, i) => {
                      const prev = getBrackets()[i - 1]
                      const from = i === 0 ? '0' : fmt((prev.up_to ?? 0) + 1)
                      const fromLabel = from
                      const toLabel = b.up_to ? `${fmt(b.up_to)} 元` : '元以上'
                      return (
                        <tr key={i} className="bg-white">
                          <td className="px-4 py-3 align-middle font-medium text-gray-700">
                            <span className="inline-grid grid-cols-[9ch_auto_11ch] items-baseline gap-x-2 tabular-nums">
                              <span className="text-right">{fromLabel}</span>
                              <span className="text-center">{b.up_to ? '–' : ''}</span>
                              <span className={b.up_to ? 'text-right' : 'text-left'}>{toLabel}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 align-middle text-left font-semibold text-gray-900">
                            {(b.rate * 100).toFixed(0)}%
                          </td>
                          <td className="px-4 py-3 align-middle text-left font-semibold text-red-700 tabular-nums">
                            {fmt(b.quick_deduction)} 元
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}

// ── Scenario combinations dialog (Direction A) ──────────────────────────────

type SortCol = 'couple' | 'coupleType' | 'dividend' | 'finalTax'

const COUPLE_TYPE_MAP: Record<string, string> = {
  single: '合併計稅',
  joint: '合併計稅',
  self_salary_separate: '分開計稅',
  spouse_salary_separate: '分開計稅',
  self_all_income_separate: '分開計稅',
  spouse_all_income_separate: '分開計稅',
}

function SortIndicator({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: 'asc' | 'desc' }) {
  if (sortCol === col) {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"
        className="inline-block ml-0.5 shrink-0 text-blue-600"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        {sortDir === 'asc'
          ? <path d="M2 7l3-4 3 4" />
          : <path d="M2 3l3 4 3-4" />
        }
      </svg>
    )
  }
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"
      className="inline-block ml-0.5 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity"
      fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M2 4l3-3 3 3M2 6l3 3 3-3" />
    </svg>
  )
}

const COUPLE_LABEL_MAP: Record<string, string> = {
  single: '單身申報',
  joint: '夫妻所得合併計稅',
  self_salary_separate: '本人薪資所得分開計稅',
  spouse_salary_separate: '配偶薪資所得分開計稅',
  self_all_income_separate: '本人各類所得分開計稅',
  spouse_all_income_separate: '配偶各類所得分開計稅',
}

const DIVIDEND_LABEL_MAP: Record<string, string | null> = {
  none: null,
  merged: '股利合併計稅',
  separate_28: '股利分開計稅',
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform text-gray-400 ${open ? 'rotate-180' : ''}`}
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

function StructureHint({ includeAmt }: { includeAmt: boolean }) {
  return (
    <div className="mb-2 rounded-lg border border-gray-200 bg-white px-3 py-2 font-mono text-base text-gray-600">
      {includeAmt && (
        <div>
          <span className="text-gray-400">最終稅額 =</span>{' '}
          一般稅額 <span className="text-gray-400">+</span> AMT 補稅
        </div>
      )}
      <div className="pl-4">
        <span className="text-gray-400">一般稅額 =</span>{' '}
        所得稅額 <span className="text-gray-400">−</span>{' '}
        股利可抵減稅額 <span className="text-gray-400">+</span> 股利分開計稅稅額
      </div>
    </div>
  )
}

function FormulaTable({ scenario }: { scenario: TaxScenario }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
      <div className="space-y-0.5">
        {scenario.formulas.map((line, i) => (
          <div key={`ft-${i}`} className="grid grid-cols-[7.5rem_1fr_auto] items-baseline gap-3 py-1 text-base">
            <span className="leading-snug text-gray-500">{line.label}</span>
            <span className="font-mono text-base leading-snug text-gray-500">{line.expression}</span>
            <span className={`tabular-nums font-semibold ${line.amount < 0 ? 'text-emerald-700' : 'text-gray-900'}`}>
              {line.amount < 0 ? '−' : ''}{fmt(Math.abs(line.amount))} 元
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 border-t border-dashed border-gray-200 pt-2 text-base leading-relaxed text-gray-500">
        假設：{scenario.assumptions.join('；')}
      </p>
    </div>
  )
}

function TaxScenarioCombinationsDialog({
  scenarioResult,
  onClose,
  onOpenFormula,
}: {
  scenarioResult: TaxScenarioResult
  onClose: () => void
  onOpenFormula: () => void
}) {
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({})
  const [sortCol, setSortCol] = useState<SortCol>('finalTax')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const handleSort = (col: SortCol) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  const sortedScenarios = [...scenarioResult.scenarios].sort((a, b) => {
    const cmp =
      sortCol === 'couple'
        ? (COUPLE_LABEL_MAP[a.coupleMode] ?? '').localeCompare(COUPLE_LABEL_MAP[b.coupleMode] ?? '', 'zh-TW')
        : sortCol === 'coupleType'
          ? (COUPLE_TYPE_MAP[a.coupleMode] ?? '').localeCompare(COUPLE_TYPE_MAP[b.coupleMode] ?? '', 'zh-TW')
          : sortCol === 'dividend'
            ? (DIVIDEND_LABEL_MAP[a.dividendMode] ?? '').localeCompare(DIVIDEND_LABEL_MAP[b.dividendMode] ?? '', 'zh-TW')
            : a.finalTax - b.finalTax
    return sortDir === 'asc' ? cmp : -cmp
  })

  const toggleRow = (id: string) => {
    setOpenRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const bestId = scenarioResult.bestScenario.id
  // 申報組合 + 計稅方式 (always) + 股利申報方式 (conditional) + 最終稅額 + chevron
  const colCount = scenarioResult.hasDividend ? 5 : 4

  const dialog = (
    <div
      data-testid="tax-scenario-combinations-dialog-overlay"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-gray-900/40 p-0 sm:p-4 no-print"
    >
      <div
        data-testid="tax-scenario-combinations-dialog"
        className="w-full flex flex-col
          h-[calc(100dvh-2rem)] sm:h-[min(560px,calc(100dvh-2rem))] md:h-[min(640px,calc(100dvh-2rem))] lg:h-[min(720px,calc(100dvh-2rem))]
          rounded-t-xl sm:rounded-xl
          sm:max-w-2xl md:max-w-3xl lg:max-w-5xl
          border border-gray-200 bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">稅額組合試算明細</h2>
            <p className="mt-1 text-base leading-relaxed text-gray-500">
              共 {scenarioResult.scenarios.length} 種組合，依最終稅額由低至高排序。
              {scenarioResult.hasOverseasIncome && (
                <>
                  海外所得未達門檻時 AMT 不影響排序；否則補稅金額已計入最終稅額。
                </>
              )}
              {' '}
              <a
                href="#tax-formula-detail"
                onClick={(e) => { e.preventDefault(); onOpenFormula() }}
                className="inline text-gray-600 hover:text-gray-800 hover:underline underline-offset-2"
              >
                了解更多
              </a>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-sm text-gray-500 hover:border-gray-300 hover:bg-gray-100"
          >
            ×
          </button>
        </div>

        {/* Body — overflow-y-auto is the sticky anchor; overflow-x-auto handles narrow viewports */}
        <div className="flex-1 min-h-0 px-4 py-4">
          <div className="h-full min-h-0 overflow-y-auto overflow-x-auto">
            <div className="min-w-[540px] overflow-hidden rounded-xl border border-gray-200 bg-white">
              <table className="w-full border-separate border-spacing-0 text-base">
                <thead className="relative z-20">
                  <tr className="bg-gray-50 text-sm uppercase tracking-wide text-gray-500">
                  <th
                    onClick={() => handleSort('couple')}
                    className="group sticky top-0 z-20 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-left font-medium cursor-pointer select-none first:rounded-tl-xl last:rounded-tr-xl focus:outline-none hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    申報組合<SortIndicator col="couple" sortCol={sortCol} sortDir={sortDir} />
                  </th>
                  <th
                    onClick={() => handleSort('coupleType')}
                    className="group sticky top-0 z-20 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-left font-medium cursor-pointer select-none first:rounded-tl-xl last:rounded-tr-xl focus:outline-none hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    計稅方式<SortIndicator col="coupleType" sortCol={sortCol} sortDir={sortDir} />
                  </th>
                  {scenarioResult.hasDividend && (
                    <th
                      onClick={() => handleSort('dividend')}
                      className="group sticky top-0 z-20 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-left font-medium cursor-pointer select-none first:rounded-tl-xl last:rounded-tr-xl focus:outline-none hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      股利申報方式<SortIndicator col="dividend" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                  )}
                  <th
                    onClick={() => handleSort('finalTax')}
                    className="group sticky top-0 z-20 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-right font-medium cursor-pointer select-none first:rounded-tl-xl last:rounded-tr-xl focus:outline-none hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    最終稅額<SortIndicator col="finalTax" sortCol={sortCol} sortDir={sortDir} />
                  </th>
                    <th className="sticky top-0 z-20 w-9 border-b border-gray-200 bg-gray-50 px-2 py-2.5 first:rounded-tl-xl last:rounded-tr-xl" />
                  </tr>
                </thead>
                <tbody className="relative z-0 [&_tr+tr_td]:border-t [&_tr+tr_td]:border-gray-200">
                  {sortedScenarios.map((scenario) => {
                  const isBest = scenario.id === bestId
                  const isOpen = !!openRows[scenario.id]
                  const coupleLabel = COUPLE_LABEL_MAP[scenario.coupleMode] ?? scenario.coupleMode
                  const coupleType = COUPLE_TYPE_MAP[scenario.coupleMode] ?? '—'
                  const dividendLabel = DIVIDEND_LABEL_MAP[scenario.dividendMode] ?? null
                  return (
                    <Fragment key={scenario.id}>
                      <tr
                        onClick={() => toggleRow(scenario.id)}
                        className={`relative z-0 cursor-pointer border-gray-200 transition-colors ${
                          isBest ? 'bg-blue-50/60 hover:bg-blue-50' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 align-middle">
                          <div>
                            <div className={`flex items-center gap-1.5 font-medium leading-snug ${isBest ? 'text-blue-900' : 'text-gray-900'}`}>
                              {coupleLabel}
                              {isBest && (
                                <span className="inline-flex shrink-0 items-center rounded-full bg-blue-600 px-2 py-0.5 text-sm font-semibold text-white">
                                  推薦
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle text-gray-600">
                          {coupleType}
                        </td>
                        {scenarioResult.hasDividend && (
                          <td className="px-4 py-3 align-middle">
                            {dividendLabel
                              ? <span className="text-gray-600">{dividendLabel}</span>
                              : <span className="text-gray-300">—</span>
                            }
                          </td>
                        )}
                        <td className="px-4 py-3 text-right align-middle">
                          <span className={`tabular-nums font-semibold ${isBest ? 'text-base text-blue-900' : 'text-gray-900'}`}>
                            {fmt(scenario.finalTax)}
                          </span>
                          <span className="ml-0.5 text-[11px] text-gray-500">元</span>
                        </td>
                        <td className="px-2 py-3 text-right align-middle">
                          <ChevronIcon open={isOpen} />
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className={`relative z-0 border-gray-200 ${isBest ? 'bg-blue-50/30' : 'bg-gray-50/40'}`}>
                          <td colSpan={colCount} className="px-4 pb-4 pt-1.5">
                            <StructureHint includeAmt={scenarioResult.hasOverseasIncome} />
                            <FormulaTable scenario={scenario} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-4 py-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            關閉
          </button>
        </div>

      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}


interface SummaryBodyProps {
  grossIncome: number | null
  exemptionAmount: number | null
  generalDeductionAmount: number | null
  generalDeductionMethod?: 'standard' | 'itemized' | null
  specialDeductionAmount: number | null
  basicLivingExpenseDifference: number | null
  hasSpecialDeductions: boolean
  grossIncomePendingCalculation?: boolean
  hasOverseasIncomeSection?: boolean
  netIncome: number | null
  taxAmount: number | null
  bracket: ReturnType<typeof getBrackets>[number] | null
  taxScenarioResult?: TaxScenarioResult | null
  onScrollToSection?: (categoryId: string) => void
  onOpenDialog?: () => void
  onOpenScenarioDialog?: () => void
}

function TaxSummaryBody({
  grossIncome,
  exemptionAmount,
  generalDeductionAmount,
  generalDeductionMethod,
  specialDeductionAmount,
  basicLivingExpenseDifference,
  hasSpecialDeductions,
  grossIncomePendingCalculation = false,
  hasOverseasIncomeSection = false,
  netIncome,
  taxAmount,
  bracket,
  taxScenarioResult,
  onScrollToSection,
  onOpenDialog,
  onOpenScenarioDialog,
}: SummaryBodyProps) {
  const grossMissing = grossIncome === null && !grossIncomePendingCalculation
  const exemptMissing = exemptionAmount === null
  const generalMissing = generalDeductionAmount === null
  const specialMissing = hasSpecialDeductions && specialDeductionAmount === null
  const basicLivingMissing = basicLivingExpenseDifference === null

  return (
    <>
      {/* Calculation rows */}
      <CardBody variant="summary" className="space-y-2.5">
        <SummaryRow
          label={(
            <SummarySectionLink sectionId="gross_income" onScroll={onScrollToSection}>
              綜合所得總額
            </SummarySectionLink>
          )}
          value={grossIncome}
          missing={grossMissing}
          pendingCalculation={grossIncomePendingCalculation}
          sectionId="gross_income"
          onScroll={onScrollToSection}
        />
        {hasOverseasIncomeSection && (
          <SummaryRow
            label={(
              <SummarySectionLink sectionId="overseas_income" onScroll={onScrollToSection}>
                海外所得
              </SummarySectionLink>
            )}
            value={null}
            sectionId="overseas_income"
            onScroll={onScrollToSection}
          />
        )}
        <SummaryRow
          label={(
            <SummarySectionLink sectionId="exemptions" onScroll={onScrollToSection}>
              免稅額
            </SummarySectionLink>
          )}
          value={exemptionAmount}
          isDeduction
          missing={exemptMissing}
          sectionId="exemptions"
          onScroll={onScrollToSection}
        />
        <SummaryRow
          label={(
            <span className="inline-flex items-center gap-2">
              <SummarySectionLink sectionId="general_deductions" onScroll={onScrollToSection}>
                一般扣除額
              </SummarySectionLink>
              {generalDeductionMethod && (
                <span
                  data-testid="general-deduction-method-label"
                  className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-sm font-semibold text-blue-800"
                >
                  {generalDeductionMethod === 'itemized' ? '列舉' : '標準'}
                </span>
              )}
            </span>
          )}
          value={generalDeductionAmount}
          isDeduction
          missing={generalMissing}
          sectionId="general_deductions"
          onScroll={onScrollToSection}
        />
        {hasSpecialDeductions && (
          <SummaryRow
            label={(
              <SummarySectionLink sectionId="special_deductions" onScroll={onScrollToSection}>
                特別扣除額
              </SummarySectionLink>
            )}
            value={specialDeductionAmount}
            isDeduction
            missing={specialMissing}
            sectionId="special_deductions"
            onScroll={onScrollToSection}
          />
        )}
        <SummaryRow
          label="基本生活費差額"
          value={basicLivingExpenseDifference}
          isDeduction
          pendingCalculation={basicLivingMissing}
          sectionId="basic_living_expense"
        />

        {/* Divider + net income */}
        <div className="border-t border-dashed border-gray-200 pt-2.5 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`text-base font-medium shrink-0 ${netIncome !== null ? 'text-gray-700' : 'text-muted'}`}>
              所得淨額
            </span>
            {netIncome !== null ? (
              <span className="text-base font-bold tabular-nums text-gray-900">{fmt(netIncome)} 元</span>
            ) : (
              <span className="text-base text-muted">待計算</span>
            )}
          </div>

          {!taxScenarioResult && (
            /* Tax label + detail dialog */
            <div className="flex items-baseline gap-1.5">
              <span className="text-base text-gray-500 shrink-0">所得稅應納稅額</span>
              {onOpenDialog && (
                <span className="shrink-0 text-sm text-muted">
                  <span aria-hidden>(</span>
                  <a
                    href="#tax-formula-detail"
                    onClick={(event) => {
                      event.preventDefault()
                      onOpenDialog()
                    }}
                    className="inline p-0 m-0 border-0 bg-transparent font-inherit text-sm text-gray-600 hover:text-gray-800 hover:underline underline-offset-2 transition-colors leading-none align-baseline"
                  >
                    了解更多
                  </a>
                  <span aria-hidden>)</span>
                </span>
              )}
            </div>
          )}

          {/* Bracket formula */}
          {!taxScenarioResult && (
            <div className="pl-2 space-y-0.5 border-l-2 border-gray-100">
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-base text-gray-400">× 稅率</span>
                <span className="text-base font-semibold text-gray-500 tabular-nums">
                  {bracket ? `${(bracket.rate * 100).toFixed(0)}%` : '—'}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-1">
                <span className="text-base text-gray-400">− 累進差額</span>
                <span className="text-base font-semibold text-gray-500 tabular-nums">
                  {bracket ? `${fmt(bracket.quick_deduction)} 元` : '—'}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardBody>

      {/* Tax amount card */}
      <div
        className={`mx-3 mb-3 rounded-xl border px-3 py-2.5 transition-all ${
          taxAmount !== null
            ? 'border-blue-200 bg-blue-50'
            : 'border-dashed border-gray-200 bg-gray-50'
        }`}
      >
        {taxScenarioResult && onOpenScenarioDialog && (
          <div className="mb-1.5 text-base text-blue-800">
            {taxScenarioResult.scenarios.length > 1 && (
              <span className="font-semibold">推薦：</span>
            )}
            <span className="font-semibold">{taxScenarioResult.bestScenario.title}</span>
            {' '}
            <a
              href="#tax-scenario-detail"
              onClick={(e) => { e.preventDefault(); onOpenScenarioDialog() }}
              className="text-sm text-gray-500 hover:text-gray-700 hover:underline underline-offset-2"
            >
              查看詳情
            </a>
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className={`text-base font-semibold ${taxAmount !== null ? 'text-blue-800' : 'text-muted'}`}>
            {taxScenarioResult ? '應繳納稅額' : '應納稅額'}
          </span>
          {taxAmount !== null ? (
            <span className="text-base font-bold tabular-nums text-blue-700">{fmt(taxAmount)} 元</span>
          ) : (
            <span className="text-base text-muted">待計算</span>
          )}
        </div>
      </div>
    </>
  )
}

export function TaxSummaryPanel({
  grossIncome,
  grossIncomePendingCalculation = false,
  taxScenarioResult = null,
  hasOverseasIncomeSection = false,
  exemptionAmount,
  generalDeductionAmount,
  generalDeductionMethod,
  specialDeductionAmount,
  basicLivingExpenseDifference,
  hasSpecialDeductions,
  onScrollToSection,
  printMode = false,
}: Props) {
  const [dialogState, setDialogState] = useState<null | 'scenario' | 'formula'>(null)

  useEffect(() => {
    if (dialogState !== null) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [dialogState])

  const displayGrossIncome = taxScenarioResult?.bestScenario.grossIncome ?? grossIncome
  const baseNetIncome =
    grossIncome !== null &&
    exemptionAmount !== null &&
    generalDeductionAmount !== null &&
    basicLivingExpenseDifference !== null &&
    (!hasSpecialDeductions || specialDeductionAmount !== null)
      ? Math.max(
          0,
          grossIncome
            - exemptionAmount
            - generalDeductionAmount
            - (hasSpecialDeductions ? (specialDeductionAmount ?? 0) : 0)
            - basicLivingExpenseDifference,
        )
      : null
  const netIncome = taxScenarioResult?.bestScenario.taxableIncome ?? baseNetIncome

  const taxAmount = taxScenarioResult?.bestScenario.finalTax ?? (netIncome !== null ? calcTax(netIncome) : null)
  const bracket =
    netIncome !== null
      ? (getBrackets().find((b) => b.up_to === null || netIncome <= b.up_to) ?? null)
      : null

  return (
    <div>
      {!printMode && (dialogState === 'scenario' || dialogState === 'formula') && taxScenarioResult && (
        <TaxScenarioCombinationsDialog
          scenarioResult={taxScenarioResult}
          onClose={() => setDialogState(null)}
          onOpenFormula={() => setDialogState('formula')}
        />
      )}
      {!printMode && dialogState === 'formula' && (
        <TaxFormulaDialog
          scenarioResult={null}
          onClose={() => setDialogState('scenario')}
        />
      )}

      <Card variant="summary" className="print-summary-card">
        {/* Header */}
        <CardHeader variant="summary" className="border-b-0">
          <h3 className="text-lg font-semibold uppercase tracking-wide text-gray-700">
            節稅試算摘要
          </h3>
        </CardHeader>
        <div className="mx-4 border-b border-gray-100" />

        <TaxSummaryBody
          grossIncome={displayGrossIncome}
          grossIncomePendingCalculation={grossIncomePendingCalculation && !taxScenarioResult}
          hasOverseasIncomeSection={hasOverseasIncomeSection}
          exemptionAmount={exemptionAmount}
          generalDeductionAmount={generalDeductionAmount}
          generalDeductionMethod={generalDeductionMethod}
          specialDeductionAmount={specialDeductionAmount}
          basicLivingExpenseDifference={taxScenarioResult?.bestScenario.basicLivingExpenseDifference ?? basicLivingExpenseDifference}
          hasSpecialDeductions={hasSpecialDeductions}
          netIncome={netIncome}
          taxAmount={taxAmount}
          bracket={bracket}
          taxScenarioResult={taxScenarioResult}
          onScrollToSection={onScrollToSection}
          onOpenDialog={printMode || !!taxScenarioResult ? undefined : () => setDialogState('formula')}
          onOpenScenarioDialog={printMode ? undefined : () => setDialogState('scenario')}
        />
      </Card>
    </div>
  )
}
