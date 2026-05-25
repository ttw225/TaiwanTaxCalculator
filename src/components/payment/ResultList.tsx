import { useMemo, useRef } from 'react'
import { Search, Star, X } from 'lucide-react'
import { OfferRow } from './OfferRow'
import {
  filterOffersByCards,
  fmtNT,
  fmtPct,
  resolveOffer,
} from '../../lib/paymentOffers'
import { getUnitMeta, ratioHintText } from '../../lib/rewardUnits'
import type { Offer, ResolveResult } from '../../types/paymentOffers'
import type { TypeFilterValue } from './TypeFilter'

interface ResultListProps {
  offers: Offer[]
  amount: number
  typeFilter: TypeFilterValue
  selectedCardIds: Set<string>
  query: string
  onQueryChange: (next: string) => void
}

interface RankedRow {
  o: Offer
  r: ResolveResult
}

function sortRanked(rows: RankedRow[]): RankedRow[] {
  return [...rows].sort((a, b) => {
    const va = a.r.value_ntd ?? -Infinity
    const vb = b.r.value_ntd ?? -Infinity
    if (va !== vb) return vb - va
    const ba = a.o.bank
    const bb = b.o.bank
    if (ba !== bb) return ba.localeCompare(bb, 'zh-TW')
    return a.o.card_name.localeCompare(b.o.card_name, 'zh-TW')
  })
}

export function ResultList({
  offers,
  amount,
  typeFilter,
  selectedCardIds,
  query,
  onQueryChange,
}: ResultListProps) {
  const queryRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const byCard = filterOffersByCards(offers, selectedCardIds)
    return byCard.filter((o) => o.tags.some((t) => typeFilter[t]))
  }, [offers, selectedCardIds, typeFilter])

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return filtered
    return filtered.filter((o) => {
      const hay =
        `${o.bank} ${o.card_name} ${o.card_scope ?? ''} ${o.campaign_title}`.toLowerCase()
      return hay.includes(q)
    })
  }, [filtered, query])

  const ranked = useMemo(() => {
    const resolved = searched.map((o) => ({ o, r: resolveOffer(o, amount) }))
    return sortRanked(resolved.filter((row) => row.r.applicable))
  }, [searched, amount])

  // top reward — uses pre-keyword pool for stability
  const top = useMemo(() => {
    const pool = filtered
      .map((o) => ({ o, r: resolveOffer(o, amount) }))
      .filter((x) => x.r.applicable && x.r.value_ntd != null && x.r.value_ntd > 0)
      .sort((a, b) => (b.r.value_ntd ?? 0) - (a.r.value_ntd ?? 0))
    return pool[0]
  }, [filtered, amount])

  return (
    <>
      {amount > 0 && top && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 mb-4 flex flex-col items-start sm:flex-row sm:items-start gap-2 sm:gap-4">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Star size={18} fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-blue-700 mb-0.5">
              本次試算最高回饋
            </p>
            <p className="text-xl text-gray-700">
              <span className="font-semibold text-gray-900 mr-1">
                {top.o.bank} {top.o.card_name}
              </span>
              ：以稅額{' '}
              <span className="font-semibold text-gray-900 tabular-nums">{fmtNT(amount)}</span>{' '}
              試算，預估可拿{' '}
              <span className="text-blue-700 font-bold tabular-nums">
                {(() => {
                  const isNTUnit = !top.r.unit || top.r.unit === '元'
                  if (isNTUnit) return fmtNT(top.r.value)
                  return `${Math.round(top.r.value ?? 0).toLocaleString('zh-TW')} ${top.r.unit}`
                })()}
              </span>
              {(() => {
                const isNTUnit = !top.r.unit || top.r.unit === '元'
                const meta = getUnitMeta(top.r.unit)
                if (
                  isNTUnit ||
                  meta.kind !== 'cash_equivalent' ||
                  top.r.value_ntd == null ||
                  top.r.value_ntd <= 0
                )
                  return null
                const hint = ratioHintText(top.r.unit)
                return (
                  <span className="text-gray-500 ml-1 tabular-nums">
                    （約 {fmtNT(top.r.value_ntd)}
                    {hint ? `，${hint}` : ''}）
                  </span>
                )
              })()}
              {top.r.rate != null && top.r.rate > 0 ? (
                <span className="text-gray-500">
                  （回饋率 {fmtPct(top.r.rate)}
                  {top.r.capped
                    ? `，已達上限 ${
                        !top.r.unit || top.r.unit === '元'
                          ? fmtNT(top.r.cap)
                          : `${Math.round(top.r.cap ?? 0).toLocaleString('zh-TW')} ${top.r.unit}`
                      }`
                    : ''}）
                </span>
              ) : null}
              。
            </p>
          </div>
        </div>
      )}

      <div className="relative mb-3">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Search size={13} />
        </span>
        <input
          ref={queryRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="搜尋銀行、卡別或活動"
          className="w-full pl-9 pr-9 py-2.5 text-base border border-gray-200 rounded-xl bg-white focus:border-gray-400 focus:outline-none placeholder:text-gray-400"
        />
        {query && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault()
              onQueryChange('')
              queryRef.current?.focus()
            }}
            aria-label="清除搜尋"
            data-padding="custom"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {ranked.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-sm font-medium text-gray-700">
            {query
              ? '查無符合方案，試試其他關鍵字'
              : '目前沒有符合條件的方案，試著放寬類型或卡別篩選'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-base text-gray-400 mb-3">
            共{' '}
            <span className="font-semibold text-gray-700 tabular-nums">
              {ranked.length}
            </span>{' '}
            個方案，依預估回饋由高到低排序
          </p>
          <div className="space-y-3">
            {ranked.map((row, i) => {
              const rank = i + 1
              const isTop = i === 0 && row.r.value !== 0 && !query
              return (
                <OfferRow
                  key={row.o.id}
                  offer={row.o}
                  rank={rank}
                  amount={amount}
                  isTop={isTop}
                />
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
