import { Check } from 'lucide-react'
import type { OfferTag } from '../../types/paymentOffers'

export type TypeFilterValue = Record<OfferTag, boolean>

const TYPE_META: Array<{ key: OfferTag; label: string; desc: string }> = [
  { key: 'taiwan_pay', label: '台灣Pay', desc: '以 台灣Pay App／指定行動支付掃碼繳稅' },
  { key: 'credit_card', label: '信用卡回饋', desc: '以信用卡繳稅之回饋％或刷卡金' },
  { key: 'installment', label: '分期 0 利率', desc: '信用卡分期 0 利率（可能與回饋擇一）' },
]

interface TypeFilterProps {
  value: TypeFilterValue
  onChange: (next: TypeFilterValue) => void
}

export function TypeFilter({ value, onChange }: TypeFilterProps) {
  function toggle(k: OfferTag) {
    onChange({ ...value, [k]: !value[k] })
  }

  const hint = TYPE_META.filter((m) => value[m.key])
    .map((m) => m.desc)
    .join(' · ')

  return (
    <div>
      <p className="text-base font-medium text-gray-700 mb-2">回饋類型</p>
      <div className="flex flex-wrap gap-2">
        {TYPE_META.map(({ key, label }) => {
          const on = value[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                on
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-500 border-gray-200 hover:text-gray-900'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                  on
                    ? 'bg-white border-white text-gray-900'
                    : 'bg-white border-gray-300 text-transparent'
                }`}
              >
                <Check size={9} />
              </span>
              <span>{label}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-2 text-base text-gray-400 leading-relaxed">
        {hint || '請至少選擇一種回饋類型'}
      </p>
    </div>
  )
}
