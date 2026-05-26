import { describe, it, expect } from 'vitest'
import { filterOffersByCards, loadOffers, resolveOffer } from '../src/lib/paymentOffers'
import type { Offer } from '../src/types/paymentOffers'

const offers = loadOffers()

function makeOffer(overrides: Partial<Offer>): Offer {
  return {
    id: 'synthetic-offer',
    bank_code: '999',
    bank: '測試銀行',
    card_name: '測試卡',
    card_scope: null,
    campaign_title: '測試活動',
    source_url: 'https://example.com',
    source_id: null,
    mode: 'rate',
    rate: 1,
    eligible_card_ids: [],
    is_card_specific: false,
    eligibility_restrictions: [],
    tags: ['credit_card'],
    requires_registration: false,
    period: null,
    installment_summary: null,
    installment_min_amount: null,
    installment_max_amount: null,
    note: null,
    channel: null,
    ...overrides,
  }
}

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

describe('resolveOffer installment_only / fee_only 門檻過濾', () => {
  it('installment_only 套用 installment 金額區間', () => {
    const installment = makeOffer({
      mode: 'installment_only',
      rate: undefined,
      tags: ['installment'],
      installment_min_amount: 30000,
      installment_max_amount: 5000000,
    })

    expect(resolveOffer(installment, 0).applicable).toBe(true)
    expect(resolveOffer(installment, 29999).applicable).toBe(false)
    expect(resolveOffer(installment, 30000).applicable).toBe(true)
    expect(resolveOffer(installment, 5000000).applicable).toBe(true)
    expect(resolveOffer(installment, 5000001).applicable).toBe(false)
  })

  it('fee_only 套用 rebate min 門檻但不計算回饋金額', () => {
    const feeOnly = makeOffer({
      mode: 'fee_only',
      rate: undefined,
      min: 5000000,
    })

    expect(resolveOffer(feeOnly, 0).applicable).toBe(true)
    expect(resolveOffer(feeOnly, 4999999).applicable).toBe(false)
    const matched = resolveOffer(feeOnly, 5000000)
    expect(matched.applicable).toBe(true)
    expect(matched.value_ntd).toBeNull()
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

describe('eligibility_restrictions 標籤與排除篩選', () => {
  function byCampaign(id: string) {
    return offers.find((o) => o.id.endsWith(`_${id}`))
  }

  it('loader 預設無標註者為空陣列', () => {
    const general = byCampaign('rebate_general')
    expect(general).toBeTruthy()
    expect(general!.eligibility_restrictions).toEqual([])
  })

  it('new_customer 標籤覆蓋預期 campaign', () => {
    const ids = [
      'newnewbank_tax_rebate',
      'jkopay_new_customer_bonus',
      'yongchuan_world_newcard_bonus',
      'yongfu_world_newcard_bonus',
      'online_installment_new_user',
      'mcnewcard_tax_rebate',
    ]
    for (const id of ids) {
      const o = byCampaign(id)
      expect(o, `missing campaign ${id}`).toBeTruthy()
      expect(o!.eligibility_restrictions).toContain('new_customer')
    }
  })

  it('special_member 標籤涵蓋華南領航、富邦理財、台新財管等', () => {
    const ids = [
      'vip_rui',
      'vip_meng',
      'wealth_steady',
      'wealth_rebate_installment',
      'private_client',
      'vip_top_tier',
      'fb_depositor',
      'salary_installment',
      'yongfu_world_newcard_bonus',
    ]
    for (const id of ids) {
      const o = byCampaign(id)
      expect(o, `missing campaign ${id}`).toBeTruthy()
      expect(o!.eligibility_restrictions).toContain('special_member')
    }
  })

  it('單純自動扣繳設定不標 special_member', () => {
    const ids = [
      'installment_autopay',
      'spending_bonus_autopay',
      'auto_debit_rebate',
    ]
    for (const id of ids) {
      const o = byCampaign(id)
      expect(o, `missing campaign ${id}`).toBeTruthy()
      expect(o!.eligibility_restrictions).not.toContain('special_member')
    }
  })

  it('反向客群與純卡別限制依規約不標 special_member', () => {
    const unrestrictedIds = [
      'general_rebate',
      'general_installment_0',
      'rebate_world',
      'premium_card_rebate',
    ]
    for (const id of unrestrictedIds) {
      const o = byCampaign(id)
      expect(o, `missing campaign ${id}`).toBeTruthy()
      expect(o!.eligibility_restrictions).not.toContain('special_member')
    }
  })

  it('新晉財管不是一般新戶', () => {
    const wealthNewcomer = byCampaign('wealth_newcomer')
    expect(wealthNewcomer).toBeTruthy()
    expect(wealthNewcomer!.eligibility_restrictions).toContain('special_member')
    expect(wealthNewcomer!.eligibility_restrictions).not.toContain('new_customer')
  })

  it('資料完整性：新戶與銀行身份關鍵字不應漏標', () => {
    const newCustomerPattern = /新戶|新辦|新申辦|未辦過|從未申辦|首次申辦|成功開立/
    const specialMemberPattern =
      /存戶|薪轉戶|理財客戶|私銀|私人|財管|理財|會員|VIP|貴賓|尊榮|領航|穩富|恆富|智富|桂冠|亞資|豐盛|翡翠|金鑽|千萬|尊爵|富裕|登峰|菁英|優先理財/
    const specialAllowlist = new Set([
      '812_general_rebate',
      '812_general_installment_0',
      '812_richart_jcb_single_tx_bonus',
    ])

    for (const o of offers) {
      const searchable = `${o.campaign_title} ${o.card_name}`
      if (newCustomerPattern.test(searchable)) {
        expect(
          o.eligibility_restrictions,
          `${o.id} contains new-customer wording`,
        ).toContain('new_customer')
      }

      if (specialMemberPattern.test(searchable) && !specialAllowlist.has(o.id)) {
        expect(
          o.eligibility_restrictions,
          `${o.id} contains special-member wording`,
        ).toContain('special_member')
      }
    }
  })

  it('「分期新戶」依廣義新戶規約標記，非私銀／財管會員仍不標特殊身份', () => {
    const installmentNewUser = byCampaign('online_installment_new_user')
    expect(installmentNewUser).toBeTruthy()
    expect(installmentNewUser!.eligibility_restrictions).toContain('new_customer')

    const taishinGeneral = byCampaign('general_rebate')
    expect(taishinGeneral).toBeTruthy()
    expect(taishinGeneral!.eligibility_restrictions).toEqual([])
  })

  function applyExclude(
    src: typeof offers,
    excludeNew: boolean,
    excludeSpecial: boolean,
  ) {
    return src.filter((o) => {
      if (excludeNew && o.eligibility_restrictions.includes('new_customer')) return false
      if (excludeSpecial && o.eligibility_restrictions.includes('special_member'))
        return false
      return true
    })
  }

  it('truth table: 兩 exclude 皆 false → 全集', () => {
    expect(applyExclude(offers, false, false).length).toBe(offers.length)
  })

  it('truth table: 僅排除新戶 → 僅 new_customer offer 消失', () => {
    const removed = offers.filter((o) =>
      o.eligibility_restrictions.includes('new_customer'),
    )
    expect(removed.length).toBeGreaterThan(0)
    const out = applyExclude(offers, true, false)
    expect(out.length).toBe(offers.length - removed.length)
    for (const r of removed) expect(out.find((o) => o.id === r.id)).toBeUndefined()
  })

  it('truth table: 僅排除特殊會員 → 僅 special_member offer 消失', () => {
    const removed = offers.filter((o) =>
      o.eligibility_restrictions.includes('special_member'),
    )
    expect(removed.length).toBeGreaterThan(0)
    const out = applyExclude(offers, false, true)
    expect(out.length).toBe(offers.length - removed.length)
  })

  it('truth table: 兩者皆排除 → 並集消失，殘餘皆無限制', () => {
    const restricted = offers.filter((o) => o.eligibility_restrictions.length > 0)
    const out = applyExclude(offers, true, true)
    expect(out.length).toBe(offers.length - restricted.length)
    for (const o of out) expect(o.eligibility_restrictions).toEqual([])
  })
})
