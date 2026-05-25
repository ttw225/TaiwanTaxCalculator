import { useEffect, useMemo, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { PageHeading } from './ui/PageHeading'
import { AmountInput } from './payment/AmountInput'
import { TypeFilter } from './payment/TypeFilter'
import type { TypeFilterValue } from './payment/TypeFilter'
import { CardPicker } from './payment/CardPicker'
import { ResultList } from './payment/ResultList'
import { loadOffers } from '../lib/paymentOffers'

const LS_KEY = 'tax.payment.rewards.v2'

interface SavedState {
  amount?: number
  typeFilter?: TypeFilterValue
  selectedCardIds?: string[]
}

function loadSaved(): SavedState | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw) as SavedState
  } catch {
    return null
  }
}

const DEFAULT_TYPE_FILTER: TypeFilterValue = {
  taiwan_pay: true,
  credit_card: true,
  debit_card: true,
  installment: true,
}

function AmountEmptyState() {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 sm:p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center">
        <ArrowUp size={22} />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-700">先輸入應繳稅額，下方會列出可比較的方案</p>
    </div>
  )
}

function TypeFilterEmptyState() {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 sm:p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center">
        <ArrowUp size={22} />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-700">請至少勾選一種回饋類型</p>
    </div>
  )
}

function Disclaimer() {
  return (
    <section className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-2">試算說明</h2>
      <ul className="text-sm text-gray-600 leading-relaxed space-y-1.5">
        <li className="flex items-start gap-2">
          <span className="mt-2 w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
          「預估回饋」＝稅額 × 活動公告回饋率；若活動有單筆或合計上限，會以上限為準。
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-2 w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
          含金額階梯的活動（例：合庫、富邦 J 卡）會依稅額自動套用對應級距。
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-2 w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
          客群限定活動（例：華南領航 4 級、富邦理財會員）會分開列出；可同時比較，但實際只能用符合身分的那一張。
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-2 w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
          回饋與分期條件以發卡行官方公告為準；本頁僅供試算參考。
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-2 w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
          所有輸入資料只保留在本機瀏覽器，不會上傳。
        </li>
      </ul>
    </section>
  )
}

export function PaymentRewardsPage() {
  const offers = useMemo(() => loadOffers(), [])

  const saved = useMemo(() => loadSaved(), [])

  const [amount, setAmount] = useState<number>(saved?.amount ?? 10000)
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>(() => ({
    ...DEFAULT_TYPE_FILTER,
    ...(saved?.typeFilter ?? {}),
  }))
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(
    () => new Set(saved?.selectedCardIds ?? []),
  )
  const [query, setQuery] = useState('')

  useEffect(() => {
    try {
      const payload: SavedState = {
        amount,
        typeFilter,
        selectedCardIds: Array.from(selectedCardIds),
      }
      localStorage.setItem(LS_KEY, JSON.stringify(payload))
    } catch {
      // localStorage unavailable
    }
  }, [amount, typeFilter, selectedCardIds])

  const anyType = Object.values(typeFilter).some(Boolean)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="-mx-4 mb-2 border-b border-gray-200 bg-gray-50/95 px-4 pt-2 pb-1">
        <PageHeading
          title="繳稅回饋"
          description="輸入本次應繳稅額，比較各家銀行的繳稅回饋與分期方案"
          className="[&_p]:mb-3 [&_p]:text-sm sm:[&_p]:text-base"
        />
      </div>

      <AmountInput amount={amount} onChange={setAmount} />

      {amount > 0 ? (
        <>
          <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 items-start">
              <TypeFilter value={typeFilter} onChange={setTypeFilter} />
              <CardPicker value={selectedCardIds} onChange={setSelectedCardIds} />
            </div>
          </section>

          {anyType ? (
            <ResultList
              offers={offers}
              amount={amount}
              typeFilter={typeFilter}
              selectedCardIds={selectedCardIds}
              query={query}
              onQueryChange={setQuery}
            />
          ) : (
            <TypeFilterEmptyState />
          )}
        </>
      ) : (
        <AmountEmptyState />
      )}

      <Disclaimer />
    </div>
  )
}
