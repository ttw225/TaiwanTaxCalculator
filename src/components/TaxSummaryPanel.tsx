interface Props {
  grossIncome: number | null  // null = no valid input yet
}

function formatTwd(n: number) {
  return n.toLocaleString('zh-TW')
}

export function TaxSummaryPanel({ grossIncome }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-100 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          節稅試算摘要
        </h3>
      </div>

      <div className="px-4 py-3 space-y-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs text-gray-500 shrink-0">綜合所得總額</span>
          {grossIncome !== null ? (
            <span className="text-sm font-semibold text-gray-900 tabular-nums">
              {formatTwd(grossIncome)} 元
            </span>
          ) : (
            <span className="text-sm font-medium text-gray-300">—</span>
          )}
        </div>
      </div>

      <div className="border-t border-gray-50 bg-gray-50 px-4 py-2">
        <p className="text-xs text-gray-400 leading-relaxed">
          填入各項金額後，此處將顯示試算結果
        </p>
      </div>
    </div>
  )
}
