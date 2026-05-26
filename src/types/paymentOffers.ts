// 繳稅回饋頁的「攤平」型別：一張卡 × 一個優惠 = 一個 Offer。
// 由 src/lib/paymentOffers.ts 從 src/data/tax_payment_rewards_114.json 載入。

export type RebateMode =
  | 'rate'              // 單一回饋率
  | 'rate-tiered'       // 階梯回饋率（依金額）
  | 'fixed'             // 定額（NT$ 或紅利點數等價）
  | 'unit_per_amount'   // 每 N 元累積 M 單位（floor）
  | 'installment_only'  // 僅分期，不算金額
  | 'fee_only'          // 僅手續費說明

export type OfferTag = 'taiwan_pay' | 'credit_card' | 'debit_card' | 'installment'

export type EligibilityRestriction = 'new_customer' | 'special_member'

export interface CatalogCard {
  card_id: string
  bank_code: string
  bank_name: string
  display_name_zh: string
  type: 'credit' | 'debit'
  card_network: string | null
  is_generic: boolean
  image_url: string | null
  notes: string | null
}

export interface CatalogBankGroup {
  bank_code: string
  bank_name: string
  cards: CatalogCard[]
}

export type AmountTier =
  | { kind: 'rate'; min: number; rate: number; cap_nt: number | null; label: string }
  | {
      kind: 'fixed'
      min: number
      fixed: number
      fixed_unit: string
      cap_nt?: number | null
      label: string
    }

export interface Offer {
  id: string                    // 唯一 key：`${bank_code}_${campaign_id}`
  bank_code: string
  bank: string                  // 顯示用銀行名（同 JSON 的 bank_name）
  card_name: string             // 卡名顯示（eligible_cards 主體）
  card_scope: string | null     // 卡別子描述（例：全卡別、白金以上）
  campaign_title: string
  source_url: string
  source_id: string | null

  mode: RebateMode
  rate?: number                 // mode = 'rate' 必填
  fixed?: number                // mode = 'fixed' / 'unit_per_amount' 必填
  per_amount?: number           // mode = 'unit_per_amount' 必填：每 N 元
  fixed_unit?: string           // 顯示單位字串（例：「元刷卡金」）
  min?: number | null           // 單筆門檻
  base_min?: number | null      // base_fixed 對應門檻
  base_fixed?: number | null    // rate 模式可加的基本定額
  cap_nt?: number | null        // 數字回饋上限
  cap_label?: string | null     // 人類可讀上限字串
  amount_tiers?: AmountTier[]   // mode = 'rate-tiered' 必填

  eligible_card_ids: string[]   // 空陣列 = 全卡別；非空 = 限定 card_id
  is_card_specific: boolean     // 衍生：eligible_card_ids.length > 0

  eligibility_restrictions: EligibilityRestriction[] // 身分限制；空陣列 = 無

  tags: OfferTag[]
  requires_registration?: boolean
  period?: string | null
  installment_summary?: string | null
  installment_min_amount?: number | null
  installment_max_amount?: number | null
  note?: string | null
  channel?: string[] | null
}

export interface ResolveResult {
  applicable: boolean
  kind: RebateMode
  value: number | null          // 估算回饋金額；null 表示無金額（如僅分期）
  value_ntd: number | null      // 排序與輔助顯示用 NT$ 等值；非「官方回饋金額」
  rate?: number                 // 適用回饋率
  capped?: boolean              // 是否觸發上限
  cap?: number | null
  tier_label?: string           // tiered 時：適用的級距描述
  threshold_label?: string | null // 單筆門檻說明（fixed/rate 且 min > 0 時）
  reason?: string               // 不符門檻時：原因
  unit?: string                 // 顯示單位
}

export interface BankListItem {
  code: string
  name: string
}
