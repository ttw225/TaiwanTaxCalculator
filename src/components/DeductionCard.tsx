import type { CardInlineFeedbackContext, CardInlineField, ChecklistItem } from '../types/content'
import { ChecklistCardShell } from './checklist/ChecklistCardShell'
import { ChecklistInlineAmountFields } from './checklist/ChecklistInlineAmountFields'

interface Props {
  item: ChecklistItem
  inlineFields?: CardInlineField[]
  inputValues?: Record<string, string>
  feedbackContext?: Partial<CardInlineFeedbackContext>
  sourceSituationLabels?: string[]
  removable?: boolean
  onInputChange?: (fieldId: string, value: string) => void
  onRemove?: () => void
}

export function DeductionCard({
  item,
  inlineFields = [],
  inputValues = {},
  feedbackContext,
  sourceSituationLabels = [],
  removable = false,
  onInputChange,
  onRemove,
}: Props) {
  return (
    <ChecklistCardShell
      item={item}
      sourceSituationLabels={sourceSituationLabels}
      removable={removable}
      onRemove={onRemove}
    >
      <ChecklistInlineAmountFields
        itemId={item.id}
        inlineFields={inlineFields}
        inputValues={inputValues}
        feedbackContext={feedbackContext}
        onInputChange={onInputChange}
      />
    </ChecklistCardShell>
  )
}
