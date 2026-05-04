import type { ReactNode } from 'react'
import type { ChecklistItem } from '../../types/content'
import { WEALTH_CLAUSE_NOTICE } from '../../lib/checklistCardCopy'
import { CardSourceRefsDetails } from './CardSourceRefsDetails'
import { ChecklistCardSection } from './ChecklistCardSection'

export interface ChecklistCardShellProps {
  item: ChecklistItem
  sourceSituationLabels?: string[]
  removable?: boolean
  onRemove?: () => void
  children?: ReactNode
}

export function ChecklistCardShell({
  item,
  sourceSituationLabels = [],
  removable = false,
  onRemove,
  children,
}: ChecklistCardShellProps) {
  const visibleSourceLabels = sourceSituationLabels.slice(0, 2)
  const hiddenSourceCount = sourceSituationLabels.length - visibleSourceLabels.length

  return (
    <div
      className="border border-gray-200 rounded-lg p-4 bg-white print-card"
      data-testid={`checklist-card-${item.id}`}
    >
      <div className="flex items-start gap-2 mb-2">
        <h3 className="font-medium text-gray-900 flex-1 text-sm">{item.title}</h3>
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
        <ChecklistCardSection label="適用條件">
          <ul className="list-disc list-inside space-y-0.5">
            {item.eligibility_cues.map((cue) => (
              <li key={cue} className="text-xs text-gray-600">{cue}</li>
            ))}
          </ul>
        </ChecklistCardSection>
      )}

      {item.documents_to_prepare.length > 0 && (
        <ChecklistCardSection label="需準備文件">
          <ul className="list-disc list-inside space-y-0.5">
            {item.documents_to_prepare.map((doc) => (
              <li key={doc} className="text-xs text-gray-600">{doc}</li>
            ))}
          </ul>
        </ChecklistCardSection>
      )}

      {item.limitations.length > 0 && (
        <ChecklistCardSection label="注意事項">
          <ul className="list-disc list-inside space-y-0.5">
            {item.limitations.map((lim) => (
              <li key={lim} className="text-xs text-amber-700">{lim}</li>
            ))}
          </ul>
        </ChecklistCardSection>
      )}

      {children}

      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs font-medium text-blue-700 mb-1">→ {item.next_action}</p>
        {item.show_wealth_clause_notice && (
          <p className="mb-2 text-xs text-orange-700">{WEALTH_CLAUSE_NOTICE}</p>
        )}
        <CardSourceRefsDetails sourceRefs={item.source_refs} />
      </div>
    </div>
  )
}
