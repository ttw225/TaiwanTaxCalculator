import { useMemo, useRef } from 'react'
import { Search, Star, X } from 'lucide-react'
import { OfferRow } from './OfferRow'
import { fmtNT, fmtPct, resolveOffer } from '../../lib/paymentOffers'
import type { Offer } from '../../types/paymentOffers'
import type { TypeFilterValue } from './TypeFilter'

interface ResultListProps {
  offers: Offer[]
  amount: number
  typeFilter: TypeFilterValue
  bankFilter: Set<string>
  query: string
  onQueryChange: (next: string) => void
}

export function ResultList({
  offers,
  amount,
  typeFilter,
  bankFilter,
  query,
  onQueryChange,
}: ResultListProps) {
  const queryRef = useRef<HTMLInputElement>(null)

  // pre-filter (bank + type chips)
  const filtered = useMemo(() => {
    return offers.filter((o) => {
      if (!bankFilter.has(o.bank_code)) return false
      if (!o.tags.some((t) => typeFilter[t])) return false
      return true
    })
  }, [offers, bankFilter, typeFilter])

  // keyword search
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return filtered
    return filtered.filter((o) => {
      const hay =
        `${o.bank} ${o.card_name} ${o.card_scope ?? ''} ${o.campaign_title} ${o.note ?? ''}`.toLowerCase()
      return hay.includes(q)
    })
  }, [filtered, query])

  // resolve + rank
  const ranked = useMemo(() => {
    const enriched = searched.map((o) => ({ o, r: resolveOffer(o, amount) }))
    return enriched.sort((a, b) => {
      if (a.r.applicable !== b.r.applicable) return a.r.applicable ? -1 : 1
      const va = a.r.value ?? -1
      const vb = b.r.value ?? -1
      if (va !== vb) return vb - va
      const ba = a.o.bank
      const bb = b.o.bank
      if (ba !== bb) return ba.localeCompare(bb, 'zh-TW')
      return a.o.card_name.localeCompare(b.o.card_name, 'zh-TW')
    })
  }, [searched, amount])

  // top reward — uses pre-filter (not search) for stability
  const top = useMemo(() => {
    const pool = filtered
      .map((o) => ({ o, r: resolveOffer(o, amount) }))
      .filter((x) => x.r.applicable && x.r.value != null && x.r.value > 0)
      .sort((a, b) => (b.r.value ?? 0) - (a.r.value ?? 0))
    return pool[0]
  }, [filtered, amount])

  return (
    <>
      {amount > 0 && top && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-5 mb-4 flex items-start gap-4">
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <Star size={18} fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-blue-700 mb-0.5">
              目前最高回饋
            </p>
            <p className="text-xl text-gray-700">
              繳 <span className="font-semibold text-gray-900 tabular-nums">{fmtNT(amount)}</span>
              ，使用
              <span className="font-semibold text-gray-900 mx-1">
                {top.o.bank} {top.o.card_name}
              </span>
              可拿到約{' '}
              <span className="text-blue-700 font-bold tabular-nums">
                {fmtNT(top.r.value)}
              </span>
              {top.r.rate != null && top.r.rate > 0 ? (
                <span className="text-gray-500">
                  （回饋率 {fmtPct(top.r.rate)}
                  {top.r.capped ? `，已達上限 ${fmtNT(top.r.cap)}` : ''}）
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
          placeholder="在結果中搜尋（例：CUBE、世界卡、領航、台灣 Pay）"
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
            {query ? '查無符合方案，試試其他關鍵字' : '查無符合的方案'}
          </p>
        </div>
      ) : (
        <>
          <p className="text-base text-gray-400 mb-3 tabular-nums">
            {ranked.length} 個方案 · 依估算回饋金額由高至低排序
            {query && <span className="ml-1">· 關鍵字「{query}」</span>}
          </p>
          <div className="space-y-3">
            {ranked.map((row, i) => {
              const applicableRank =
                ranked.slice(0, i).filter((x) => x.r.applicable).length + 1
              const rank = row.r.applicable ? applicableRank : '—'
              const isTop =
                i === 0 &&
                row.r.applicable &&
                row.r.value != null &&
                row.r.value > 0 &&
                !query
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
