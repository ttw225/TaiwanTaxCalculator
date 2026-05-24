import { ExternalLink, Info } from 'lucide-react'
import { Card } from '../ui/Card'
import { fmtNT, fmtPct, resolveOffer } from '../../lib/paymentOffers'
import type { Offer, OfferTag } from '../../types/paymentOffers'

interface OfferRowProps {
  offer: Offer
  rank: number | string
  amount: number
  isTop: boolean
}

const TYPE_PILL_CLASS = 'bg-blue-50 text-blue-700 border-blue-200'
const TYPE_PILL_LABEL: Record<OfferTag, string> = {
  taiwan_pay: '台灣Pay',
  credit_card: '信用卡回饋',
  debit_card: '金融卡回饋',
  installment: '分期 0 利率',
}
// Display order for type pills: 信用卡 → 金融卡 → 分期 → 台灣Pay
const TYPE_PILL_ORDER: OfferTag[] = ['credit_card', 'debit_card', 'installment', 'taiwan_pay']

function TypePill({ tag }: { tag: OfferTag }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-base ${TYPE_PILL_CLASS}`}
    >
      {TYPE_PILL_LABEL[tag]}
    </span>
  )
}

export function OfferRow({ offer, rank, amount, isTop }: OfferRowProps) {
  const r = resolveOffer(offer, amount)
  const isInstallmentOnly = r.kind === 'installment_only'
  const isFeeOnly = r.kind === 'fee_only'
  const isFixed = r.kind === 'fixed'
  const isRebate = r.kind === 'rate' || r.kind === 'rate-tiered'
  const highlightHeadline = isTop && r.value != null && r.value > 0

  const rankCls = isTop
    ? 'border-blue-300 bg-blue-50 text-blue-700'
    : 'border-gray-200 bg-gray-50 text-gray-600'

  const cardExtraCls = isTop ? 'ring-1 ring-blue-200 border-blue-200' : ''

  // Headline number
  const isNTUnit = !r.unit || r.unit === '元'
  const formatValue = (v: number) =>
    isNTUnit ? fmtNT(v) : Math.round(v).toLocaleString('zh-TW')
  let headline: React.ReactNode
  if (isInstallmentOnly) {
    headline = <p className="text-lg font-bold text-gray-900 leading-none">分期</p>
  } else if (isFeeOnly) {
    headline = <p className="text-lg font-bold text-gray-900 leading-none">手續費／解鎖</p>
  } else if (isFixed) {
    headline = (
      <p
        className={`text-lg font-bold tabular-nums leading-none ${
          highlightHeadline ? 'text-blue-700' : 'text-gray-900'
        }`}
      >
        {formatValue(r.value!)}
        {!isNTUnit && <span className="ml-1">{r.unit}</span>}
      </p>
    )
  } else if (isRebate && r.value != null) {
    headline = (
      <p
        className={`text-lg font-bold tabular-nums leading-none ${
          highlightHeadline ? 'text-blue-700' : 'text-gray-900'
        }`}
      >
        {formatValue(r.value)}
        {!isNTUnit && <span className="ml-1">{r.unit}</span>}
      </p>
    )
  } else {
    headline = <p className="text-sm text-gray-500">需查官網</p>
  }

  const rateLabel = (() => {
    if (isInstallmentOnly || isFeeOnly) return '—'
    if (offer.mode === 'fixed') return '固定金額'
    return fmtPct(r.rate ?? offer.rate ?? null)
  })()

  const capLabel = offer.cap_label ?? (offer.cap_nt != null ? fmtNT(offer.cap_nt) : '—')

  return (
    <Card className={`p-5 transition-colors ${cardExtraCls}`}>
      <div className="flex flex-col items-start sm:flex-row sm:items-start gap-2 sm:gap-4">
        <div
          className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center text-base font-semibold tabular-nums ${rankCls}`}
        >
          {rank}
        </div>

        <div className="flex-1 min-w-0 w-full">
          {/* Title: bank｜campaign_title */}
          <p className="text-base font-semibold text-gray-900 leading-snug">
            {offer.bank}｜{offer.campaign_title}
          </p>
          {/* Scope sub-label */}
          <p className="text-base text-gray-500 mt-0.5">
            {offer.is_card_specific ? (
              <>
                限特定卡
                <span className="block sm:inline sm:ml-2 text-gray-400">{offer.card_name}</span>
              </>
            ) : (
              '全卡別適用'
            )}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {TYPE_PILL_ORDER.filter((t) => offer.tags.includes(t)).map((t) => (
              <TypePill key={t} tag={t} />
            ))}
            {offer.requires_registration && (
              <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 text-base">
                需登錄
              </span>
            )}
          </div>

          {/* Metrics list */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col divide-y divide-gray-100">
            <div className="flex items-baseline gap-3 py-2">
              <p className="text-base text-gray-500 shrink-0 w-20">
                {isInstallmentOnly || isFeeOnly ? '形式' : isFixed ? '回饋' : '估算回饋'}
              </p>
              <div className="min-w-0">
                {headline}
                {r.capped && (
                  <p className="text-base text-amber-700 mt-1">
                    已達上限 {r.cap != null ? formatValue(r.cap) : '—'}
                    {!isNTUnit && ` ${r.unit}`}
                  </p>
                )}
                {r.tier_label && (
                  <p className="text-base text-gray-500 mt-1">適用：{r.tier_label}</p>
                )}
              </div>
            </div>
            <div className="flex items-baseline gap-3 py-2">
              <p className="text-base text-gray-500 shrink-0 w-20">回饋率</p>
              <p className="text-base text-gray-800 font-medium tabular-nums">{rateLabel}</p>
            </div>
            <div className="flex items-baseline gap-3 py-2">
              <p className="text-base text-gray-500 shrink-0 w-20">回饋上限</p>
              <p className="text-base text-gray-800 font-medium">{capLabel}</p>
            </div>
            <div className="flex items-baseline gap-3 py-2">
              <p className="text-base text-gray-500 shrink-0 w-20">分期</p>
              <p className="text-base text-gray-800 font-medium">
                {offer.installment_summary ?? '—'}
              </p>
            </div>
          </div>

          {/* Note */}
          {offer.note && (
            <p className="mt-3 text-base text-gray-500 leading-relaxed flex items-start gap-2">
              <span className="text-gray-500 shrink-0 inline-flex items-center justify-center h-[1.625em]">
                <Info size={20} />
              </span>
              {offer.note}
            </p>
          )}

          {/* Footer: source */}
          <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2 flex-wrap">
            {offer.source_url && (
              <a
                href={offer.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-base font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 hover:bg-slate-100 hover:text-slate-800 transition-colors shrink-0"
              >
                官方活動頁
                <ExternalLink size={13} />
              </a>
            )}
            {offer.period && (
              <div className="text-base text-gray-400 min-w-0">{offer.period}</div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
