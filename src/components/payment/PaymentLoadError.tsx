import { AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import topOffers from '../../data/payment_top_offers.generated.json'
import { SITE_CONFIG } from '../../lib/siteConfig'

interface PaymentLoadErrorProps {
  onRetry: () => void
}

export function PaymentLoadError({ onRetry }: PaymentLoadErrorProps) {
  const tiers = Array.isArray(topOffers?.tiers)
    ? topOffers.tiers.filter(
        (t) => Array.isArray(t?.offers) && t.offers.length > 0,
      )
    : []
  const dataUpdated = typeof topOffers?.data_updated === 'string'
    ? topOffers.data_updated
    : null
  const { googleFormUrl } = SITE_CONFIG

  return (
    <div className="bg-white rounded-xl border border-amber-200 p-6 sm:p-8">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
          <AlertCircle size={20} aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p
            role="status"
            className="text-sm font-medium text-gray-800"
          >
            目前無法載入最新繳稅回饋資料
          </p>
          <p className="mt-1 text-sm text-gray-500">
            可能是網路暫時不穩或資料服務異常，稍後再試即可。
          </p>
          <button
            type="button"
            onClick={onRetry}
            aria-label="重新載入繳稅回饋資料"
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw size={14} aria-hidden="true" />
            重新載入資料
          </button>
        </div>
      </div>

      {tiers.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-5">
          <p className="text-sm text-gray-600">
            以下為
            {dataUpdated ? ` ${dataUpdated} ` : ' '}
            離線精選範例，完整即時比較請待資料重新載入後使用。
          </p>
          <ul className="mt-3 space-y-4">
            {tiers.map((tier) => (
              <li key={tier.amount ?? tier.label}>
                <p className="text-xs font-semibold text-gray-500">
                  稅額 {tier.label}
                </p>
                <ul className="mt-1.5 space-y-1.5">
                  {tier.offers.map((offer, idx) => (
                    <li
                      key={`${offer.bank_code ?? offer.bank}-${offer.card_name}-${idx}`}
                      className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm"
                    >
                      <a
                        href={offer.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-gray-800 hover:text-blue-700 hover:underline"
                      >
                        {offer.bank}・{offer.card_name}
                        <ExternalLink size={11} aria-hidden="true" />
                      </a>
                      <span className="text-gray-600">
                        預估回饋 NT$ {offer.estimated_value.toLocaleString('zh-TW')}
                      </span>
                      {offer.cue && (
                        <span className="text-xs text-gray-400">
                          （{offer.cue}）
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 space-y-1 text-xs text-gray-500">
        {googleFormUrl && (
          <p>
            持續異常請
            <a
              href={googleFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mx-0.5 text-blue-700 hover:underline"
            >
              填寫意見回報表單
            </a>
            告訴我們。
          </p>
        )}
        <p>
          若網路正常、重新載入後仍失敗，可嘗試強制重新整理頁面。
        </p>
      </div>
    </div>
  )
}
