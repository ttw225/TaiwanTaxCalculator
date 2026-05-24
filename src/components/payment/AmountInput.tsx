import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { clampAmount } from '../../lib/paymentOffers'

const QUICK_AMOUNTS = [5000, 10000, 30000, 50000, 100000, 300000]

interface AmountInputProps {
  amount: number
  onChange: (next: number) => void
}

export function AmountInput({ amount, onChange }: AmountInputProps) {
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function clearAndKeepFocus(e: React.MouseEvent) {
    e.preventDefault()
    onChange(0)
    inputRef.current?.focus()
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <label htmlFor="amt" className="block text-base font-medium text-gray-700 mb-3">
        應繳納稅額
      </label>
      <div
        className={`flex items-center gap-2 border-b transition-colors pb-3 ${
          focused ? 'border-gray-900' : 'border-gray-200'
        }`}
      >
        <span className="text-2xl font-medium text-gray-400 tabular-nums">NT$</span>
        <input
          ref={inputRef}
          id="amt"
          type="text"
          inputMode="numeric"
          value={amount === 0 ? '' : amount.toLocaleString('zh-TW')}
          placeholder="輸入金額"
          onChange={(e) => {
            const digits = e.target.value.replace(/[^\d]/g, '')
            onChange(clampAmount(digits === '' ? 0 : parseInt(digits, 10)))
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="flex-1 min-w-0 !text-2xl font-bold text-gray-900 tabular-nums bg-transparent focus:outline-none placeholder:text-gray-300 placeholder:font-medium leading-tight"
          aria-label="應繳納稅額（新台幣）"
        />
        <button
          type="button"
          onMouseDown={clearAndKeepFocus}
          aria-label="清除金額"
          data-padding="custom"
          tabIndex={focused && amount > 0 ? 0 : -1}
          className={`shrink-0 inline-flex items-center justify-center w-4 h-4 text-gray-400 transition-colors ${
            focused && amount > 0
              ? 'opacity-100 hover:text-gray-700'
              : 'opacity-0 pointer-events-none'
          }`}
        >
          <X size={16} />
        </button>
        <span className="text-sm text-gray-400 shrink-0">元</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="text-base text-gray-400 self-center mr-1">常用金額：</span>
        {QUICK_AMOUNTS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`text-base tabular-nums rounded-full border px-3 py-1 transition-colors ${
              amount === v
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            {v.toLocaleString('zh-TW')}
          </button>
        ))}
      </div>
    </section>
  )
}
