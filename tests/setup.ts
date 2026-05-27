import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { prefetchPaymentData } from '../src/lib/paymentDataLoader'

Object.defineProperty(window, 'scrollTo', {
  value: () => {},
  writable: true,
  configurable: true,
})

// ── Global fetch mock for /data/*.json ──────────────────────────────────────
// paymentDataLoader.prefetchPaymentData() 在 production 走 fetch；測試環境用本機檔取代。
// match 路徑為 `/data/<filename>.json`（可含 query string，例如 `?v=<hash>`），
// 回傳 public/data/<filename>.json 的內容。其他 fetch 呼叫保留原本行為（若有）。

const publicDir = resolve(__dirname, '..', 'public')

const realFetch: typeof globalThis.fetch | undefined = globalThis.fetch

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url
  const match = url.match(/\/data\/([^/?#]+)/)
  if (match) {
    try {
      const body = readFileSync(resolve(publicDir, 'data', match[1]), 'utf8')
      return new Response(body, {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    } catch (err) {
      return new Response(
        `mock fetch: file not found: ${match[1]}\n${String(err)}`,
        { status: 404 },
      )
    }
  }
  if (realFetch) return realFetch(input as RequestInfo, init)
  throw new Error(`unmocked fetch: ${url}`)
}) as typeof globalThis.fetch

// ── 全域 payment data prefetch（top-level await） ──────────────────────────
// 多數 payment / cardCatalog 測試是頂端同步呼叫 loadOffers() / getAllCards()，
// 需要 paymentData 在 test 檔案 import 時已 ready。Vitest 等待 setup file 的
// top-level 模組評估完成才開始載入 test 檔，所以這裡 await 一次就讓所有 test 同步可用。
await prefetchPaymentData()
