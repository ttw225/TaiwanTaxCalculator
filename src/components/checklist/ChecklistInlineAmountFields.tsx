import type { ReactNode } from 'react'
import type { CardInlineFeedbackContext, CardInlineField } from '../../types/content'
import { getNumber } from '../../lib/numbers'

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
      <p className="mt-1 text-base text-green-700">
        可申報上限為 {formatted} 元
        {children}
      </p>
    )
  }
  return (
    <p className="mt-1 text-base text-red-700">
      已達可申報上限 {formatted} 元
      {children}
    </p>
  )
}

function CapHint({ cap, children }: { cap: number; children?: ReactNode }) {
  return (
    <p className="mt-1 text-base text-blue-700">
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
      className="inline p-0 m-0 border-0 bg-transparent font-inherit text-gray-600 hover:text-gray-800 hover:underline underline-offset-2 transition-colors leading-none align-baseline"
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
    if (!hasValue) {
      return (
        <p className="mt-1 text-base text-blue-700">
          此類捐贈無金額上限
        </p>
      )
    }
    const numVal = parseAmount(value)
    if (numVal === null || numVal <= 0) return null
    return (
      <p className="mt-1 text-base text-green-700">
        此類捐贈無金額上限
      </p>
    )
  }

  if (field.feedbackRule === 'qualified-donation') {
    const grossIncomeAmount = feedbackContext?.grossIncomeAmount ?? null
    const dividendMergedGrossIncomeAmount = feedbackContext?.dividendMergedGrossIncomeAmount ?? null
    const dividendSeparateGrossIncomeAmount = feedbackContext?.dividendSeparateGrossIncomeAmount ?? null
    if (grossIncomeAmount === null) {
      return (
        <p className="mt-1 text-base text-gray-700">
          請先填寫{' '}
          <button
            type="button"
            onClick={() => feedbackContext?.onScrollToSection?.('gross_income')}
            className="font-medium text-blue-700 hover:text-blue-800 hover:underline underline-offset-2 transition-colors"
          >
            綜合所得總額
          </button>
        </p>
      )
    }
    if (dividendMergedGrossIncomeAmount !== null && dividendSeparateGrossIncomeAmount !== null) {
      return (
        <div className="mt-1 space-y-0.5 text-base text-blue-700">
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
          <p className="mt-1 text-base text-blue-700">
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
        <p className="mt-1 text-base text-green-700">
          扣除「{savingsLink}」後為 {formatAmount(eligibleAmount)} 元
        </p>
      )
    }
    if (savingsDeduction > 0 && eligibleAmount > cap) {
      return (
        <p className="mt-1 text-base text-red-700">
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

export function ChecklistInlineAmountFields({
  itemId,
  inlineFields,
  inputValues,
  feedbackContext,
  onInputChange,
}: ChecklistInlineAmountFieldsProps) {
  if (inlineFields.length === 0) return null

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-gray-300 bg-gray-100/70 p-3">
      {inlineFields.map((field) => (
        <div key={field.id}>
          <label className="block text-base font-medium text-gray-600 mb-1">
            {field.label}（選填）
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              type="number"
              min="0"
              max={field.max}
              step={field.perUnitKey || field.splitPerUnitKeys ? '1' : undefined}
              value={inputValues[field.id] ?? ''}
              onChange={(e) => onInputChange?.(field.id, e.target.value)}
              data-testid={`card-input-${itemId}-${field.id}`}
              className={[
                'w-36 rounded border border-gray-300 px-2 py-1 text-base text-gray-800 focus:border-blue-400 focus:outline-none',
                field.perUnitKey || field.splitPerUnitKeys ? '' : 'no-spin',
              ].join(' ')}
              placeholder={field.perUnitKey || field.splitPerUnitKeys ? '輸入人數' : '輸入金額'}
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
            value={inputValues[field.id] ?? ''}
            feedbackContext={feedbackContext}
          />
        </div>
      ))}
      <div className="border-t border-gray-300 pt-2">
        <p className="text-xs text-gray-400">
          資料僅在您的瀏覽器處理，不會傳送至任何伺服器
        </p>
      </div>
    </div>
  )
}
