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

const TYPE_PILL_CLASS: Record<OfferTag, string> = {
  taiwan_pay: 'bg-blue-50 text-blue-700 border-blue-200',
  credit_card: 'bg-gray-100 text-gray-700 border-gray-200',
  installment: 'bg-amber-50 text-amber-800 border-amber-200',
}
const TYPE_PILL_LABEL: Record<OfferTag, string> = {
  taiwan_pay: '台灣Pay',
  credit_card: '信用卡回饋',
  installment: '分期 0 利率',
}

function TypePill({ tag }: { tag: OfferTag }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-base ${TYPE_PILL_CLASS[tag]}`}
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

  const rankCls = !r.applicable
    ? 'border-gray-200 bg-white text-gray-300'
    : isTop
      ? 'border-blue-300 bg-blue-50 text-blue-700'
      : 'border-gray-200 bg-gray-50 text-gray-600'

  const cardExtraCls = !r.applicable
    ? 'opacity-70'
    : isTop
      ? 'ring-1 ring-blue-200 border-blue-200'
      : ''

  // Headline number
  let headline: React.ReactNode
  if (isInstallmentOnly) {
    headline = <p className="text-lg font-bold text-gray-900 leading-none">分期</p>
  } else if (isFeeOnly) {
    headline = <p className="text-lg font-bold text-gray-900 leading-none">手續費／解鎖</p>
  } else if (isFixed) {
    headline = (
      <p className="text-lg font-bold text-gray-900 tabular-nums leading-none">
        {fmtNT(r.value)}
        {r.unit && r.unit !== '元' && (
          <span className="ml-1 text-xs font-normal text-gray-500">{r.unit}</span>
        )}
      </p>
    )
  } else if (isRebate && r.value != null) {
    headline = (
      <p
        className={`text-lg font-bold tabular-nums leading-none ${isTop ? 'text-blue-700' : 'text-gray-900'}`}
      >
        {fmtNT(r.value)}
        {r.unit && r.unit !== '元' && (
          <span className="ml-1 text-xs font-normal text-gray-500">{r.unit}</span>
        )}
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

  const capLabel = offer.cap_label ?? (offer.cap_nt != null ? fmtNT(offer.cap_nt) : '未公告／不適用')

  return (
    <Card className={`p-5 transition-colors ${cardExtraCls}`}>
      <div className="flex items-start gap-4">
        <div
          className={`shrink-0 w-10 h-10 rounded-full border flex items-center justify-center text-base font-semibold tabular-nums ${rankCls}`}
        >
          {rank}
        </div>

        <div className="flex-1 min-w-0">
          {/* Card name */}
          <div className="flex items-start justify-between gap-3 mb-1">
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900 leading-snug">
                {offer.card_name}
              </p>
              <p className="text-base text-gray-400 mt-0.5">{offer.bank}</p>
            </div>
          </div>

          {/* Campaign title */}
          <p className="text-base text-gray-500 leading-relaxed mt-1">{offer.campaign_title}</p>

          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {offer.tags.map((t) => (
              <TypePill key={t} tag={t} />
            ))}
            {offer.requires_registration && (
              <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 text-base">
                需登錄
              </span>
            )}
            {!r.applicable && r.reason && (
              <span className="inline-flex items-center rounded-full bg-gray-100 border border-gray-200 text-gray-600 px-2 py-0.5 text-base">
                不符門檻：{r.reason}
              </span>
            )}
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 mt-4 pt-4 border-t border-gray-100">
            <div>
              <p className="text-base text-gray-400 mb-1">
                {isInstallmentOnly || isFeeOnly ? '形式' : isFixed ? '回饋' : '估算回饋'}
              </p>
              {headline}
              {r.capped && (
                <p className="text-base text-amber-700 mt-1">
                  已達上限 {fmtNT(r.cap)}
                </p>
              )}
              {r.tier_label && (
                <p className="text-base text-gray-500 mt-1">適用：{r.tier_label}</p>
              )}
            </div>
            <div>
              <p className="text-base text-gray-400 mb-1">回饋率</p>
              <p className="text-base text-gray-800 font-medium tabular-nums">{rateLabel}</p>
            </div>
            <div>
              <p className="text-base text-gray-400 mb-1">回饋上限</p>
              <p className="text-base text-gray-800 font-medium">{capLabel}</p>
            </div>
            <div>
              <p className="text-base text-gray-400 mb-1">分期</p>
              <p className="text-base text-gray-800 font-medium">
                {offer.installment_detail ?? '—'}
              </p>
            </div>
          </div>

          {/* Note */}
          {offer.note && (
            <p className="mt-3 text-base text-gray-500 leading-relaxed flex items-start gap-1.5">
              <span className="text-gray-300 mt-0.5 shrink-0">
                <Info size={12} />
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
            <div className="text-base text-gray-400 flex items-center gap-2 min-w-0">
              {offer.source_id && (
                <code className="truncate font-mono">{offer.source_id}</code>
              )}
              {offer.period && <span className="shrink-0">· {offer.period}</span>}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
