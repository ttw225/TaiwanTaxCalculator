// 預先計算「常見繳稅金額試算範例」的 top-N 卡片摘要，
// 寫入 src/data/payment_top_offers.generated.json。
//
// 這支 generated JSON 由 TopOffersStaticSection 直接 static import，
// 確保 prerender HTML 含可索引的繳稅回饋內容（即使後續完整 offer 資料改 runtime fetch，
// crawler 仍能看到三檔金額階的精選範例）。
//
// 同時提供 build_id（源 JSON content hash 前 8 字）給 paymentDataLoader.ts 當 cache buster。
//
// 執行：
//   pnpm tsx scripts/generate-payment-top-offers.ts --write
//   pnpm tsx scripts/generate-payment-top-offers.ts --check
//
// 預設為 --write，避免破壞既有直接執行方式。
// --check 只比較現有檔案，不寫檔；給 CI 擋 stale generated artifact。

import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  flattenPaymentData,
  resolveOffer,
  type RawPaymentData,
  type ToNtdFn,
} from '../src/lib/paymentOfferCore'
import { SITE_CONFIG } from '../src/lib/siteConfig'
import type { CatalogCard, Offer } from '../src/types/paymentOffers'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')
const OUT_PATH = join(PROJECT_ROOT, 'src', 'data', 'payment_top_offers.generated.json')
const UNITS_OUT_PATH = join(PROJECT_ROOT, 'src', 'data', 'payment_reward_units.generated.json')

type Mode = 'write' | 'check'

interface GeneratedFile {
  path: string
  content: string
  summary: string
}

function parseMode(argv: string[]): Mode {
  if (argv.length === 0) return 'write'
  if (argv.length === 1 && argv[0] === '--write') return 'write'
  if (argv.length === 1 && argv[0] === '--check') return 'check'
  throw new Error(
    'Usage: pnpm tsx scripts/generate-payment-top-offers.ts [--write|--check]',
  )
}

// §3.1a 的路徑切換點：§3.2a 把 JSON 搬到 public/data/ 後，這兩行更新即可。
function readDataFile(name: string): string {
  const candidates = [
    join(PROJECT_ROOT, 'public', 'data', name),
    join(PROJECT_ROOT, 'src', 'data', name),
  ]
  for (const p of candidates) {
    try {
      return readFileSync(p, 'utf8')
    } catch {
      // 試下一個路徑
    }
  }
  throw new Error(`Cannot find ${name} in public/data/ or src/data/`)
}

interface CatalogJson {
  cards: CatalogCard[]
}

interface RewardUnitMeta {
  ntd_per_unit: number | null
  kind: 'face_value' | 'cash_equivalent' | 'non_comparable'
}

interface RawPaymentDataWithUnits extends RawPaymentData {
  reward_units?: Record<string, RewardUnitMeta>
}

// ── Tier 設計：常見繳稅金額（小、中、大）───────────────────────────────────
interface TierSpec {
  amount: number
  label: string
}
const TIERS: TierSpec[] = [
  { amount: 10_000, label: '1 萬元' },
  { amount: 50_000, label: '5 萬元' },
  { amount: 300_000, label: '30 萬元' },
]

// ── 輸出形狀 ────────────────────────────────────────────────────────────────
interface TopOfferEntry {
  bank: string
  bank_code: string
  card_name: string
  source_url: string
  estimated_value: number
  rate?: number
  mode: string
  requires_registration: boolean
  cue: string | null
}

interface TopOfferTier {
  amount: number
  label: string
  offers: TopOfferEntry[]
}

interface TopOffersOutput {
  data_updated: string
  build_id: string
  tiers: TopOfferTier[]
}

// ── 限制條件偵測 + 摘要 cue ───────────────────────────────────────────────
function hasHardRestriction(o: Offer): boolean {
  return o.eligibility_restrictions.length > 0
}

