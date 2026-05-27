// 卡別目錄 loader：給 CardPicker 與 OfferRow 查 metadata 用。
// raw JSON 不再 static import；改由 paymentDataLoader 透過 runtime fetch 載入。
// 呼叫前須先 await prefetchPaymentData()，否則 getRawCatalog() 會 throw。

import { getRawCatalog } from './paymentDataLoader'
import type { CatalogBankGroup, CatalogCard } from '../types/paymentOffers'

// 卡 id → CatalogCard 的查表。每次呼叫時用最新的 raw catalog 重建；
// raw catalog 一個 build 內穩定（fetch 後即 immutable），這個 Map 也跟著穩定。
// 用 WeakMap-like 策略：以 raw catalog reference 當 key，第一次計算後 cache。
let _byIdCache: { catalogRef: object; map: Map<string, CatalogCard> } | null = null

function getByIdMap(): Map<string, CatalogCard> {
  const raw = getRawCatalog()
  if (_byIdCache && _byIdCache.catalogRef === raw) return _byIdCache.map
  const m = new Map<string, CatalogCard>()
  for (const c of raw.cards) m.set(c.card_id, c)
  _byIdCache = { catalogRef: raw, map: m }
  return m
}

export function getAllCards(): CatalogCard[] {
  return getRawCatalog().cards
}

export function getCard(cardId: string): CatalogCard | null {
  return getByIdMap().get(cardId) ?? null
}

// 給 OfferRow 用：批次查卡名，找不到 fallback 回原 id（讓資料缺漏看得出來）。
export function getCardNames(cardIds: string[]): string[] {
  const map = getByIdMap()
  return cardIds.map((id) => map.get(id)?.display_name_zh ?? id)
}

// 給 CardPicker 用：按發卡銀行分組。
export function groupByBank(): CatalogBankGroup[] {
  const groups = new Map<string, CatalogBankGroup>()
  for (const c of getRawCatalog().cards) {
    let g = groups.get(c.bank_code)
    if (!g) {
      g = { bank_code: c.bank_code, bank_name: c.bank_name, cards: [] }
      groups.set(c.bank_code, g)
    }
    g.cards.push(c)
  }
  return Array.from(groups.values()).sort((a, b) =>
    a.bank_code.localeCompare(b.bank_code),
  )
}
