import { useState } from 'react'
import { calcTax, getBrackets } from '../lib/numbers'

interface Props {
  grossIncome: number | null
  exemptionAmount: number | null
  /** null when itemized cards exist but amounts are not all filled */
  generalDeductionAmount: number | null
  specialDeductionAmount: number | null
  hasSpecialDeductions: boolean
  onScrollToSection?: (categoryId: string) => void
}

function fmt(n: number) {
  return n.toLocaleString('zh-TW')
}

function GoFill({ sectionId, onScroll }: { sectionId: string; onScroll?: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onScroll?.(sectionId)}
      className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline underline-offset-2 transition-colors shrink-0"
    >
      前往填寫
    </button>
  )
}

function SummaryRow({
  label,
  value,
  isDeduction = false,
  missing = false,
  sectionId,
  onScroll,
}: {
  label: string
  value: number | null
  isDeduction?: boolean
  missing?: boolean
  sectionId: string
  onScroll?: (id: string) => void
}) {
  const hasVal = value !== null && !missing
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className={`text-xs shrink-0 ${hasVal ? 'text-gray-500' : missing ? 'text-gray-400' : 'text-gray-300'}`}>
        {label}
      </span>
      {missing ? (
        <GoFill sectionId={sectionId} onScroll={onScroll} />
      ) : hasVal ? (
        <span className="text-sm font-semibold tabular-nums text-gray-800 shrink-0">
          {isDeduction ? '−' : ''}{fmt(value!)} 元
        </span>
      ) : (
        <span className="text-sm text-gray-200 shrink-0">—</span>
      )}
    </div>
  )
}

function TaxFormulaDialog({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-gray-900">「所得稅應納稅額」公式</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-sm text-gray-500 hover:border-gray-300 hover:bg-gray-100 transition-colors"
          >
            ×
          </button>
        </div>
        <div className="px-5 py-4">
          <p className="text-sm text-gray-700 mb-4">
            公式：<span className="font-semibold text-gray-900">「綜合所得淨額」× 稅率 − 累進差額</span>
          </p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-700 text-white">
                <th className="px-3 py-2 text-left font-semibold rounded-tl-md">綜合所得淨額區間</th>
                <th className="px-3 py-2 text-center font-semibold">稅率</th>
                <th className="px-3 py-2 text-right font-semibold rounded-tr-md">累進差額</th>
              </tr>
            </thead>
            <tbody>
              {getBrackets().map((b, i) => {
                const prev = getBrackets()[i - 1]
                const from = i === 0 ? '0' : fmt((prev.up_to ?? 0) + 1)
                const to = b.up_to ? `${fmt(b.up_to)} 元` : '以上'
                return (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="px-3 py-2 font-medium text-gray-700">
                      {from}{b.up_to ? ` – ${to}` : ' 元' + to}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold text-gray-900">
                      {(b.rate * 100).toFixed(0)}%
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-red-700 tabular-nums">
                      {fmt(b.quick_deduction)} 元
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end border-t border-gray-100 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 bg-white px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}

export function TaxSummaryPanel({
  grossIncome,
  exemptionAmount,
  generalDeductionAmount,
  specialDeductionAmount,
  hasSpecialDeductions,
  onScrollToSection,
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

  const grossMissing = grossIncome === null
  const exemptMissing = exemptionAmount === null
  const generalMissing = generalDeductionAmount === null
  const specialMissing = hasSpecialDeductions && specialDeductionAmount === null

  return (
    <>
      {dialogOpen && <TaxFormulaDialog onClose={() => setDialogOpen(false)} />}

      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            節稅試算摘要
          </h3>
        </div>

        {/* Calculation rows */}
        <div className="px-4 py-3 space-y-2.5">
          <SummaryRow
            label="綜合所得總額"
            value={grossIncome}
            missing={grossMissing}
            sectionId="gross_income"
            onScroll={onScrollToSection}
          />
          <SummaryRow
            label="免稅額"
            value={exemptionAmount}
            isDeduction
            missing={exemptMissing}
            sectionId="exemptions"
            onScroll={onScrollToSection}
          />
          <SummaryRow
            label="一般扣除額"
            value={generalDeductionAmount}
            isDeduction
            missing={generalMissing}
            sectionId="general_deductions"
            onScroll={onScrollToSection}
          />
          {hasSpecialDeductions && (
            <SummaryRow
              label="特別扣除額"
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
              <span className={`text-xs font-medium shrink-0 ${netIncome !== null ? 'text-gray-600' : 'text-gray-300'}`}>
                所得淨額
              </span>
              {netIncome !== null ? (
                <span className="text-sm font-bold tabular-nums text-gray-900">{fmt(netIncome)} 元</span>
              ) : (
                <span className="text-xs text-gray-300">待計算</span>
              )}
            </div>

            {/* Tax label + 瞭解更多 */}
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs text-gray-500 shrink-0">所得稅應納稅額</span>
              <span className="shrink-0 text-[11px] text-gray-400">
                <span aria-hidden>(</span>
                <button
                  type="button"
                  onClick={() => setDialogOpen(true)}
                  className="inline p-0 border-0 bg-transparent font-inherit text-[11px] text-gray-400 hover:text-blue-600 hover:underline underline-offset-2 transition-colors cursor-pointer"
                >
                  瞭解更多
                </button>
                <span aria-hidden>)</span>
              </span>
            </div>

            {/* Bracket formula */}
            {netIncome !== null && bracket && (
              <div className="pl-2 space-y-0.5 border-l-2 border-gray-100">
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[11px] text-gray-400">× 稅率</span>
                  <span className="text-[11px] font-semibold text-gray-500 tabular-nums">
                    {(bracket.rate * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-1">
                  <span className="text-[11px] text-gray-400">− 累進差額</span>
                  <span className="text-[11px] font-semibold text-gray-500 tabular-nums">
                    {fmt(bracket.quick_deduction)} 元
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tax amount card */}
        <div
          className={`mx-3 mb-3 rounded-lg border px-3 py-2.5 transition-all ${
            taxAmount !== null
              ? 'border-blue-200 bg-blue-50'
              : 'border-dashed border-gray-200 bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className={`text-xs font-semibold ${taxAmount !== null ? 'text-blue-800' : 'text-gray-400'}`}>
              應納稅額
            </span>
            {taxAmount !== null ? (
              <span className="text-base font-bold tabular-nums text-blue-700">{fmt(taxAmount)} 元</span>
            ) : (
              <span className="text-xs text-gray-300">待計算</span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-50 bg-gray-50 px-4 py-2">
          <p className="text-xs text-gray-400 leading-relaxed">
            填入各項金額後，此處將顯示試算結果
          </p>
        </div>
      </div>
    </>
  )
}
