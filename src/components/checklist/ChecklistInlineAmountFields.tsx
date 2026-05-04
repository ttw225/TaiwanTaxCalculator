import type { CardInlineField } from '../../types/content'
import { getNumber } from '../../lib/numbers'

function InlineFeedback({ field, value }: { field: CardInlineField; value: string }) {
  if (!value || !field.capKey) return null
  const numVal = Number(value.replace(/,/g, ''))
  if (isNaN(numVal) || numVal <= 0) return null

  let cap: number
  try {
    cap = getNumber(field.capKey)
  } catch {
    return null
  }

  const formatted = cap.toLocaleString('zh-TW')
  if (numVal <= cap) {
    return (
      <p className="mt-1 text-xs text-green-700">
        填入金額在可申報範圍內（上限 {formatted} 元）
      </p>
    )
  }
  return (
    <p className="mt-1 text-xs text-orange-700">
      填入金額超過上限；可申報上限為 {formatted} 元
    </p>
  )
}

export interface ChecklistInlineAmountFieldsProps {
  itemId: string
  inlineFields: CardInlineField[]
  inputValues: Record<string, string>
  onInputChange?: (fieldId: string, value: string) => void
}

export function ChecklistInlineAmountFields({
  itemId,
  inlineFields,
  inputValues,
  onInputChange,
}: ChecklistInlineAmountFieldsProps) {
  if (inlineFields.length === 0) return null

  return (
    <div className="mt-3 space-y-3 rounded border border-blue-100 bg-blue-50/40 p-3">
      {inlineFields.map((field) => (
        <div key={field.id}>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {field.label}（選填）
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="0"
              value={inputValues[field.id] ?? ''}
              onChange={(e) => onInputChange?.(field.id, e.target.value)}
              data-testid={`card-input-${itemId}-${field.id}`}
              className="w-36 rounded border border-gray-300 px-2 py-1 text-xs text-gray-800 focus:border-blue-400 focus:outline-none"
              placeholder="輸入金額"
            />
            <span className="text-xs text-gray-500">{field.unit}</span>
          </div>
          <InlineFeedback field={field} value={inputValues[field.id] ?? ''} />
        </div>
      ))}
      <div className="border-t border-blue-100 pt-2 space-y-1">
        <p className="text-xs text-gray-400">
          資料僅在您的瀏覽器處理，不會傳送至任何伺服器
        </p>
        <p className="text-xs text-gray-400">
          填入金額僅用於協助排序與初步檢查，實際可申報金額請以官方系統確認
        </p>
      </div>
    </div>
  )
}
