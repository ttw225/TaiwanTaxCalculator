// 載入 payment data 期間的 placeholder。
// 尺寸盡量貼近 InteractiveSection 的主要區塊，避免首屏 CLS。

export function PaymentSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">繳稅回饋資料載入中…</span>
      {/* 模擬 AmountInput 卡片 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="h-6 w-32 animate-pulse rounded bg-gray-100" />
        <div className="mt-3 h-10 w-full animate-pulse rounded bg-gray-100" />
      </div>
      {/* 模擬 Filter + CardPicker 卡片 */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div className="space-y-2">
            <div className="h-5 w-24 animate-pulse rounded bg-gray-100" />
            <div className="h-8 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-8 w-full animate-pulse rounded bg-gray-100" />
          </div>
          <div className="space-y-2">
            <div className="h-5 w-24 animate-pulse rounded bg-gray-100" />
            <div className="h-8 w-full animate-pulse rounded bg-gray-100" />
          </div>
        </div>
      </div>
      {/* 模擬 ResultList 前幾筆 */}
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
            <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