function summarizeCue(o: Offer, ntdValue: number): string | null {
  const cues: string[] = []
  if (o.requires_registration) cues.push('需登錄活動')
  if (o.cap_nt != null && ntdValue >= o.cap_nt) cues.push(`已達上限 ${o.cap_nt.toLocaleString('zh-TW')}`)
  if (o.min != null && o.min > 0) cues.push(`單筆滿 ${o.min.toLocaleString('zh-TW')}`)
  return cues.length > 0 ? cues.join('、') : null
}

// ── 排序與挑選 ──────────────────────────────────────────────────────────────
// 主鍵：value_ntd desc；tiebreak: bank_code asc → id asc。
// 用 strict `<`/`>` 比較（不依賴 localeCompare 在不同 locale / ICU 版本可能的差異），
// 確保 cross-runtime / cross-Node-version 完全 deterministic。
function compareOffers(
  a: { offer: Offer; value_ntd: number },
  b: { offer: Offer; value_ntd: number },
): number {
  if (b.value_ntd !== a.value_ntd) return b.value_ntd - a.value_ntd
  if (a.offer.bank_code < b.offer.bank_code) return -1
  if (a.offer.bank_code > b.offer.bank_code) return 1
  if (a.offer.id < b.offer.id) return -1
  if (a.offer.id > b.offer.id) return 1
  return 0
}

function pickTopForAmount(
  allOffers: Offer[],
  amount: number,
  toNtd: ToNtdFn,
): TopOfferEntry[] {
  // 計算 + 過濾：可適用、有可比較金額（value_ntd > 0）。
  const scored = allOffers
    .map((o) => ({ offer: o, result: resolveOffer(o, amount, { toNtd }) }))
    .filter((x) => x.result.applicable && x.result.value_ntd != null && x.result.value_ntd > 0)
    .map((x) => ({ offer: x.offer, value_ntd: x.result.value_ntd as number, result: x.result }))

  // 先取前 3 名候選（依排序契約）。
  scored.sort(compareOffers)
  const candidates = scored.slice(0, 3)

  // 篩選顯著限制：剔除有 eligibility_restrictions（新戶限定、特殊會員）。
  const unrestricted = candidates.filter((c) => !hasHardRestriction(c.offer))
  const pool = unrestricted.length > 0 ? unrestricted : candidates // 全限制時保留 top 1 並帶 cue

  const picked = pool.slice(0, 1)
  return picked.map((p) => ({
    bank: p.offer.bank,
    bank_code: p.offer.bank_code,
    card_name: p.offer.card_name,
    source_url: p.offer.source_url,
    estimated_value: Math.round(p.value_ntd),
    rate: p.result.rate,
    mode: p.offer.mode,
    requires_registration: p.offer.requires_registration ?? false,
    cue: summarizeCue(p.offer, p.value_ntd),
  }))
}

