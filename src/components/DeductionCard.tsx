import type { CardInlineField, CardStatus, ChecklistItem, DisclaimerLevel } from '../types/content'
import { getNumber } from '../lib/numbers'

interface Props {
  item: ChecklistItem
  inlineFields?: CardInlineField[]
  inputValues?: Record<string, string>
  status?: CardStatus
  sourceSituationLabels?: string[]
  removable?: boolean
  onInputChange?: (fieldId: string, value: string) => void
  onStatusChange?: (status: 'confirmed' | 'na') => void
  onRemove?: () => void
}

const DISCLAIMER_BADGE: Record<DisclaimerLevel, { label: string; className: string }> = {
  low: { label: '文件準備', className: 'bg-gray-100 text-gray-600' },
  medium: { label: '建議確認', className: 'bg-yellow-100 text-yellow-700' },
  high: { label: '需進一步確認', className: 'bg-orange-100 text-orange-700' },
}

const STATUS_BADGE: Record<'confirmed' | 'na', { label: string; className: string }> = {
  confirmed: { label: '確認適用', className: 'bg-green-100 text-green-700' },
  na: { label: '不適用', className: 'bg-gray-100 text-gray-400' },
}

const HIGH_RISK_NOTICE = '此項涉及個人條件或排富規定，請以財政部電子申報系統與官方資料確認。'

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

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  )
}

export function DeductionCard({
  item,
  inlineFields = [],
  inputValues = {},
  status = 'unset',
  sourceSituationLabels = [],
  removable = false,
  onInputChange,
  onStatusChange,
  onRemove,
}: Props) {
  const badge = DISCLAIMER_BADGE[item.disclaimer_level]
  const hasFields = inlineFields.length > 0
  const visibleSourceLabels = sourceSituationLabels.slice(0, 2)
  const hiddenSourceCount = sourceSituationLabels.length - visibleSourceLabels.length

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white print-card">
      <div className="flex items-start gap-2 mb-2">
        <h3 className="font-medium text-gray-900 flex-1 text-sm">{item.title}</h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {status !== 'unset' && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[status].className}`}>
              {STATUS_BADGE[status].label}
            </span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${badge.className}`}>
            {badge.label}
          </span>
          {removable && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              aria-label={`移除項目：${item.title}`}
              data-testid={`remove-item-${item.id}`}
              className="no-print inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-100 hover:text-gray-700"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-3">{item.why_it_matters}</p>
      {sourceSituationLabels.length > 0 && (
        <p
          className="mb-3 text-xs text-indigo-700"
          data-testid={`card-source-situations-${item.id}`}
          title={`情境：${sourceSituationLabels.join('、')}`}
        >
          情境：{visibleSourceLabels.join('、')}
          {hiddenSourceCount > 0 ? ` +${hiddenSourceCount}` : ''}
        </p>
      )}

      {item.eligibility_cues.length > 0 && (
        <Section label="適用條件">
          <ul className="list-disc list-inside space-y-0.5">
            {item.eligibility_cues.map((cue) => (
              <li key={cue} className="text-xs text-gray-600">{cue}</li>
            ))}
          </ul>
        </Section>
      )}

      {item.documents_to_prepare.length > 0 && (
        <Section label="需準備文件">
          <ul className="list-disc list-inside space-y-0.5">
            {item.documents_to_prepare.map((doc) => (
              <li key={doc} className="text-xs text-gray-600">{doc}</li>
            ))}
          </ul>
        </Section>
      )}

      {item.limitations.length > 0 && (
        <Section label="注意事項">
          <ul className="list-disc list-inside space-y-0.5">
            {item.limitations.map((lim) => (
              <li key={lim} className="text-xs text-amber-700">{lim}</li>
            ))}
          </ul>
        </Section>
      )}

      {hasFields && (
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
                  data-testid={`card-input-${item.id}-${field.id}`}
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
      )}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs font-medium text-blue-700 mb-1">→ {item.next_action}</p>
        {item.disclaimer_level === 'high' && (
          <p className="mb-2 text-xs text-orange-700">{HIGH_RISK_NOTICE}</p>
        )}

        {status === 'unset' && onStatusChange && (
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={() => onStatusChange('confirmed')}
              data-testid={`card-status-confirmed-${item.id}`}
              className="text-xs px-2.5 py-1 rounded border border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
            >
              確認適用
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('na')}
              data-testid={`card-status-na-${item.id}`}
              className="text-xs px-2.5 py-1 rounded border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            >
              不適用
            </button>
          </div>
        )}

        <details className="group">
          <summary className="cursor-pointer select-none text-xs font-medium text-gray-500 hover:text-gray-700">
            來源與官方參考
          </summary>
          <ul className="mt-2 space-y-1">
            {item.source_refs.map((ref) => (
              <li key={ref.source_id} className="text-xs text-gray-500">
                {ref.url ? (
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-600 underline underline-offset-2 hover:text-gray-800"
                  >
                    {ref.label}
                  </a>
                ) : (
                  <span className="text-gray-600">{ref.label}</span>
                )}
                {ref.authority && <span className="text-gray-400"> · {ref.authority}</span>}
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  )
}
