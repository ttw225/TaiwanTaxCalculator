import type { ReactNode } from 'react'
import type { ChecklistItem } from '../../types/content'
import { WEALTH_CLAUSE_NOTICE } from '../../lib/checklistCardCopy'
import { CardSourceRefsDetails } from './CardSourceRefsDetails'
import { ChecklistCardSection } from './ChecklistCardSection'
import { Card, CardBody } from '../ui/Card'

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
  void sourceSituationLabels

  return (
    <Card
      className="print-card"
      data-testid={`checklist-card-${item.id}`}
    >
      <CardBody>
        {/* Section A: title + description */}
        <div className="pb-3 mb-4 border-b border-gray-200">
          <div className="flex items-start gap-2 mb-2">
            <h3 className="font-medium text-gray-900 flex-1 text-lg">{item.title}</h3>
            {removable && onRemove && (
              <button
                type="button"
                onClick={onRemove}
                aria-label={`移除項目：${item.title}`}
                data-testid={`remove-item-${item.id}`}
                className="no-print inline-flex h-7 w-7 items-center justify-center text-2xl text-gray-400 transition-colors hover:text-gray-700"
              >
                ×
              </button>
            )}
          </div>
          <p className="text-base text-gray-700">{item.why_it_matters}</p>
        </div>

        {/* Section B: 適用條件 + 需準備文件 */}
        {(item.eligibility_cues.length > 0 || item.documents_to_prepare.length > 0) && (
          <div className="mb-4">
            {item.eligibility_cues.length > 0 && (
              <ChecklistCardSection label="適用條件">
                <ul className="list-disc list-inside space-y-0.5">
                  {item.eligibility_cues.map((cue) => (
                    <li key={cue} className="text-base text-muted">{cue}</li>
                  ))}
                </ul>
              </ChecklistCardSection>
            )}
            {item.documents_to_prepare.length > 0 && (
              <ChecklistCardSection label="需準備文件">
                <ul className="list-disc list-inside space-y-0.5">
                  {item.documents_to_prepare.map((doc) => (
                    <li key={doc} className="text-base text-muted">{doc}</li>
                  ))}
                </ul>
              </ChecklistCardSection>
            )}
          </div>
        )}

        {/* Section C: input content */}
        {children}

        {/* Section D: note + source refs */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          {item.show_wealth_clause_notice && (
            <p className="mb-2 text-sm text-amber-800">{WEALTH_CLAUSE_NOTICE}</p>
          )}
          <CardSourceRefsDetails sourceRefs={item.source_refs} />
        </div>
      </CardBody>
    </Card>
  )
}
