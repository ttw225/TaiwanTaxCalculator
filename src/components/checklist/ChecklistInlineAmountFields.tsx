import type { ReactNode } from 'react'
import type { CardInlineFeedbackContext, CardInlineField } from '../../types/content'
import { getNumber } from '../../lib/numbers'

/** Mirrors IncomeCard row display: implicit-zero income shows 0 when storage is empty. */
function getInlineFieldDisplayValue(field: CardInlineField, stored: string | undefined): string {
  const raw = stored ?? ''
  if (field.implicitZeroWhenEmpty && raw.trim() === '') return '0'
  return raw
}

function parseAmount(value: string) {
  const amount = Number(value.replace(/,/g, ''))
  return Number.isFinite(amount) ? amount : null
}

function formatAmount(value: number) {
  return Math.round(value).toLocaleString('zh-TW')
}

function getPerUnitInlineFormula(field: CardInlineField, value: string): { perUnit: number; total: number } | null {
  if (!field.perUnitKey) return null

  const hasValue = value.trim() !== ''
  if (!hasValue) return null

  const count = Number(value)
  if (!Number.isFinite(count) || count <= 0) return null

  let perUnit: number
  try {
    perUnit = getNumber(field.perUnitKey)
  } catch {
    return null
  }

  const total = count * perUnit
  return { perUnit, total }
}

function CapFeedback({
  value,
  cap,
  children,
}: {
  value: number
  cap: number
  children?: ReactNode
}) {
  const formatted = formatAmount(cap)
  if (value <= cap) {
    return (
      <p className="mt-1 text-sm text-gray-700">
        可申報上限為 {formatted} 元
        {children}
      </p>
    )
  }
  return (
    <p className="mt-1 text-sm text-red-700">
      已達可申報上限 {formatted} 元
      {children}
    </p>
  )
}

function CapHint({ cap, children }: { cap: number; children?: ReactNode }) {
  return (
    <p className="mt-1 text-sm text-gray-700">
      可申報上限為 {formatAmount(cap)} 元
      {children}
    </p>
  )
}

function InlineFeedback({
  field,
  value,
  feedbackContext,
}: {
  field: CardInlineField
  value: string
  feedbackContext?: Partial<CardInlineFeedbackContext>
}) {
  const hasValue = value.trim() !== ''
  const savingsTargetItemId = 'savings-investment-deduction'
  const savingsLink = (
    <a
      href={`#${savingsTargetItemId}`}
      onClick={(event) => {
        if (!feedbackContext?.onScrollToItem) return
        event.preventDefault()
        feedbackContext.onScrollToItem(savingsTargetItemId)
      }}
      className="inline p-0 m-0 border-0 bg-transparent font-inherit text-gray-600 underline underline-offset-2 hover:text-gray-800 transition-colors leading-none align-baseline"
    >
      儲蓄投資特別扣除額
    </a>
  )

  if (field.splitPerUnitKeys) {
    if (!hasValue) return null
    const count = Math.floor(Number(value))
    if (!Number.isFinite(count) || count <= 0) return null
    let firstRate: number, additionalRate: number
    try {
      firstRate = getNumber(field.splitPerUnitKeys.firstKey)
      additionalRate = getNumber(field.splitPerUnitKeys.additionalKey)
    } catch {
      return null
    }
    const additionalCount = Math.max(count - 1, 0)
    const total = firstRate + additionalCount * additionalRate
    return (
      <p className="mt-1 text-base text-gray-700">
        {count === 1 ? (
          <>1 {field.unit} × {firstRate.toLocaleString('zh-TW')} 元 ＝ <strong>{total.toLocaleString('zh-TW')} 元</strong></>
        ) : (
          <>1 {field.unit} × {firstRate.toLocaleString('zh-TW')} ＋ {additionalCount} {field.unit} × {additionalRate.toLocaleString('zh-TW')} ＝ <strong>{total.toLocaleString('zh-TW')} 元</strong></>
        )}
      </p>
    )
  }

  if (field.feedbackRule === 'unlimited') {
    return null
  }

  if (field.feedbackRule === 'qualified-donation') {
    const grossIncomeAmount = feedbackContext?.grossIncomeAmount ?? null
    const dividendMergedGrossIncomeAmount = feedbackContext?.dividendMergedGrossIncomeAmount ?? null
    const dividendSeparateGrossIncomeAmount = feedbackContext?.dividendSeparateGrossIncomeAmount ?? null
    if (grossIncomeAmount === null) {
      return (
        <p className="mt-1 text-sm text-gray-700">
          填寫
          <a
            href="#gross_income"
            onClick={(event) => {
              if (!feedbackContext?.onScrollToSection) return
              event.preventDefault()
              feedbackContext.onScrollToSection('gross_income')
            }}
            className="inline p-0 m-0 border-0 bg-transparent font-inherit text-gray-600 underline underline-offset-2 hover:text-gray-800 transition-colors leading-none align-baseline"
          >
            綜合所得總額
          </a>
          後顯示申報上限
        </p>
      )
    }
    if (dividendMergedGrossIncomeAmount !== null && dividendSeparateGrossIncomeAmount !== null) {
      return (
        <div className="mt-1 space-y-0.5 text-sm text-blue-700">
          <p>若股利合併計稅，捐贈金額上限為 {formatAmount(dividendMergedGrossIncomeAmount * 0.2)} 元</p>
          <p>若股利分開計稅，捐款金額上限為 {formatAmount(dividendSeparateGrossIncomeAmount * 0.2)} 元</p>
        </div>
      )
    }
    const cap = grossIncomeAmount * 0.2
    if (!hasValue) {
      return <CapHint cap={cap} />
    }
    const numVal = parseAmount(value)
    if (numVal === null || numVal <= 0) return null
    return <CapFeedback value={numVal} cap={cap} />
  }

  if (field.feedbackRule === 'mortgage-interest') {
    let cap: number
    try {
      cap = getNumber('itemized_deduction_mortgage_interest')
    } catch {
      return null
    }

    const savingsDeduction = feedbackContext?.savingsInvestmentEnabled
      ? (feedbackContext.savingsInvestmentDeductionAmount ?? 0)
      : 0
    if (!hasValue) {
      if (feedbackContext?.savingsInvestmentEnabled) {
        return (
          <p className="mt-1 text-sm text-blue-700">
            須先扣除「{savingsLink}」
          </p>
        )
      }
      return (
        <CapHint cap={cap} />
      )
    }
    const numVal = parseAmount(value)
    if (numVal === null || numVal <= 0) return null
    const eligibleAmount = Math.max(0, numVal - savingsDeduction)

    if (savingsDeduction > 0 && eligibleAmount <= cap) {
      return (
        <p className="mt-1 text-sm text-gray-700">
          扣除「{savingsLink}」後為 {formatAmount(eligibleAmount)} 元
        </p>
      )
    }
    if (savingsDeduction > 0 && eligibleAmount > cap) {
      return (
        <p className="mt-1 text-sm text-red-700">
          扣除「{savingsLink}」後已達可申報上限 {formatAmount(cap)} 元
        </p>
      )
    }

    return <CapFeedback value={eligibleAmount} cap={cap} />
  }

  if (!field.capKey) return null
  let cap: number
  try {
    cap = getNumber(field.capKey)
  } catch {
    return null
  }

  if (!hasValue) return <CapHint cap={cap} />

  const numVal = parseAmount(value)
  if (numVal === null || numVal <= 0) return null

  return <CapFeedback value={numVal} cap={cap} />
}

