// Payment offers 同步 API：攤平、篩選、銀行清單。
// raw JSON 不再 static import；改由 paymentDataLoader 透過 runtime fetch 載入。
// 呼叫前須先 await prefetchPaymentData()，否則 getRawOffers() 會 throw。
// 純函式（resolveOffer / fmtNT / fmtPct / clampAmount / toOffer / deriveTags）在 paymentOfferCore.ts。

import { getCard } from './cardCatalog'
import { getRawOffers } from './paymentDataLoader'
import {
  flattenPaymentData,
  resolveOffer as coreResolveOffer,
  fmtNT as coreFmtNT,
  fmtPct as coreFmtPct,
  clampAmount as coreClampAmount,
} from './paymentOfferCore'
import type { BankListItem, Offer } from '../types/paymentOffers'

// 卡別查詢 adapter：把 cardCatalog.getCard 包成 deriveTags 期望的形式。
function getCardType(cardId: string): 'credit' | 'debit' | null {
  return getCard(cardId)?.type ?? null
}

// ── 載入 + 攤平 ─────────────────────────────────────────────────────────────
export function loadOffers(): Offer[] {
  return flattenPaymentData(getRawOffers(), getCardType)
}

// ── 卡 picker 篩選契約 ──────────────────────────────────────────────────────
// selectedCardIds 為空 → 全部 campaign 都候選。
// 否則：全卡別 campaign 要其 bank_code 在「使用者選的卡所屬銀行」中；
//       限定卡 campaign 要與使用者選的 card_id 有交集。
export function filterOffersByCards(
  offers: Offer[],
  selectedCardIds: Set<string>,
): Offer[] {
  if (selectedCardIds.size === 0) return offers
  const selectedBanks = new Set<string>()
  for (const id of selectedCardIds) {
    const c = getCard(id)
    if (c) selectedBanks.add(c.bank_code)
  }
  return offers.filter((o) => {
    if (o.is_card_specific) {
      return o.eligible_card_ids.some((id) => selectedCardIds.has(id))
    }
    return selectedBanks.has(o.bank_code)
  })
}

// ── 銀行清單（給 BankFilter 用） ─────────────────────────────────────────────
export function getBankList(): BankListItem[] {
  const seen = new Set<string>()
  const out: BankListItem[] = []
  for (const b of getRawOffers().banks) {
    if (b.campaigns.length === 0) continue
    if (seen.has(b.bank_code)) continue
    seen.add(b.bank_code)
    out.push({ code: b.bank_code, name: b.bank_name })
  }
  return out.sort((a, b) => a.code.localeCompare(b.code))
}

// ── 重新匯出 core 純函式，保持既有 API ─────────────────────────────────────
export {
  coreResolveOffer as resolveOffer,
  coreFmtNT as fmtNT,
  coreFmtPct as fmtPct,
  coreClampAmount as clampAmount,
}
