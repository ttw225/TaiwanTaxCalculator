// 純函式 + raw JSON 型別。可在 Node script 與瀏覽器執行；無 module-level 資料相依。
// 由 paymentOffers.ts 與 scripts/generate-payment-top-offers.ts 共用，避免邏輯漂移。

import { toNtd as defaultToNtd } from './rewardUnits'
import type {
  AmountTier,
  EligibilityRestriction,
  Offer,
  OfferTag,
  RebateMode,
  ResolveResult,
} from '../types/paymentOffers'

// 單位 → NT$ 換算函式 type。
// production 路徑用 rewardUnits.toNtd（讀 module-init 載入的 generated catalog）；
// build script 用自己建的 toNtd（讀本次 raw JSON 的 reward_units），
// 避免「raw reward_units 更新後第一次 generator run 用到舊 catalog」的 bug。
export type ToNtdFn = (
  value: number | null | undefined,
  unit: string | undefined | null,
) => number | null

// ── JSON 形狀（只標 loader 用到的欄位） ────────────────────────────────────────
export interface RawRebate {
  requires_registration?: boolean
  period?: string | null
  mode?: RebateMode
  rate?: number
  fixed?: number
  per_amount?: number
  fixed_unit?: string
  min?: number | null
  base_fixed?: number | null
  cap_nt?: number | null
  cap_label?: string | null
  amount_tiers?: AmountTier[]
}

export interface RawInstallment {
  summary?: string
  min_amount?: number | null
  max_amount?: number | null
}

export interface RawCampaign {
  campaign_id: string
  title: string
  source_url: string
  source_id: string | null
  eligible_cards?: string | null
  eligible_card_types?: string[]
  eligible_card_ids?: string[]
  eligibility_restrictions?: EligibilityRestriction[]
  channel?: string[] | null
  rebate?: RawRebate | null
  installment?: RawInstallment | null
  tags?: OfferTag[]
  notes?: string | null
}

export interface RawBank {
  bank_code: string
  bank_name: string
  campaigns: RawCampaign[]
}

export interface RawPaymentData {
  tax_year?: string
  schema_version?: string
  banks: RawBank[]
}

// ── tag 推導（pure；caller 注入卡別型別查詢） ────────────────────────────────
// `getCardType` 給 cardId，回 'credit' | 'debit' | null。
// 從 paymentOffers.ts 呼叫時包裝 cardCatalog.getCard；從 script 呼叫時可自帶 catalog map。
export function deriveTags(
  c: RawCampaign,
  getCardType: (cardId: string) => 'credit' | 'debit' | null,
): OfferTag[] {
  const tags = new Set<OfferTag>()
  const ch = (c.channel ?? []).join(' ')
  if (/台灣\s*Pay|台灣行動支付/.test(ch) || /台灣\s*Pay/.test(c.title)) {
    tags.add('taiwan_pay')
  }
  const isDebit =
    (c.eligible_card_types ?? []).includes('debit') ||
    (c.eligible_card_ids ?? []).some((id) => getCardType(id) === 'debit')
  const mode = c.rebate?.mode
  if (mode && mode !== 'installment_only' && mode !== 'fee_only') {
    if (isDebit) tags.add('debit_card')
    else tags.add('credit_card')
  } else if (isDebit) {
    tags.add('debit_card')
  }
  if (c.installment) tags.add('installment')
  return Array.from(tags)
}

