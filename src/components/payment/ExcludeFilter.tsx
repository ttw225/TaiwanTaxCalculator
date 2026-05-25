import { Check } from 'lucide-react'

export interface ExcludeFilterValue {
  newCustomer: boolean
  specialMember: boolean
}

const ITEMS: Array<{ key: keyof ExcludeFilterValue; label: string }> = [
  { key: 'newCustomer', label: '排除新戶身分' },
  { key: 'specialMember', label: '排除銀行特殊會員' },
]

interface ExcludeFilterProps {
  value: ExcludeFilterValue
  onChange: (next: ExcludeFilterValue) => void
}

export function ExcludeFilter({ value, onChange }: ExcludeFilterProps) {
  function toggle(k: keyof ExcludeFilterValue) {
    onChange({ ...value, [k]: !value[k] })
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ITEMS.map(({ key, label }) => {
        const on = value[key]
        return (
          <button
            key={key}
            type="button"
            role="switch"
            aria-checked={on}
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
  )
}
