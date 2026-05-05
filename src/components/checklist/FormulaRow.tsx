import { Fragment } from 'react'

export interface FormulaItem {
  id: string
  label: string
  amount: number | null
}

export function FormulaRow({
  items,
  dimFilled = false,
}: {
  items: FormulaItem[]
  dimFilled?: boolean
}) {
  const filledItems = items.filter((i) => i.amount !== null)
  const emptyItems = items.filter((i) => i.amount === null)
  const partialTotal = filledItems.reduce((s, i) => s + i.amount!, 0)
  const allFilled = emptyItems.length === 0 && filledItems.length > 0
  const anyFilled = filledItems.length > 0
  const itemRows = items.reduce<FormulaItem[][]>((rows, item, idx) => {
    const rowIndex = Math.floor(idx / 3)
    if (!rows[rowIndex]) rows[rowIndex] = []
    rows[rowIndex].push(item)
    return rows
  }, [])

  return (
    <div>
      <div className="space-y-2">
        {itemRows.map((row, rowIdx) => (
          <div key={`formula-row-${rowIdx}`} className="flex items-center gap-2">
            {row.map((item, idx) => (
              <Fragment key={item.id}>
                {idx > 0 && (
                  <span className="select-none text-base font-bold text-gray-300">＋</span>
                )}
                <div
                  className={`checklist-formula-card ${
                    item.amount !== null
                      ? (dimFilled ? 'border-gray-300 bg-gray-50' : 'border-blue-200 bg-white')
                      : 'border-dashed border-gray-200 bg-gray-50'
                  }`}
                >
                  {/* Top: label */}
                  <div
                    className={`border-b px-2 py-1.5 text-center ${
                      item.amount !== null
                        ? (dimFilled ? 'border-gray-200 bg-gray-100' : 'border-blue-100 bg-blue-50/60')
                        : 'border-dashed border-gray-200 bg-gray-100/40'
                    }`}
                  >
                    <span
                      className={`checklist-formula-label text-base font-semibold leading-tight ${
                        item.amount !== null
                          ? (dimFilled ? 'text-gray-600' : 'text-blue-700')
                          : 'text-gray-400'
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
                      <span className="text-base font-bold leading-tight text-gray-300">
                        未填寫
                        <br />
                        <span className="invisible text-xs font-normal">元</span>
                      </span>
                    )}
                  </div>
                </div>
              </Fragment>
            ))}
            {rowIdx < itemRows.length - 1 && (
              <span className="select-none text-base font-bold text-gray-300">＋</span>
            )}
          </div>
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
            <span className="text-sm text-orange-400">（{emptyItems.length} 項未填）</span>
          </>
        ) : (
          <span className="text-sm text-gray-300">待填入</span>
        )}
      </div>
    </div>
  )
}
