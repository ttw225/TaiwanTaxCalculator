import { describe, it, expect } from 'vitest'
import { filterOffersByCards, loadOffers, resolveOffer } from '../src/lib/paymentOffers'

const offers = loadOffers()

describe('loadOffers', () => {
  it('returns expected count and shape', () => {
    expect(offers.length).toBeGreaterThan(0)
    for (const o of offers) {
      expect(typeof o.bank_code).toBe('string')
      expect(Array.isArray(o.eligible_card_ids)).toBe(true)
      expect(o.is_card_specific).toBe(o.eligible_card_ids.length > 0)
    }
  })

  it('has both 全卡別 and 限定卡 campaigns', () => {
    const general = offers.filter((o) => !o.is_card_specific)
    const specific = offers.filter((o) => o.is_card_specific)
    expect(general.length).toBeGreaterThan(0)
    expect(specific.length).toBeGreaterThan(0)
  })
})

describe('filterOffersByCards 契約', () => {
  it('空 selection 視為全部', () => {
    const out = filterOffersByCards(offers, new Set())
    expect(out.length).toBe(offers.length)
  })

  it('選 1 張卡：全卡別 campaign 依 bank_code 命中', () => {
    // 找一張屬於有「全卡別」campaign 的銀行
    const generalSample = offers.find((o) => !o.is_card_specific)
    expect(generalSample).toBeTruthy()
    const bankCode = generalSample!.bank_code

    // 找該行的任一張限定卡（用 catalog 推算就太繞，這裡直接組一個假 id 不可行）
    // 改用：選一張該行被 campaign 點名的卡，確認該行所有全卡別 campaign 都進入結果
    const cardId = offers.find(
      (o) => o.bank_code === bankCode && o.is_card_specific,
    )?.eligible_card_ids[0]
    if (!cardId) return // 該行沒任何限定卡 campaign，跳過此 case

    const out = filterOffersByCards(offers, new Set([cardId]))
    const allGeneralOfBank = offers.filter(
      (o) => !o.is_card_specific && o.bank_code === bankCode,
    )
    for (const g of allGeneralOfBank) {
      expect(out.find((o) => o.id === g.id)).toBeTruthy()
    }
  })

  it('選 1 張卡：限定卡 campaign 只在 eligible_card_ids 命中時才出現', () => {
    const specificSample = offers.find((o) => o.is_card_specific)
    expect(specificSample).toBeTruthy()
    const cardId = specificSample!.eligible_card_ids[0]

    const out = filterOffersByCards(offers, new Set([cardId]))
    // 結果中所有限定卡 campaign 都必須包含此 cardId
    for (const o of out) {
      if (!o.is_card_specific) continue
      expect(o.eligible_card_ids).toContain(cardId)
    }
  })

  it('未知 cardId：等於空選的子集（不爆）', () => {
    const out = filterOffersByCards(offers, new Set(['bank999_unknown']))
    // 未知 id 不對應任何 bank，全卡別 campaign 全不命中；限定卡也不命中
    expect(out.length).toBe(0)
  })
})

describe('resolveOffer rate-tiered 門檻過濾', () => {
  it('金額低於所有 tier 最低門檻時 applicable = false', () => {
    const tiered = offers.find(
      (o) => o.mode === 'rate-tiered' &&
        o.amount_tiers &&
        o.amount_tiers.length > 0 &&
        Math.min(...o.amount_tiers.map((t) => t.min)) > 0,
    )
    expect(tiered).toBeTruthy()
    const lowestMin = Math.min(...tiered!.amount_tiers!.map((t) => t.min))
    const r = resolveOffer(tiered!, lowestMin - 1)
    expect(r.applicable).toBe(false)
    expect(r.reason).toBeTruthy()
  })

  it('金額達到 tier 門檻時 applicable = true', () => {
    const tiered = offers.find(
      (o) => o.mode === 'rate-tiered' && o.amount_tiers && o.amount_tiers.length > 0,
    )
    expect(tiered).toBeTruthy()
    const highestMin = Math.max(...tiered!.amount_tiers!.map((t) => t.min))
    const r = resolveOffer(tiered!, highestMin)
    expect(r.applicable).toBe(true)
  })

  it('金額為 0 時 tiered offer 仍顯示（尚未輸入）', () => {
    const tiered = offers.find(
      (o) => o.mode === 'rate-tiered' &&
        o.amount_tiers &&
        o.amount_tiers.length > 0 &&
        Math.min(...o.amount_tiers.map((t) => t.min)) > 0,
    )
    expect(tiered).toBeTruthy()
    const r = resolveOffer(tiered!, 0)
    expect(r.applicable).toBe(true)
  })
})

describe('resolveOffer unit_per_amount', () => {
  const anaOffer = offers.find((o) => o.id === '822_ana_miles_rebate')

  it('ANA campaign 已遷移到 unit_per_amount', () => {
    expect(anaOffer).toBeTruthy()
    expect(anaOffer!.mode).toBe('unit_per_amount')
    expect(anaOffer!.per_amount).toBe(300)
    expect(anaOffer!.fixed).toBe(1)
    expect(anaOffer!.fixed_unit).toBe('哩')
  })

  it('amount = 100,000,000 → 333,333 哩（floor，非 0.333% 近似）', () => {
    const r = resolveOffer(anaOffer!, 100_000_000)
    expect(r.value).toBe(333_333)
    expect(r.unit).toBe('哩')
    expect(r.value_ntd).toBe(333_333 * 0.5)
  })

  it('amount = 299 → 0 哩；amount = 600 → 2 哩', () => {
    expect(resolveOffer(anaOffer!, 299).value).toBe(0)
    expect(resolveOffer(anaOffer!, 600).value).toBe(2)
  })

  it('合成 cap_nt 觸發 capped', () => {
    const capped = { ...anaOffer!, cap_nt: 5 }
    const r = resolveOffer(capped, 100_000)
    expect(r.value).toBe(5)
    expect(r.capped).toBe(true)
    expect(r.cap).toBe(5)
  })

  it('資料完整性：所有 unit_per_amount campaign 都有 per_amount/fixed/fixed_unit', () => {
    const all = offers.filter((o) => o.mode === 'unit_per_amount')
    expect(all.length).toBeGreaterThan(0)
    for (const o of all) {
      expect(o.per_amount && o.per_amount > 0).toBeTruthy()
      expect(o.fixed && o.fixed > 0).toBeTruthy()
      expect(o.fixed_unit).toBeTruthy()
    }
  })
})

describe('deriveTags via loadOffers', () => {
  it('每個 offer tags 是 4 種已知值的子集', () => {
    const allowed = new Set(['taiwan_pay', 'credit_card', 'debit_card', 'installment'])
    for (const o of offers) {
      for (const t of o.tags) expect(allowed.has(t)).toBe(true)
    }
  })
})
