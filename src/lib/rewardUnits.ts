// 單位 → NT$ 換算與顯示策略。catalog 來源為 src/data/tax_payment_rewards_114.json
// 的 reward_units 欄位，讓資料和換算規則同源維護。

import rawData from '../data/tax_payment_rewards_114.json'

export type RewardUnitKind = 'face_value' | 'cash_equivalent' | 'non_comparable'

export interface RewardUnitMeta {
  ntd_per_unit: number | null
  kind: RewardUnitKind
}

const CATALOG: Record<string, RewardUnitMeta> =
  (rawData as unknown as { reward_units?: Record<string, RewardUnitMeta> }).reward_units ?? {}

const warned = new Set<string>()

export function getUnitMeta(unit: string | undefined | null): RewardUnitMeta {
  if (!unit) return { ntd_per_unit: 1, kind: 'face_value' }
  const m = CATALOG[unit]
  if (m) return m
  if (import.meta.env.DEV && !warned.has(unit)) {
    warned.add(unit)
    console.warn(`[rewardUnits] unknown unit: ${unit}`)
  }
  return { ntd_per_unit: null, kind: 'non_comparable' }
}

export function toNtd(
  value: number | null | undefined,
  unit: string | undefined | null,
): number | null {
  if (value == null) return null
  const { ntd_per_unit } = getUnitMeta(unit)
  return ntd_per_unit == null ? null : value * ntd_per_unit
}

// 給「以 1 哩 ≈ NT$ 0.5 估算」這類比例顯示用，保留必要小數。
export function fmtNtRatio(n: number): string {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
  return `NT$ ${s}`
}

// 「以 1 [單位] ≈ NT$ X 估算」的說明字串；ratio 為 1 時回 null（不顯示）。
export function ratioHintText(unit: string | undefined | null): string | null {
  const meta = getUnitMeta(unit)
  if (meta.kind !== 'cash_equivalent' || meta.ntd_per_unit == null || meta.ntd_per_unit === 1) {
    return null
  }
  return `以 1 ${unit} ≈ ${fmtNtRatio(meta.ntd_per_unit)} 估算`
}
