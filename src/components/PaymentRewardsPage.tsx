import { useEffect, useMemo, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { PageHeading } from './ui/PageHeading'
import { AmountInput } from './payment/AmountInput'
import { TypeFilter } from './payment/TypeFilter'
import type { TypeFilterValue } from './payment/TypeFilter'
import { BankFilter } from './payment/BankFilter'
import { ResultList } from './payment/ResultList'
import { getBankList, loadOffers } from '../lib/paymentOffers'

const LS_KEY = 'tax.payment.rewards.v1'

interface SavedState {
  amount?: number
  typeFilter?: TypeFilterValue
  bankFilter?: string[]
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
  installment: true,
}

function AmountEmptyState() {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 sm:p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center">
        <ArrowUp size={22} />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-700">輸入應繳納稅額後開始推薦</p>
    </div>
  )
}

function TypeFilterEmptyState() {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 sm:p-12 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 mx-auto flex items-center justify-center">
        <ArrowUp size={22} />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-700">勾選至少一種回饋類型後開始推薦</p>
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
          「估算回饋」＝你輸入的應繳納稅額 × 該活動公告的回饋率；若該活動有單筆／歸戶上限，自動以上限為準。
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-2 w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
          金額階梯（例：合庫、富邦 J 卡）會依你輸入的應繳納稅額自動選擇適用級距。
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-2 w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
          客群限定（例：華南領航 4 級、富邦理財會員）會以各別卡列出；可一起比較，但你只能適用符合身分的那一張。
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-2 w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
          回饋／分期細節以各發卡行官方公告為準；本頁僅作試算與參考。
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-2 w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
          所有輸入資料保留在你的瀏覽器（localStorage），不會傳送到伺服器。
        </li>
      </ul>
    </section>
  )
}

export function PaymentRewardsPage() {
  const offers = useMemo(() => loadOffers(), [])
  const allBanks = useMemo(() => getBankList(), [])

  const saved = useMemo(() => loadSaved(), [])

  const [amount, setAmount] = useState<number>(saved?.amount ?? 10000)
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>(
    saved?.typeFilter ?? DEFAULT_TYPE_FILTER,
  )
  const [bankFilter, setBankFilter] = useState<Set<string>>(() => {
    if (saved?.bankFilter && saved.bankFilter.length > 0) {
      // Intersect with current allBanks to drop stale codes.
      const valid = new Set(allBanks.map((b) => b.code))
      const inter = saved.bankFilter.filter((c) => valid.has(c))
      if (inter.length > 0) return new Set(inter)
    }
    return new Set(allBanks.map((b) => b.code))
  })
  const [query, setQuery] = useState('')

  useEffect(() => {
    try {
      const payload: SavedState = {
        amount,
        typeFilter,
        bankFilter: Array.from(bankFilter),
      }
      localStorage.setItem(LS_KEY, JSON.stringify(payload))
    } catch {
      // localStorage unavailable
    }
  }, [amount, typeFilter, bankFilter])

  const anyType = Object.values(typeFilter).some(Boolean)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="-mx-4 mb-2 border-b border-gray-200 bg-gray-50/95 px-4 pt-2 pb-1">
        <PageHeading
          title="繳稅回饋"
          description="輸入今年的應繳納稅額，將為您推薦合適的繳稅方式"
          className="[&_p]:mb-3 [&_p]:text-sm sm:[&_p]:text-base"
        />
      </div>

      <AmountInput amount={amount} onChange={setAmount} />

      {amount > 0 ? (
        <>
          <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <TypeFilter value={typeFilter} onChange={setTypeFilter} />
              <BankFilter value={bankFilter} onChange={setBankFilter} allBanks={allBanks} />
            </div>
          </section>

          {anyType ? (
            <ResultList
              offers={offers}
              amount={amount}
              typeFilter={typeFilter}
              bankFilter={bankFilter}
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
