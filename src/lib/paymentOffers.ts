// 載入 src/data/tax_payment_rewards_114.json，攤平成「一張卡 × 一個優惠」的 Offer[]。
// 也提供 resolveOffer(offer, amount) 給排序與 OfferRow 渲染用。

import rawData from '../data/tax_payment_rewards_114.json'
import { getCard } from './cardCatalog'
import { toNtd } from './rewardUnits'
import type {
  AmountTier,
  BankListItem,
  Offer,
  OfferTag,
  RebateMode,
  ResolveResult,
} from '../types/paymentOffers'

// ── JSON 形狀（最小型別，只標 loader 用到的欄位） ────────────────────────────
interface RawRebate {
  requires_registration?: boolean
  period?: string | null
  mode?: RebateMode
  rate?: number
  fixed?: number
  fixed_unit?: string
  min?: number | null
  base_fixed?: number | null
  cap_nt?: number | null
  cap_label?: string | null
  amount_tiers?: AmountTier[]
}
interface RawInstallment {
  summary?: string
  min_amount?: number | null
}
interface RawCampaign {
  campaign_id: string
  title: string
  source_url: string
  source_id: string | null
  eligible_cards?: string | null
  eligible_card_types?: string[]
  eligible_card_ids?: string[]
  channel?: string[] | null
  rebate?: RawRebate | null
  installment?: RawInstallment | null
  tags?: OfferTag[]
  notes?: string | null
}
interface RawBank {
  bank_code: string
  bank_name: string
  campaigns: RawCampaign[]
}
interface RawData {
  banks: RawBank[]
}

const data = rawData as unknown as RawData

// ── tag 推導（campaign.tags 缺項時的 fallback） ──────────────────────────────
function deriveTags(c: RawCampaign): OfferTag[] {
  const tags = new Set<OfferTag>()
  const ch = (c.channel ?? []).join(' ')
  if (/台灣\s*Pay|台灣行動支付/.test(ch) || /台灣\s*Pay/.test(c.title)) {
    tags.add('taiwan_pay')
  }
  const isDebit =
    (c.eligible_card_types ?? []).includes('debit') ||
    (c.eligible_card_ids ?? []).some((id) => getCard(id)?.type === 'debit')
  const mode = c.rebate?.mode
  if (mode && mode !== 'installment_only' && mode !== 'fee_only') {
    if (isDebit) tags.add('debit_card')
    else tags.add('credit_card')
  } else if (isDebit) {
    // 即使 mode 缺漏，金融卡身分仍應反映
    tags.add('debit_card')
  }
  if (c.installment) tags.add('installment')
  return Array.from(tags)
}

// ── 載入 + 攤平 ─────────────────────────────────────────────────────────────
export function loadOffers(): Offer[] {
  const offers: Offer[] = []
  for (const bank of data.banks) {
    for (const c of bank.campaigns) {
      // 有 rebate 且有 mode → 算一筆 rebate offer
      if (c.rebate && c.rebate.mode) {
        offers.push(toOffer(bank, c, c.rebate.mode))
      } else if (c.installment) {
        // 無 rebate 但有 installment → 一筆 installment-only offer
        offers.push(toOffer(bank, c, 'installment_only'))
      }
    }
  }
  return offers
}

function toOffer(bank: RawBank, c: RawCampaign, mode: RebateMode): Offer {
  const r = c.rebate ?? {}
  const tags = c.tags && c.tags.length > 0 ? c.tags : deriveTags(c)
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
    fixed_unit: r.fixed_unit,
    min: r.min ?? null,
    base_fixed: r.base_fixed ?? null,
    cap_nt: r.cap_nt ?? null,
    cap_label: r.cap_label ?? null,
    amount_tiers: r.amount_tiers,
    eligible_card_ids: eligibleCardIds,
    is_card_specific: eligibleCardIds.length > 0,
    tags,
    requires_registration: r.requires_registration ?? false,
    period: r.period ?? null,
    installment_summary: c.installment?.summary ?? null,
    installment_min_amount: c.installment?.min_amount ?? null,
    note: c.notes ?? null,
    channel: c.channel ?? null,
  }
}

// ── resolveOffer（移植自原型 Personalized Comparison.html L54-92） ───────────
export function resolveOffer(o: Offer, amount: number): ResolveResult {
  if (o.mode === 'installment_only') {
    return { applicable: true, value: null, value_ntd: null, kind: 'installment_only' }
  }
  if (o.mode === 'fee_only') {
    return { applicable: true, value: null, value_ntd: null, kind: 'fee_only' }
  }

  const min = o.min ?? null
  if (min != null && amount > 0 && amount < min) {
    return {
      applicable: false,
      value: 0,
      value_ntd: 0,
      kind: o.mode,
      reason: `需單筆滿 ${fmtNT(min)}`,
    }
  }

  const thresholdLabel =
    (o.mode === 'fixed' || o.mode === 'rate') && o.min != null && o.min > 0
      ? `單筆滿 ${fmtNT(o.min)}`
      : null

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
  for (const b of data.banks) {
    if (b.campaigns.length === 0) continue
    if (seen.has(b.bank_code)) continue
    seen.add(b.bank_code)
    out.push({ code: b.bank_code, name: b.bank_name })
  }
  return out.sort((a, b) => a.code.localeCompare(b.code))
}

// ── 格式化工具 ───────────────────────────────────────────────────────────────
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

// ── 資料版本 metadata（給 Disclaimer 顯示） ─────────────────────────────────
interface DataMeta {
  tax_year: string
  schema_version: string
}
export const DATA_META: DataMeta = {
  tax_year: (rawData as unknown as { tax_year: string }).tax_year,
  schema_version: (rawData as unknown as { schema_version: string }).schema_version,
}