// ── 攤平：一張卡 × 一個優惠 = 一個 Offer（pure） ─────────────────────────────
export function toOffer(
  bank: RawBank,
  c: RawCampaign,
  mode: RebateMode,
  tags: OfferTag[],
): Offer {
  const r = c.rebate ?? {}
  const eligibleCardIds = c.eligible_card_ids ?? []
  return {
    id: `${bank.bank_code}_${c.campaign_id}`,
    bank_code: bank.bank_code,
    bank: bank.bank_name,
    card_name: c.eligible_cards ?? bank.bank_name,
    card_scope: null,
    campaign_title: c.title,
    source_url: c.source_url,
    source_id: c.source_id ?? null,
    mode,
    rate: r.rate,
    fixed: r.fixed,
    per_amount: r.per_amount,
    fixed_unit: r.fixed_unit,
    min: r.min ?? null,
    base_fixed: r.base_fixed ?? null,
    cap_nt: r.cap_nt ?? null,
    cap_label: r.cap_label ?? null,
    amount_tiers: r.amount_tiers,
    eligible_card_ids: eligibleCardIds,
    is_card_specific: eligibleCardIds.length > 0,
    eligibility_restrictions: c.eligibility_restrictions ?? [],
    tags,
    requires_registration: r.requires_registration ?? false,
    period: r.period ?? null,
    installment_summary: c.installment?.summary ?? null,
    installment_min_amount: c.installment?.min_amount ?? null,
    installment_max_amount: c.installment?.max_amount ?? null,
    note: c.notes ?? null,
    channel: c.channel ?? null,
  }
}

// ── 門檻文字 ─────────────────────────────────────────────────────────────────
// installment_only 取 installment_min/max_amount；其他模式取 r.min。
// 用於 resolveOffer return 的 threshold_label，以及不適用時 reason 的人類訊息。
export function formatThresholdLabel(
  min: number | null | undefined,
  max: number | null | undefined,
): string | null {
  if (min != null && max != null) return `單筆 ${fmtNT(min)} 至 ${fmtNT(max)}`
  if (min != null) return `單筆滿 ${fmtNT(min)}`
  if (max != null) return `單筆不超過 ${fmtNT(max)}`
  return null
}

// ── 攤平整支 raw payment data 成 Offer[]（pure） ─────────────────────────────
// 規則：有 rebate.mode → rebate offer；無 rebate 但有 installment → installment_only offer。
export function flattenPaymentData(
  raw: RawPaymentData,
  getCardType: (cardId: string) => 'credit' | 'debit' | null,
): Offer[] {
  const offers: Offer[] = []
  for (const bank of raw.banks) {
    for (const c of bank.campaigns) {
      const tags = c.tags && c.tags.length > 0 ? c.tags : deriveTags(c, getCardType)
      if (c.rebate && c.rebate.mode) {
        offers.push(toOffer(bank, c, c.rebate.mode, tags))
      } else if (c.installment) {
        offers.push(toOffer(bank, c, 'installment_only', tags))
      }
    }
  }
  return offers
}

// ── 格式化工具（pure） ───────────────────────────────────────────────────────
export function fmtNT(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  return `NT$ ${Math.round(n).toLocaleString('zh-TW')}`
}

export function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—'
  return `${n}%`
}

export function clampAmount(n: number): number {
  if (!isFinite(n) || n < 0) return 0
  return n
}

