// Payment data 載入層：把 raw JSON 從 JS bundle 抽出，改成 runtime fetch + module-level cache。
//
// 設計重點：
//   1. 保留 loadOffers / getCard / getAllCards 等 consumer 的 **同步 API**，避免 async 病毒
//      擴散到 ResultList / CardPicker。
//   2. consumer 呼叫前必須先 await prefetchPaymentData()，否則 getRawOffers / getRawCatalog 會 throw。
//      由 PaymentRewardsPage 的 useEffect 統一觸發、由 <ready> gate 確保 InteractiveSection 只在
//      cache hydrated 後才 mount。
//   3. URL 加 ?v=<build_id> cache buster，build_id 來自 generated top-N 的 hash；
//      HTML / JS bundle / generated top-N 同 build 對應同 hash，自動對齊。
//      搭配 _headers 的 /data/* immutable cache，等同檔名 hashing 的效果，不用 manifest。
//   4. fetch 失敗時 .finally 清 _inflight，下次 prefetch 重新嘗試；UI 由 PaymentLoadError + retry 補上。
//   5. tests / HMR 透過 resetPaymentDataForTest / primePaymentData 控制 cache 狀態。

import topOffersMeta from '../data/payment_top_offers.generated.json'
import type { CatalogCard } from '../types/paymentOffers'
import type { RawPaymentData } from './paymentOfferCore'
import { createPublicAssetUrl } from './publicAsset'

// generated top-N 已 commit 進版控；build_id 是源 JSON content hash 前 8 字。
// 同步可讀（static import），不會 race fetch。
const BUILD_ID = (topOffersMeta as { build_id: string }).build_id

export interface RawCardCatalog {
  tax_year?: string
  schema_version?: string
  notes?: string
  cards: CatalogCard[]
}

let _offers: RawPaymentData | null = null
let _catalog: RawCardCatalog | null = null
let _inflight: Promise<void> | null = null

export function getRawOffers(): RawPaymentData {
  if (!_offers) {
    throw new Error(
      'paymentData not loaded; call prefetchPaymentData() (and await) before using loadOffers/getRawOffers',
    )
  }
  return _offers
}

export function getRawCatalog(): RawCardCatalog {
  if (!_catalog) {
    throw new Error(
      'paymentData not loaded; call prefetchPaymentData() (and await) before using cardCatalog APIs',
    )
  }
  return _catalog
}

export function isPaymentDataReady(): boolean {
  return _offers != null && _catalog != null
}

function buildUrl(name: string): string {
  return `${createPublicAssetUrl(`data/${name}`)}?v=${BUILD_ID}`
}

export function prefetchPaymentData(): Promise<void> {
  if (isPaymentDataReady()) return Promise.resolve()
  if (_inflight) return _inflight

  _inflight = Promise.all([
    fetch(buildUrl('tax_payment_rewards_114.json')).then((r) => {
      if (!r.ok) throw new Error(`fetch payment offers failed: ${r.status}`)
      return r.json() as Promise<RawPaymentData>
    }),
    fetch(buildUrl('card_catalog_114.json')).then((r) => {
      if (!r.ok) throw new Error(`fetch card catalog failed: ${r.status}`)
      return r.json() as Promise<RawCardCatalog>
    }),
  ])
    .then(([offers, catalog]) => {
      _offers = offers
      _catalog = catalog
    })
    .finally(() => {
      // 不論成功 / 失敗都清；失敗時下次 prefetch 會建立新 promise 重試，
      // 而非永遠回傳 rejected promise 卡死。
      _inflight = null
    })

  return _inflight
}

// 給 Node scripts / tests 同步 prime（繞過 fetch）。
export function primePaymentData(offers: RawPaymentData, catalog: RawCardCatalog): void {
  _offers = offers
  _catalog = catalog
}

// 給 tests / HMR：清空 cache，下次呼叫 prefetch 重新 fetch。
export function resetPaymentDataForTest(): void {
  _offers = null
  _catalog = null
  _inflight = null
}
