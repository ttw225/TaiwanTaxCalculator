import { describe, it, expect } from 'vitest'
import { fmtNtRatio, getUnitMeta, toNtd } from '../src/lib/rewardUnits'
import { loadOffers, resolveOffer } from '../src/lib/paymentOffers'
import rawData from '../src/data/tax_payment_rewards_114.json'

describe('toNtd', () => {
  it('台灣 Pay 紅利 10:1 → 600 點 = NT$60', () => {
    expect(toNtd(600, '點台灣 Pay 紅利')).toBe(60)
  })

  it('元刷卡金 = 1:1', () => {
    expect(toNtd(60, '元刷卡金')).toBe(60)
  })

  it('哩 = NT$0.5/哩', () => {
    expect(toNtd(600, '哩')).toBe(300)
  })

  it('未知單位 → null', () => {
    expect(toNtd(123, '未來新單位')).toBeNull()
  })

  it('undefined unit → 視為 NT$', () => {
    expect(toNtd(50, undefined)).toBe(50)
    expect(toNtd(50, '元')).toBe(50)
  })

  it('value 為 null/undefined → null', () => {
    expect(toNtd(null, '元')).toBeNull()
    expect(toNtd(undefined, '元')).toBeNull()
  })
})

describe('getUnitMeta', () => {
  it('元刷卡金 → face_value', () => {
    expect(getUnitMeta('元刷卡金').kind).toBe('face_value')
  })
  it('點台灣 Pay 紅利 → cash_equivalent', () => {
    expect(getUnitMeta('點台灣 Pay 紅利').kind).toBe('cash_equivalent')
  })
  it('哩 → cash_equivalent', () => {
    const m = getUnitMeta('哩')
    expect(m.kind).toBe('cash_equivalent')
    expect(m.ntd_per_unit).toBe(0.5)
  })
  it('未知單位 → non_comparable + ntd_per_unit null', () => {
    const m = getUnitMeta('未來新單位')
    expect(m.kind).toBe('non_comparable')
    expect(m.ntd_per_unit).toBeNull()
  })
})

describe('fmtNtRatio', () => {
  it('整數不顯示小數', () => {
    expect(fmtNtRatio(1)).toBe('NT$ 1')
  })
  it('保留必要小數', () => {
    expect(fmtNtRatio(0.5)).toBe('NT$ 0.5')
    expect(fmtNtRatio(0.1)).toBe('NT$ 0.1')
  })
})

describe('資料完整性：JSON 內所有 fixed_unit 必須在 catalog', () => {
  const catalog = (
    rawData as unknown as {
      reward_units: Record<string, { ntd_per_unit: number | null; kind: string }>
    }
  ).reward_units

  it('catalog 存在且非空', () => {
    expect(catalog).toBeTruthy()
    expect(Object.keys(catalog).length).toBeGreaterThan(0)
  })

  it('每個 fixed_unit / amount_tiers[].fixed_unit 都已登錄', () => {
    const seen = new Set<string>()
    for (const offer of loadOffers()) {
      if (offer.fixed_unit) seen.add(offer.fixed_unit)
      for (const t of offer.amount_tiers ?? []) {
        if (t.kind === 'fixed' && t.fixed_unit) seen.add(t.fixed_unit)
      }
    }
    const missing = [...seen].filter((u) => !(u in catalog))
    expect(missing, `Units missing from reward_units catalog: ${missing.join(', ')}`).toEqual(
      [],
    )
  })

  it('catalog 每個 entry 的 kind 與 ntd_per_unit 格式合法', () => {
    const validKinds = new Set(['face_value', 'cash_equivalent', 'non_comparable'])
    for (const [unit, meta] of Object.entries(catalog)) {
      expect(validKinds.has(meta.kind), `${unit} kind=${meta.kind}`).toBe(true)
      if (meta.kind === 'non_comparable') {
        expect(meta.ntd_per_unit, `${unit} non_comparable 應為 null`).toBeNull()
      } else {
        expect(typeof meta.ntd_per_unit, `${unit} 需數字`).toBe('number')
        expect(Number.isFinite(meta.ntd_per_unit), `${unit} 需 finite`).toBe(true)
        expect(meta.ntd_per_unit, `${unit} 需 > 0`).toBeGreaterThan(0)
      }
    }
  })
})

describe('resolveOffer value_ntd', () => {
  const offers = loadOffers()

  it('fixed 模式：value_ntd 反映 unit 換算', () => {
    const twPay = offers.find(
      (o) => o.mode === 'fixed' && o.fixed_unit === '點台灣 Pay 紅利',
    )
    expect(twPay, '需有 fixed_unit=點台灣 Pay 紅利 的 offer').toBeTruthy()
    const r = resolveOffer(twPay!, 60000)
    expect(r.value).toBe(twPay!.fixed)
    expect(r.value_ntd).toBe((twPay!.fixed ?? 0) * 0.1)
  })

  it('rate 模式：value_ntd = value（NT$）', () => {
    const rate = offers.find((o) => o.mode === 'rate')
    expect(rate, '需有 rate offer').toBeTruthy()
    const r = resolveOffer(rate!, 60000)
    expect(r.value_ntd).toBe(r.value)
  })

  it('installment_only / fee_only：value_ntd = null', () => {
    const inst = offers.find((o) => o.mode === 'installment_only')
    if (inst) {
      const r = resolveOffer(inst, 60000)
      expect(r.value_ntd).toBeNull()
    }
    const fee = offers.find((o) => o.mode === 'fee_only')
    if (fee) {
      const r = resolveOffer(fee, 60000)
      expect(r.value_ntd).toBeNull()
    }
  })
})

describe('排序：依 NT$ 等值排，而非原始 value', () => {
  // 對應原 bug：600 點台灣 Pay 紅利 (≈ NT$60) 不應排到 100 元刷卡金之前。
  // 構造 mock ResolveResult 走真實的 sort 比較邏輯（與 ResultList.sortRanked 同義）。
  function sortByNtd<T extends { value_ntd: number | null }>(rows: T[]): T[] {
    return [...rows].sort((a, b) => {
      const va = a.value_ntd ?? -Infinity
      const vb = b.value_ntd ?? -Infinity
      return vb - va
    })
  }

  it('600 點台灣 Pay 紅利 (≈NT$60) 排在 NT$100 刷卡金之後', () => {
    const twPay = { id: 'twPay', value: 600, value_ntd: toNtd(600, '點台灣 Pay 紅利') }
    const card = { id: 'card', value: 100, value_ntd: toNtd(100, '元刷卡金') }
    const sorted = sortByNtd([twPay, card])
    expect(sorted[0].id).toBe('card')
    expect(sorted[1].id).toBe('twPay')
  })

  it('600 哩 (≈NT$300) 排在 NT$100 刷卡金之前', () => {
    const mile = { id: 'mile', value: 600, value_ntd: toNtd(600, '哩') }
    const card = { id: 'card', value: 100, value_ntd: toNtd(100, '元刷卡金') }
    const sorted = sortByNtd([mile, card])
    expect(sorted[0].id).toBe('mile')
  })

  it('value_ntd = null 的方案排到最後', () => {
    const unknown = { id: 'unknown', value: 999, value_ntd: null }
    const card = { id: 'card', value: 1, value_ntd: 1 }
    const sorted = sortByNtd([unknown, card])
    expect(sorted[0].id).toBe('card')
    expect(sorted[1].id).toBe('unknown')
  })
})
