// 卡別目錄 loader：給 CardPicker 與 OfferRow 查 metadata 用。
// 載入 src/data/card_catalog_114.json。

import rawCatalog from '../data/card_catalog_114.json'
import type { CatalogCard, CatalogBankGroup } from '../types/paymentOffers'

interface RawCatalog {
  tax_year: string
  schema_version: string
  notes?: string
  cards: CatalogCard[]
}

const data = rawCatalog as unknown as RawCatalog

const byId: Map<string, CatalogCard> = (() => {
  const m = new Map<string, CatalogCard>()
  for (const c of data.cards) m.set(c.card_id, c)
  return m
})()

export function getAllCards(): CatalogCard[] {
  return data.cards
}

export function getCard(cardId: string): CatalogCard | null {
  return byId.get(cardId) ?? null
}

// 給 OfferRow 用：批次查卡名，找不到 fallback 回原 id（讓資料缺漏看得出來）。
export function getCardNames(cardIds: string[]): string[] {
  return cardIds.map((id) => byId.get(id)?.display_name_zh ?? id)
}

// 給 CardPicker 用：按發卡銀行分組。
export function groupByBank(): CatalogBankGroup[] {
  const groups = new Map<string, CatalogBankGroup>()
  for (const c of data.cards) {
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

interface CatalogMeta {
  tax_year: string
  schema_version: string
}
export const CATALOG_META: CatalogMeta = {
  tax_year: data.tax_year,
  schema_version: data.schema_version,
}