export interface ChecklistInlineAmountFieldsProps {
  itemId: string
  inlineFields: CardInlineField[]
  inputValues: Record<string, string>
  feedbackContext?: Partial<CardInlineFeedbackContext>
  onInputChange?: (fieldId: string, value: string) => void
}

function findInlineField(inlineFields: CardInlineField[], fieldId: string): CardInlineField | undefined {
  return inlineFields.find((field) => field.id === fieldId)
}

function ExemptionAgeRow({
  field,
  value,
  onInputChange,
}: {
  field: CardInlineField
  value: string
  onInputChange?: (fieldId: string, value: string) => void
}) {
  return (
    <fieldset className="border-0 p-0">
      <legend className="sr-only">{field.label}</legend>
      <div className="grid gap-2 sm:grid-cols-[6rem_1fr] sm:items-center">
        <div className="text-base font-medium text-gray-700" aria-hidden="true">{field.label}</div>
        <div
          className="flex flex-wrap gap-x-5 gap-y-2"
          data-testid={`card-choice-exemption-general-${field.id}`}
        >
          {(field.choices ?? []).map((choice) => {
            const selected = value === choice.value
            return (
              <label
                key={choice.value}
                className="flex min-h-10 cursor-pointer items-center gap-2 text-base text-gray-800"
              >
                <input
                  type="radio"
                  name={`exemption-general-${field.id}`}
                  value={choice.value}
                  checked={selected}
                  onChange={() => onInputChange?.(field.id, choice.value)}
                  data-testid={`card-choice-exemption-general-${field.id}-${choice.value}`}
                  className="peer sr-only"
                />
                <span
                  className={[
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-blue-500 peer-focus-visible:ring-offset-2',
                    selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-white',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <span className="font-medium">{choice.label}</span>
              </label>
            )
          })}
        </div>
      </div>
    </fieldset>
  )
}

function ExemptionDependentCountRow({
  field,
  label,
  value,
  onInputChange,
}: {
  field: CardInlineField
  label: string
  value: string
  onInputChange?: (fieldId: string, value: string) => void
}) {
  return (
    <label className="grid gap-2 sm:grid-cols-[6rem_1fr] sm:items-center">
      <span className="text-base font-medium text-gray-700">其他親屬</span>
      <span className="flex flex-wrap items-center gap-2 text-base text-gray-700">
        <span className="min-w-20 font-medium">{label}</span>
        <input
          type="number"
          min="0"
          step="1"
          value={value}
          onChange={(e) => onInputChange?.(field.id, e.target.value)}
          data-testid={`card-input-exemption-general-${field.id}`}
          className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-base text-gray-800 focus:border-blue-400 focus:outline-none"
          placeholder="0"
        />
        <span className="text-gray-500">人</span>
      </span>
    </label>
  )
}

function ExemptionGeneralInlineFields({
  inlineFields,
  inputValues,
  onInputChange,
}: {
  inlineFields: CardInlineField[]
  inputValues: Record<string, string>
  onInputChange?: (fieldId: string, value: string) => void
}) {
  const selfAgeField = findInlineField(inlineFields, 'self_age_band')
  const spouseAgeField = findInlineField(inlineFields, 'spouse_age_band')
  const under70CountField = findInlineField(inlineFields, 'exemption_under70_count')
  const over70CountField = findInlineField(inlineFields, 'exemption_over70_count')

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-gray-300 bg-gray-100/70 p-3">
      {selfAgeField && (
        <ExemptionAgeRow
          field={selfAgeField}
          value={inputValues[selfAgeField.id] ?? ''}
          onInputChange={onInputChange}
        />
      )}
      {spouseAgeField && (
        <ExemptionAgeRow
          field={spouseAgeField}
          value={inputValues[spouseAgeField.id] ?? ''}
          onInputChange={onInputChange}
        />
      )}
      {under70CountField && (
        <ExemptionDependentCountRow
          field={under70CountField}
          label="未滿 70 歲"
          value={inputValues[under70CountField.id] ?? ''}
          onInputChange={onInputChange}
        />
      )}
      {over70CountField && (
        <ExemptionDependentCountRow
          field={over70CountField}
          label="70 歲以上"
          value={inputValues[over70CountField.id] ?? ''}
          onInputChange={onInputChange}
        />
      )}
    </div>
  )
}

export function ChecklistInlineAmountFields({
  itemId,
  inlineFields,
  inputValues,
  feedbackContext,
  onInputChange,
}: ChecklistInlineAmountFieldsProps) {
  if (inlineFields.length === 0) return null

  if (itemId === 'exemption-general') {
    return (
      <ExemptionGeneralInlineFields
        inlineFields={inlineFields}
        inputValues={inputValues}
        onInputChange={onInputChange}
      />
    )
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-gray-300 bg-gray-100/70 p-3">
      {inlineFields.map((field) => {
        const stored = inputValues[field.id]
        const displayValue = getInlineFieldDisplayValue(field, stored)
        const placeholder =
          field.perUnitKey || field.splitPerUnitKeys
            ? '輸入人數'
            : field.implicitZeroWhenEmpty
              ? '預設 0'
              : '輸入金額'
        return (
          <div key={field.id}>
            <label className="block text-base font-medium text-gray-600 mb-1">
              {field.label}
            </label>
            {field.type === 'choice' ? (
              <div
                className="inline-flex flex-wrap gap-1 rounded-lg border border-gray-300 bg-white p-1"
                data-testid={`card-choice-${itemId}-${field.id}`}
              >
                {(field.choices ?? []).map((choice) => {
                  const selected = displayValue === choice.value
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      onClick={() => onInputChange?.(field.id, choice.value)}
                      data-testid={`card-choice-${itemId}-${field.id}-${choice.value}`}
                      className={[
                        'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                        selected
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800',
                      ].join(' ')}
                      aria-pressed={selected}
                    >
                      {choice.label}
                    </button>
                  )
                })}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max={field.max}
                    step={field.perUnitKey || field.splitPerUnitKeys ? '1' : undefined}
                    value={displayValue}
                    onChange={(e) => onInputChange?.(field.id, e.target.value)}
                    data-testid={`card-input-${itemId}-${field.id}`}
                    className={[
                      'w-36 rounded border border-gray-300 px-2 py-1 text-base text-gray-800 focus:border-blue-400 focus:outline-none',
                      field.perUnitKey || field.splitPerUnitKeys ? '' : 'no-spin',
                    ].join(' ')}
                    placeholder={placeholder}
                  />
                  <span className="text-base text-gray-500">{field.unit}</span>
                  {(() => {
                    const formula = getPerUnitInlineFormula(field, inputValues[field.id] ?? '')
                    if (!formula) return null
                    return (
                      <span className="text-base text-gray-700">
                        × {formula.perUnit.toLocaleString('zh-TW')} 元 ＝ <strong>{formula.total.toLocaleString('zh-TW')} 元</strong>
                      </span>
                    )
                  })()}
                </div>
                <InlineFeedback
                  field={field}
                  value={displayValue}
                  feedbackContext={feedbackContext}
                />
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