// ── 產生內容 ────────────────────────────────────────────────────────────────
function buildGeneratedFiles(): GeneratedFile[] {
  const offersRaw = readDataFile('tax_payment_rewards_114.json')
  const catalogRaw = readDataFile('card_catalog_114.json')

  const payment = JSON.parse(offersRaw) as RawPaymentDataWithUnits
  const catalog = JSON.parse(catalogRaw) as CatalogJson

  // 建 cardId → type 查表，給 deriveTags 用（取代 cardCatalog.getCard）。
  const cardTypeById = new Map<string, 'credit' | 'debit'>()
  for (const c of catalog.cards) cardTypeById.set(c.card_id, c.type)
  const getCardType = (id: string): 'credit' | 'debit' | null => cardTypeById.get(id) ?? null

  const offers = flattenPaymentData(payment, getCardType)

  // freshToNtd 用本次 raw payment.reward_units 建表，避免「raw 改動 reward_units 後
  // 第一次 generator run 仍讀到上一次的 payment_reward_units.generated.json」的依賴順序 bug。
  // 行為複製 src/lib/rewardUnits.ts toNtd + getUnitMeta：
  //   - value 為 null/undefined → null
  //   - unit 為空 → 視為 face_value（NT$ 1:1）
  //   - catalog 內 ntd_per_unit 為 null → non_comparable → null
  //   - 其餘 → value * ntd_per_unit
  const freshUnits = payment.reward_units ?? {}
  const freshToNtd: ToNtdFn = (value, unit) => {
    if (value == null) return null
    if (!unit) return value
    const meta = freshUnits[unit]
    if (!meta) return null
    return meta.ntd_per_unit == null ? null : value * meta.ntd_per_unit
  }

  const tiers: TopOfferTier[] = TIERS.map((t) => ({
    amount: t.amount,
    label: t.label,
    offers: pickTopForAmount(offers, t.amount, freshToNtd),
  }))

  // build_id：兩支源 JSON content concat 後 sha256 取前 8 hex（≈ 32 bit），
  // 對 monthly 級資料更新足夠不撞 hash；穩定且 deterministic。
  const buildId = createHash('sha256')
    .update(offersRaw)
    .update(catalogRaw)
    .digest('hex')
    .slice(0, 8)

  const output: TopOffersOutput = {
    data_updated: SITE_CONFIG.lastUpdated,
    build_id: buildId,
    tiers,
  }

  // 穩定序列化：固定 key order（依 TopOffersOutput / TopOfferTier / TopOfferEntry 宣告順序）+ 2-space indent。
  // JSON.stringify 對 object 依插入順序輸出，我們組 output 時已是固定順序，沒問題。
  const topOffersSerialized = JSON.stringify(output, null, 2) + '\n'
  const topOffersCount = tiers.reduce((n, t) => n + t.offers.length, 0)

  // Reward units catalog 也抽出來成獨立小檔，給 rewardUnits.ts static import 用。
  // 從原本的 tax_payment_rewards_114.json 拆出，避免整支 raw JSON 仍被 bundle。
  // Stable key order：依 catalog 內原始順序 serialize，避免 commit noise。
  const rewardUnits = payment.reward_units ?? {}
  const unitsOutput = { reward_units: rewardUnits }
  const unitsSerialized = JSON.stringify(unitsOutput, null, 2) + '\n'

  return [
    {
      path: OUT_PATH,
      content: topOffersSerialized,
      summary: `build_id=${buildId}; ${topOffersCount} offers across ${tiers.length} tiers`,
    },
    {
      path: UNITS_OUT_PATH,
      content: unitsSerialized,
      summary: `${Object.keys(rewardUnits).length} units`,
    },
  ]
}

function writeGeneratedFiles(files: GeneratedFile[]): void {
  for (const file of files) {
    writeFileSync(file.path, file.content, 'utf8')
    console.log(`Wrote ${file.path} (${file.summary})`)
  }
}

function checkGeneratedFiles(files: GeneratedFile[]): boolean {
  const stale: string[] = []
  for (const file of files) {
    try {
      const current = readFileSync(file.path, 'utf8')
      if (current !== file.content) {
        stale.push(`${file.path} (stale; expected ${file.summary})`)
      }
    } catch {
      stale.push(`${file.path} (missing; expected ${file.summary})`)
    }
  }

  if (stale.length === 0) {
    console.log('Generated payment data is up to date.')
    return true
  }

  console.error('Generated payment data is stale. Run:')
  console.error('  pnpm generate:payment-data')
  console.error('Then commit the updated generated files:')
  for (const item of stale) console.error(`  - ${item}`)
  return false
}

// ── 主流程 ──────────────────────────────────────────────────────────────────
function main(): void {
  let mode: Mode
  try {
    mode = parseMode(process.argv.slice(2))
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
    return
  }

  const files = buildGeneratedFiles()
  if (mode === 'write') {
    writeGeneratedFiles(files)
    return
  }

  if (!checkGeneratedFiles(files)) {
    process.exitCode = 1
  }
}

main()
