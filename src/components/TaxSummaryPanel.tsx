import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { calcTax, getBrackets } from '../lib/numbers'
import { Card, CardBody, CardHeader } from './ui/Card'

interface Props {
  grossIncome: number | null
  grossIncomePendingCalculation?: boolean
  exemptionAmount: number | null
  /** null when itemized cards exist but amounts are not all filled */
  generalDeductionAmount: number | null
  generalDeductionMethod?: 'standard' | 'itemized' | null
  specialDeductionAmount: number | null
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
            {isDeduction ? '−' : ''}{fmt(value!)} 元
          </span>
        ) : (
          <span className="text-base leading-6 text-gray-200">—</span>
        )}
      </span>
    </div>
  )
}

function TaxFormulaDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const dialog = (
    <div
      data-testid="tax-formula-dialog-overlay"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 p-4 no-print"
    >
      <div
        data-testid="tax-formula-dialog"
        className="w-full max-w-2xl flex flex-col max-h-[calc(100dvh-2rem)] rounded-xl border border-gray-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <h2 className="text-base font-semibold text-gray-900">「所得稅應納稅額」公式</h2>
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
          <p className="text-base text-gray-700 mb-4">
            公式：<span className="font-semibold text-gray-900">「綜合所得淨額」× 稅率 − 累進差額</span>
          </p>
          <table className="w-full text-base border-collapse">
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="px-3 py-2 text-left font-semibold rounded-tl-md">綜合所得淨額區間</th>
                <th className="px-3 py-2 text-left font-semibold">稅率</th>
                <th className="px-3 py-2 text-left font-semibold rounded-tr-md">累進差額</th>
              </tr>
            </thead>
            <tbody>
              {getBrackets().map((b, i) => {
                const prev = getBrackets()[i - 1]
                const from = i === 0 ? '0' : fmt((prev.up_to ?? 0) + 1)
                const fromLabel = from
                const toLabel = b.up_to ? `${fmt(b.up_to)} 元` : '元以上'
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-3 py-2 font-medium text-gray-700">
                      <span className="inline-grid grid-cols-[9ch_auto_11ch] items-baseline gap-x-2 tabular-nums">
                        <span className="text-right">{fromLabel}</span>
                        <span className="text-center">{b.up_to ? '–' : ''}</span>
                        <span className={b.up_to ? 'text-right' : 'text-left'}>{toLabel}</span>
                      </span>
                    </td>
                    <td className="px-3 py-2 text-left font-semibold text-gray-900">
                      {(b.rate * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 text-left font-semibold text-red-700 tabular-nums">
                      {fmt(b.quick_deduction)} 元
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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

interface SummaryBodyProps {
  grossIncome: number | null
  exemptionAmount: number | null
  generalDeductionAmount: number | null
  generalDeductionMethod?: 'standard' | 'itemized' | null
  specialDeductionAmount: number | null
  hasSpecialDeductions: boolean
  grossIncomePendingCalculation?: boolean
  netIncome: number | null
  taxAmount: number | null
  bracket: ReturnType<typeof getBrackets>[number] | null
  onScrollToSection?: (categoryId: string) => void
  onOpenDialog?: () => void
}

function TaxSummaryBody({
  grossIncome,
  exemptionAmount,
  generalDeductionAmount,
  generalDeductionMethod,
  specialDeductionAmount,
  hasSpecialDeductions,
  grossIncomePendingCalculation = false,
  netIncome,
  taxAmount,
  bracket,
  onScrollToSection,
  onOpenDialog,
}: SummaryBodyProps) {
  const grossMissing = grossIncome === null && !grossIncomePendingCalculation
  const exemptMissing = exemptionAmount === null
  const generalMissing = generalDeductionAmount === null
  const specialMissing = hasSpecialDeductions && specialDeductionAmount === null

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

          {/* Tax label + detail dialog */}
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

          {/* Bracket formula */}
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
        <div className="flex items-center justify-between gap-2">
          <span className={`text-base font-semibold ${taxAmount !== null ? 'text-blue-800' : 'text-muted'}`}>
            應納稅額
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
  exemptionAmount,
  generalDeductionAmount,
  generalDeductionMethod,
  specialDeductionAmount,
  hasSpecialDeductions,
  onScrollToSection,
  printMode = false,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)

  const netIncome =
    grossIncome !== null &&
    exemptionAmount !== null &&
    generalDeductionAmount !== null &&
    (!hasSpecialDeductions || specialDeductionAmount !== null)
      ? Math.max(
          0,
          grossIncome
            - exemptionAmount
            - generalDeductionAmount
            - (hasSpecialDeductions ? (specialDeductionAmount ?? 0) : 0),
        )
      : null

  const taxAmount = netIncome !== null ? calcTax(netIncome) : null
  const bracket =
    netIncome !== null
      ? (getBrackets().find((b) => b.up_to === null || netIncome <= b.up_to) ?? null)
      : null

  return (
    <div>
      {!printMode && dialogOpen && <TaxFormulaDialog onClose={() => setDialogOpen(false)} />}

      <Card variant="summary" className="print-summary-card">
        {/* Header */}
        <CardHeader variant="summary" className="border-b-0">
          <h3 className="text-lg font-semibold uppercase tracking-wide text-gray-700">
            節稅試算摘要
          </h3>
        </CardHeader>
        <div className="mx-4 border-b border-gray-100" />

        <TaxSummaryBody
          grossIncome={grossIncome}
          grossIncomePendingCalculation={grossIncomePendingCalculation}
          exemptionAmount={exemptionAmount}
          generalDeductionAmount={generalDeductionAmount}
          generalDeductionMethod={generalDeductionMethod}
          specialDeductionAmount={specialDeductionAmount}
          hasSpecialDeductions={hasSpecialDeductions}
          netIncome={netIncome}
          taxAmount={taxAmount}
          bracket={bracket}
          onScrollToSection={onScrollToSection}
          onOpenDialog={printMode ? undefined : () => setDialogOpen(true)}
        />
      </Card>
    </div>
  )
}
