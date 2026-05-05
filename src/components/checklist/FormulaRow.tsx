import { Fragment } from 'react'

export interface FormulaItem {
  id: string
  label: string
  amount: number | null
}

export function FormulaRow({ items }: { items: FormulaItem[] }) {
  const filledItems = items.filter((i) => i.amount !== null)
  const emptyItems = items.filter((i) => i.amount === null)
  const partialTotal = filledItems.reduce((s, i) => s + i.amount!, 0)
  const allFilled = emptyItems.length === 0 && filledItems.length > 0
  const anyFilled = filledItems.length > 0

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {items.map((item, idx) => (
          <Fragment key={item.id}>
            {idx > 0 && (
              <span className="select-none text-base font-bold text-gray-300">＋</span>
            )}
            <div
              className={`w-[88px] overflow-hidden rounded-lg border-2 transition-all ${
                item.amount !== null
                  ? 'border-blue-200 bg-white'
                  : 'border-dashed border-gray-200 bg-gray-50'
              }`}
            >
              {/* Top: label */}
              <div
                className={`border-b px-2 py-1.5 text-center ${
                  item.amount !== null
                    ? 'border-blue-100 bg-blue-50/60'
                    : 'border-dashed border-gray-200 bg-gray-100/40'
                }`}
              >
                <span
                  className={`text-base font-semibold leading-tight ${
                    item.amount !== null ? 'text-blue-700' : 'text-gray-400'
                  }`}
                >
                  {item.label}
                </span>
              </div>
              {/* Bottom: amount */}
              <div className="flex min-h-[44px] items-center justify-center px-2 py-2 text-center">
                {item.amount !== null ? (
                  <span className="text-base font-bold tabular-nums leading-tight text-gray-800">
                    {item.amount.toLocaleString('zh-TW')}
                    <br />
                    <span className="text-xs font-normal text-gray-500">元</span>
                  </span>
                ) : (
                  <span className="text-base leading-tight text-gray-300">未填寫</span>
                )}
              </div>
            </div>
          </Fragment>
        ))}
      </div>

      {/* Result row */}
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="text-base font-bold text-gray-400">＝</span>
        {allFilled ? (
          <span className="text-base font-bold tabular-nums text-green-700">
            {partialTotal.toLocaleString('zh-TW')} 元
          </span>
        ) : anyFilled ? (
          <>
            <span className="text-base font-bold tabular-nums text-orange-500">
              {partialTotal.toLocaleString('zh-TW')} 元
            </span>
            <span className="text-xs text-orange-400">（{emptyItems.length} 項未填）</span>
          </>
        ) : (
          <span className="text-xs text-gray-300">待填入</span>
        )}
      </div>
    </div>
  )
}
