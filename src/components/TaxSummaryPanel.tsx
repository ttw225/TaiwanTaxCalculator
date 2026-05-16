import { Fragment, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { calcTax, getBrackets } from '../lib/numbers'
import type { TakeMinCandidate, TaxScenario, TaxScenarioResult } from '../lib/taxScenarios'
import { Card, CardBody, CardHeader } from './ui/Card'
import { ModalOverlay } from './ui/ModalOverlay'

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

function TaxFormulaDialog({ onClose }: { onClose: () => void }) {

  const dialog = (
    <ModalOverlay
      onDismiss={onClose}
      data-testid="tax-formula-dialog-overlay"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 p-4 no-print"
    >
      <div
        data-testid="tax-formula-dialog"
        className="w-full max-w-2xl flex flex-col max-h-[calc(100dvh-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">稅率級距</h2>
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
                      <td className="px-4 py-3 align-middle text-left font-semibold text-gray-900 tabular-nums">
                        {fmt(b.quick_deduction)} 元
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
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
    </ModalOverlay>
  )

  return createPortal(dialog, document.body)
}

function ScenarioRulesDialog({ onClose }: { onClose: () => void }) {
  const dialog = (
    <ModalOverlay
      onDismiss={onClose}
      data-testid="scenario-rules-dialog-overlay"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-900/40 p-4 no-print"
    >
      <div
        data-testid="scenario-rules-dialog"
        className="w-full max-w-2xl flex flex-col max-h-[calc(100dvh-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">試算規則</h2>
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
          <div className="space-y-4 text-base leading-relaxed text-gray-700">
            <section>
              <h3 className="mb-2 border-b border-gray-200 pb-1 text-lg font-semibold text-gray-900">配偶申報組合</h3>
              <p>
                配偶合併申報時，稅法允許選擇不同的計稅方式。有人合併計算稅額較低，有人讓某一方的薪資或全部所得分開計算更有利。本頁根據您的資料，自動試算所有合法組合，並標示稅額最低的推薦方案。
              </p>
              <div className="mt-3 space-y-3 border-l-2 border-gray-100 pl-3">
                <div>
                  <h4 className="mb-1 text-base font-semibold text-gray-800">五種計稅方式</h4>
                  <ol className="mt-1 list-decimal list-inside space-y-1 text-base">
                    <li>合併計稅：兩人所得全部合在一起計算</li>
                    <li>本人薪資分開：本人薪資單獨計稅，其餘所得合併</li>
                    <li>配偶薪資分開：配偶薪資單獨計稅，其餘所得合併</li>
                    <li>本人各類所得分開：本人全部所得單獨計稅</li>
                    <li>配偶各類所得分開：配偶全部所得單獨計稅</li>
                  </ol>
                </div>
                <div>
                  <h4 className="mb-1 text-base font-semibold text-gray-800">扣除額分配</h4>
                  <p>
                    選擇分開計稅的那一方，只能列報自己的免稅額（薪資分開），或免稅額加特定扣除項目（全部所得分開）；其餘扣除額由另一方統一列報。這是各組合稅額有差異的原因之一。
                  </p>
                </div>
              </div>
            </section>
            <section>
              <h3 className="mb-2 border-b border-gray-200 pb-1 text-lg font-semibold text-gray-900">股利所得</h3>
              <p>
                有股利所得時，可選擇「合併入所得計稅」或「以 28% 稅率分開計稅」兩種方式。哪種較划算取決於整體所得結構，系統會兩種都試算，一併納入組合比較。
              </p>
            </section>
            <section>
              <h3 className="mb-2 border-b border-gray-200 pb-1 text-lg font-semibold text-gray-900">海外所得 AMT</h3>
              <p>
                全年海外所得合計達 100 萬元以上時，須一併納入「基本所得額」計算。若基本所得額超過 750 萬元，可能需繳最低稅負（AMT）——系統會自動判斷，並將差額計入試算稅額。
              </p>
            </section>
            <section>
              <h3 className="mb-2 border-b border-gray-200 pb-1 text-lg font-semibold text-gray-900">排序與推薦</h3>
              <p>
                所有組合依試算稅額由低到高排列，最上方標示「推薦」的組合，是根據目前填入資料試算出稅額最低的選項。正式申報請以財政部申報系統及您的實際資料為準。
              </p>
            </section>
            <p className="border-t border-gray-100 pt-3 text-sm leading-relaxed text-gray-500">
              配偶計稅方式說明整理自
              <a
                href="https://www.etax.nat.gov.tw/etwmain/tax-info/understanding/tax-saving-manual/national/individual-income-tax/ZJGegL6"
                target="_blank"
                rel="noreferrer"
                className="text-gray-600 underline underline-offset-2 hover:text-gray-800"
              >
                財政部稅務入口網
              </a>
              。
            </p>
          </div>
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
    </ModalOverlay>
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
  joint: '配偶所得合併計稅',
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

function FormulaOperandView({
  label,
  value,
  isResult = false,
}: {
  label: string
  value: string
  isResult?: boolean
}) {
  return (
    <div className="inline-flex min-w-[6.75rem] flex-col gap-0.5 align-bottom">
      <span className="text-sm leading-tight text-gray-700">{label}</span>
      <span className={`text-base font-semibold leading-tight tabular-nums ${isResult ? 'text-blue-700' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  )
}

function FloorZeroTag() {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 align-middle text-[11px] font-medium text-amber-800">
      負數不計，採用0元
    </span>
  )
}

function CapAtTag({ amount }: { amount: number }) {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 align-middle text-[11px] font-medium text-amber-800">
      已達上限 {fmt(amount)} 元
    </span>
  )
}

function TakeMinBlock({ candidates, winner }: { candidates: TakeMinCandidate[]; winner: number }) {
  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2">
        {candidates.map((c, i) => {
          const win = i === winner
          return (
            <div
              key={i}
              className={`relative min-w-40 flex-1 basis-44 rounded-lg border p-2.5 ${win ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className={`mb-1.5 text-xs font-medium ${win ? 'text-blue-700' : 'text-gray-400'}`}>
                {c.label}
              </div>
              {c.subParts && (
                <div className="mb-1 flex flex-wrap items-end gap-x-1.5 gap-y-0.5">
                  {c.subParts.map((p, pi) =>
                    p.type === 'operand' ? (
                      <FormulaOperandView
                        key={pi}
                        label={p.operand.label}
                        value={p.operand.displayValue ?? `${fmt(p.operand.amount)} 元`}
                      />
                    ) : (
                      <span key={pi} className="select-none pb-[2px] text-sm text-gray-400">
                        {p.operator}
                      </span>
                    ),
                  )}
                  <span className="select-none pb-[2px] text-sm text-gray-400">＝</span>
                  <FormulaOperandView label={c.label} value={`${fmt(c.amount)} 元`} isResult />
                </div>
              )}
              {!c.subParts && (
                <div className={`text-base font-bold tabular-nums ${win ? 'text-blue-700' : 'text-gray-500'}`}>
                  {fmt(c.amount)} 元
                </div>
              )}
              {win && (
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden="true"
                  className="absolute right-2 top-2 text-blue-600"
                >
                  <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M6 10.5l2.5 2.5L14 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ScenarioFormulaSections({ scenario }: { scenario: TaxScenario }) {
  return (
    <div
      data-testid={`scenario-formula-sections-${scenario.id}`}
      className="rounded-lg border border-gray-200 bg-white"
    >
      {scenario.formulaSections.map((section, sectionIndex) => {
        const withDividerTitle = ['所得計算', '股利處理', 'AMT 計算', '應繳納稅額'].includes(section.title)
        return (
        <section
          key={`${scenario.id}-${section.title}`}
          data-testid={`scenario-formula-section-${scenario.id}-${sectionIndex}`}
          className="px-3 py-3"
        >
          <h4 className={`mb-2.5 text-base font-semibold text-gray-900 ${withDividerTitle ? 'border-b border-gray-200 pb-1.5' : ''}`}>{section.title}</h4>
          <div>
            {section.equations.map((equation, equationIndex) => {
              const hasTakeMin = equation.parts.some((p) => p.type === 'takeMin')
              const showEquationLabel = !(section.title === '應繳納稅額' && equation.label === '應繳納稅額')
              const equationLabel = hasTakeMin ? `${equation.label}（取較小值）` : equation.label
              return (
                <div
                  key={`${scenario.id}-${sectionIndex}-${equationIndex}`}
                  data-testid={`scenario-formula-equation-${scenario.id}-${sectionIndex}-${equationIndex}`}
                  className={equationIndex > 0 ? 'border-t border-dashed border-gray-200 pt-3 mt-3' : ''}
                >
                  {showEquationLabel && <div className="mb-2.5 text-base text-gray-600">{equationLabel}</div>}
                  {hasTakeMin ? (
                    <div>
                      {equation.parts.map((part, partIndex) => {
                        if (part.type === 'takeMin') {
                          return <TakeMinBlock key={partIndex} candidates={part.candidates} winner={part.winner} />
                        }
                        return null
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
                      {equation.parts.map((part, partIndex) => {
                        if (part.type === 'operator') {
                          return (
                            <span key={partIndex} className="select-none pb-[2px] text-sm text-gray-400">
                              {part.operator}
                            </span>
                          )
                        }
                        if (part.type === 'text') {
                          return (
                            <span key={partIndex} className="pb-[2px] text-sm font-medium text-gray-400">
                              {part.text}
                            </span>
                          )
                        }
                        if (part.type === 'floorZero') {
                          return part.isApplied ? <FloorZeroTag key={partIndex} /> : null
                        }
                        if (part.type === 'capAt') {
                          return part.isHit ? <CapAtTag key={partIndex} amount={part.amount} /> : null
                        }
                        if (part.type === 'operand') {
                          return (
                          <FormulaOperandView
                            key={partIndex}
                            label={part.operand.label}
                            value={part.operand.displayValue ?? `${fmt(part.operand.amount)} 元`}
                          />
                          )
                        }
                        return null
                      })}
                      <span className="select-none pb-[2px] text-sm text-gray-400">＝</span>
                      <FormulaOperandView
                        label={equation.result.label}
                        value={equation.result.displayValue ?? `${fmt(equation.result.amount)} 元`}
                        isResult
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
        )
      })}
    </div>
  )
}

function TaxScenarioCombinationsDialog({
  scenarioResult,
  onClose,
  onOpenFormula,
  onOpenRules,
}: {
  scenarioResult: TaxScenarioResult
  onClose: () => void
  onOpenFormula: () => void
  onOpenRules: () => void
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
  const hasMultipleScenarios = scenarioResult.scenarios.length > 1
  const hasSpouseScenarios = scenarioResult.scenarios.some((scenario) => scenario.coupleMode !== 'single')
  // 申報組合 + 配偶計稅方式 (couple only) + 股利申報方式 (conditional) + 最終稅額 + chevron
  const colCount = 3 + (hasSpouseScenarios ? 1 : 0) + (scenarioResult.hasDividend ? 1 : 0)

  const dialog = (
    <ModalOverlay
      onDismiss={onClose}
      data-testid="tax-scenario-combinations-dialog-overlay"
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-gray-900/40 p-0 sm:p-4 no-print"
    >
      <div
        data-testid="tax-scenario-combinations-dialog"
        className="w-full flex flex-col
          h-[calc(100dvh-2rem)] sm:h-[min(680px,calc(100dvh-2rem))] md:h-[min(780px,calc(100dvh-2rem))] lg:h-[min(860px,calc(100dvh-2rem))]
          rounded-t-xl sm:rounded-xl
          sm:max-w-2xl md:max-w-3xl lg:max-w-5xl
          border border-gray-200 bg-white shadow-xl"
      >
        {/* Header */}
        <div className="border-b border-gray-100 px-4 py-3 shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold text-gray-900">所有稅額組合</h2>
              <p className="mt-1 text-base leading-relaxed text-gray-500">
                依您填寫的項目，共有 {scenarioResult.scenarios.length} 種稅額組合。了解
                <a
                  href="#tax-scenario-rules"
                  onClick={(e) => { e.preventDefault(); onOpenRules() }}
                  className="inline text-gray-600 underline underline-offset-2 hover:text-gray-800"
                >
                  試算規則
                </a>
                <span className="text-gray-500">與</span>
                <a
                  href="#tax-formula-detail"
                  onClick={(e) => { e.preventDefault(); onOpenFormula() }}
                  className="inline text-gray-600 underline underline-offset-2 hover:text-gray-800"
                >
                  稅率級距
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
          {scenarioResult.scenarios.some(s => s.assumptions.length > 0) && (
            <p className="mt-2 w-full rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-800">
              各類所得分開試算中，僅有儲蓄投資特別扣除額有計入分開計稅方。若您或配偶個人有較高的扣除額，請以國稅局計算為準。
            </p>
          )}
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
                  {hasSpouseScenarios && (
                    <th
                      onClick={() => handleSort('coupleType')}
                      className="group sticky top-0 z-20 border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-left font-medium cursor-pointer select-none first:rounded-tl-xl last:rounded-tr-xl focus:outline-none hover:text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      配偶計稅方式<SortIndicator col="coupleType" sortCol={sortCol} sortDir={sortDir} />
                    </th>
                  )}
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
                        data-testid={`scenario-row-${scenario.id}`}
                        onClick={() => toggleRow(scenario.id)}
                        className={`relative z-0 cursor-pointer border-gray-200 transition-colors ${
                          isBest ? 'bg-blue-50/60 hover:bg-blue-50' : 'bg-white hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 align-middle">
                          <div>
                            <div className={`flex items-center gap-1.5 font-medium leading-snug ${isBest ? 'text-blue-900' : 'text-gray-900'}`}>
                              {coupleLabel}
                              {isBest && hasMultipleScenarios && (
                                <span className="inline-flex shrink-0 items-center rounded-full bg-blue-600 px-2 py-0.5 text-sm font-semibold text-white">
                                  推薦
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        {hasSpouseScenarios && (
                          <td className="px-4 py-3 align-middle text-gray-600">
                            {coupleType}
                          </td>
                        )}
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
                            <ScenarioFormulaSections scenario={scenario} />
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
    </ModalOverlay>
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
  taxScenarioResult?: TaxScenarioResult | null
  onScrollToSection?: (categoryId: string) => void
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
  taxScenarioResult,
  onScrollToSection,
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
          label={(
            <SummarySectionLink sectionId="basic_living_expense" onScroll={onScrollToSection}>
              基本生活費差額
            </SummarySectionLink>
          )}
          value={basicLivingExpenseDifference}
          isDeduction
          pendingCalculation={basicLivingMissing}
          sectionId="basic_living_expense"
          onScroll={onScrollToSection}
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
        {taxScenarioResult && onOpenScenarioDialog && (
          <div className="mt-1.5">
            <button
              type="button"
              onClick={onOpenScenarioDialog}
              className="inline-flex w-full items-center justify-center rounded-lg border border-blue-200 bg-white px-2.5 py-1 text-sm font-medium text-blue-700 hover:bg-blue-100"
            >
              查看所有稅額組合
            </button>
          </div>
        )}
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
  const [dialogState, setDialogState] = useState<null | 'scenario' | 'formula' | 'rules'>(null)

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

  return (
    <div>
      {!printMode && (dialogState === 'scenario' || dialogState === 'formula' || dialogState === 'rules') && taxScenarioResult && (
        <TaxScenarioCombinationsDialog
          scenarioResult={taxScenarioResult}
          onClose={() => setDialogState(null)}
          onOpenFormula={() => setDialogState('formula')}
          onOpenRules={() => setDialogState('rules')}
        />
      )}
      {!printMode && dialogState === 'formula' && (
        <TaxFormulaDialog
          onClose={() => setDialogState(taxScenarioResult ? 'scenario' : null)}
        />
      )}
      {!printMode && dialogState === 'rules' && (
        <ScenarioRulesDialog
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
          taxScenarioResult={taxScenarioResult}
          onScrollToSection={onScrollToSection}
          onOpenScenarioDialog={printMode ? undefined : () => setDialogState('scenario')}
        />
      </Card>
    </div>
  )
}
