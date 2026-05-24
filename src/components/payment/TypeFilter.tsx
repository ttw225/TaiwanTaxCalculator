import { Check } from 'lucide-react'
import type { OfferTag } from '../../types/paymentOffers'

export type TypeFilterValue = Record<OfferTag, boolean>

const TYPE_META: Array<{ key: OfferTag; label: string }> = [
  { key: 'credit_card', label: '信用卡回饋' },
  { key: 'debit_card', label: '金融卡回饋' },
  { key: 'installment', label: '分期 0 利率' },
  { key: 'taiwan_pay', label: '台灣Pay' },
]

interface TypeFilterProps {
  value: TypeFilterValue
  onChange: (next: TypeFilterValue) => void
}

export function TypeFilter({ value, onChange }: TypeFilterProps) {
  function toggle(k: OfferTag) {
    onChange({ ...value, [k]: !value[k] })
  }

  return (
    <div>
      <p className="mb-2 text-base font-medium leading-6 text-gray-700">回饋類型</p>
      <div className="flex flex-wrap gap-2">
        {TYPE_META.map(({ key, label }) => {
          const on = value[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggle(key)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2.5 text-base transition-colors ${
                on
                  ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                  : 'bg-white text-gray-500 border-gray-200 hover:text-gray-900'
              }`}
            >
              <span
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                  on
                    ? 'bg-white border-white text-blue-600'
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
    </div>
  )
}
