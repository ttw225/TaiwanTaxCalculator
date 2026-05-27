import { AlertCircle, RefreshCw } from 'lucide-react'

interface PaymentLoadErrorProps {
  onRetry: () => void
}

export function PaymentLoadError({ onRetry }: PaymentLoadErrorProps) {
  return (
    <div
      role="alert"
      className="bg-white rounded-xl border border-red-200 p-6 sm:p-8 text-center"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
        <AlertCircle size={22} aria-hidden="true" />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-800">
        載入繳稅回饋資料失敗
      </p>
      <p className="mt-1 text-sm text-gray-500">
        請檢查網路連線後重試；若持續無法載入，可改參考上方「常見繳稅金額試算範例」。
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <RefreshCw size={14} aria-hidden="true" />
        重新載入
      </button>
    </div>
  )
}