// ── resolveOffer（移植自原型 Personalized Comparison.html L54-92；pure） ─────
// opts.toNtd 是給 build script 注入「以本次 raw catalog 為準」的換算函式用——
// 因為 rewardUnits.toNtd 在 module init 才載入 generated catalog，
// script 第一次跑時拿到的會是上一個 build 的舊版本（見 scripts/generate-payment-top-offers.ts
// 內 freshToNtd 的說明）。production 路徑省略 opts 即可（default 走 rewardUnits.toNtd）。
export function resolveOffer(
  o: Offer,
  amount: number,
  opts?: { toNtd?: ToNtdFn },
): ResolveResult {
  const toNtd = opts?.toNtd ?? defaultToNtd

  // installment_only 取 installment_min/max_amount；其他模式取 r.min（max 不適用）。
  // dev #100 加 max_amount 後，門檻判斷統一在最上面，避免在各 mode 內重複處理。
  const min = o.mode === 'installment_only' ? (o.installment_min_amount ?? null) : (o.min ?? null)
  const max = o.mode === 'installment_only' ? (o.installment_max_amount ?? null) : null
  const thresholdLabel = formatThresholdLabel(min, max)

  if (min != null && amount > 0 && amount < min) {
    return {
      applicable: false,
      value: 0,
      value_ntd: 0,
      kind: o.mode,
      reason: thresholdLabel ? `需${thresholdLabel}` : `需單筆滿 ${fmtNT(min)}`,
    }
  }
  if (max != null && amount > 0 && amount > max) {
    return {
      applicable: false,
      value: 0,
      value_ntd: 0,
      kind: o.mode,
      reason: thresholdLabel ? `需${thresholdLabel}` : `需單筆不超過 ${fmtNT(max)}`,
    }
  }

  if (o.mode === 'installment_only') {
    return {
      applicable: true,
      value: null,
      value_ntd: null,
      kind: 'installment_only',
      threshold_label: thresholdLabel,
    }
  }
  if (o.mode === 'fee_only') {
    return {
      applicable: true,
      value: null,
      value_ntd: null,
      kind: 'fee_only',
      threshold_label: thresholdLabel,
    }
  }

  if (o.mode === 'unit_per_amount') {
    const per = o.per_amount ?? 0
    const step = o.fixed ?? 0
    const raw = per > 0 ? Math.floor(amount / per) * step : 0
    const cap = o.cap_nt ?? null
    const capped = cap != null && raw > cap
    const value = capped ? cap! : raw
    const unit = o.fixed_unit ?? '元'
    return {
      applicable: true,
      kind: 'unit_per_amount',
      value,
      value_ntd: toNtd(value, unit),
      unit,
      capped,
      cap,
      threshold_label: thresholdLabel,
    }
  }

  if (o.mode === 'fixed') {
    const unit = o.fixed_unit ?? '元'
    const value = o.fixed ?? null
    return {
      applicable: true,
      kind: 'fixed',
      value,
      value_ntd: toNtd(value, unit),
      unit,
      threshold_label: thresholdLabel,
    }
  }

  if (o.mode === 'rate') {
    const rate = o.rate ?? 0
    let raw = (amount * rate) / 100
    if (o.base_fixed) raw += o.base_fixed
    let capped = false
    let value = raw
    if (o.cap_nt != null && raw > o.cap_nt + (o.base_fixed ?? 0)) {
      value = o.cap_nt + (o.base_fixed ?? 0)
      capped = true
    }
    const unit = o.fixed_unit ?? '元'
    return {
      applicable: true,
      kind: 'rate',
      value,
      value_ntd: toNtd(value, unit),
      rate,
      capped,
      cap: o.cap_nt,
      unit,
      threshold_label: thresholdLabel,
    }
  }

  if (o.mode === 'rate-tiered' && o.amount_tiers && o.amount_tiers.length > 0) {
    const tiers = [...o.amount_tiers].sort((a, b) => b.min - a.min)
    const matched = tiers.find((x) => amount >= x.min)
    if (!matched && amount > 0) {
      const lowestMin = tiers[tiers.length - 1].min
      return {
        applicable: false,
        value: 0,
        value_ntd: 0,
        kind: o.mode,
        reason: `需單筆滿 ${fmtNT(lowestMin)}`,
      }
    }
    const t = matched ?? tiers[tiers.length - 1]

    if (t.kind === 'fixed') {
      const raw = t.fixed
      const cap = t.cap_nt ?? null
      const capped = cap != null && raw > cap
      const value = capped ? cap : raw
      return {
        applicable: true,
        kind: 'rate-tiered',
        value,
        value_ntd: toNtd(value, t.fixed_unit),
        capped,
        cap,
        tier_label: t.label,
        unit: t.fixed_unit,
      }
    }

    const raw = (amount * t.rate) / 100
    const capped = t.cap_nt != null && raw > t.cap_nt
    const value = capped ? t.cap_nt! : raw
    const unit = o.fixed_unit ?? '元'
    return {
      applicable: true,
      kind: 'rate-tiered',
      value,
      value_ntd: toNtd(value, unit),
      rate: t.rate,
      capped,
      cap: t.cap_nt,
      tier_label: t.label,
      unit,
    }
  }

  return { applicable: true, value: null, value_ntd: null, kind: o.mode }
}
