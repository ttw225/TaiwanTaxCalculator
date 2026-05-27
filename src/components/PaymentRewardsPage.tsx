import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowUp } from 'lucide-react'
import { PageHeading } from './ui/PageHeading'
import { AmountInput } from './payment/AmountInput'
import { TypeFilter } from './payment/TypeFilter'
import type { TypeFilterValue } from './payment/TypeFilter'
import { ExcludeFilter } from './payment/ExcludeFilter'
import type { ExcludeFilterValue } from './payment/ExcludeFilter'
import { CardPicker } from './payment/CardPicker'
import { ResultList } from './payment/ResultList'
import { PaymentSkeleton } from './payment/PaymentSkeleton'
import { PaymentLoadError } from './payment/PaymentLoadError'
import { loadOffers } from '../lib/paymentOffers'
import { isPaymentDataReady, prefetchPaymentData } from '../lib/paymentDataLoader'
import { SITE_CONFIG } from '../lib/siteConfig'

const LS_KEY = 'tax.payment.rewards.v2'

interface SavedState {
  amount?: number
  typeFilter?: TypeFilterValue
  excludeFilter?: ExcludeFilterValue
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

const DEFAULT_EXCLUDE_FILTER: ExcludeFilterValue = {
  newCustomer: false,
  specialMember: false,
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

const OFFICIAL_PAYMENT_LINKS: Array<{ label: string; url: string }> = [
  { label: '財政部稅務入口網繳稅專區', url: 'https://www.etax.nat.gov.tw/etwmain/etw113w/etw113w1' },
  { label: '台灣 Pay 繳稅', url: 'https://www.taiwanpay.com.tw' },
]

function Disclaimer() {
  return (
    <section className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-2">試算說明</h2>
      <p className="text-xs text-gray-500 mb-3">
        適用 {SITE_CONFIG.taxYear} 年度（{SITE_CONFIG.dataYear} 年 5 月申報）
        ・資料更新：{SITE_CONFIG.lastUpdated}
      </p>
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
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs font-medium text-gray-700 mb-1.5">官方資料來源</p>
        <ul className="text-xs text-gray-600 space-y-1">
          {OFFICIAL_PAYMENT_LINKS.map((link) => (
            <li key={link.url}>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-gray-500">
          也可以回到{' '}
          <Link to="/" className="text-blue-600 hover:underline">
            節稅試算首頁
          </Link>
          {' '}先試算今年的應繳稅額。
        </p>
      </div>
    </section>
  )
}

// 互動式區塊：所有依賴 payment data 的 sync 呼叫（loadOffers / getAllCards / getCard）
// 都在這支元件內。只在 LoadState === 'ready' 時被 mount，所以呼叫時 cache 必已 hydrated。
// 嚴禁把這支元件搬到外層 unconditional render，否則 prerender 階段會在 component body 觸發
// loadOffers() → getRawOffers() → throw 而 build fail。
function InteractiveSection() {
  const offers = useMemo(() => loadOffers(), [])
  const saved = useMemo(() => loadSaved(), [])

  const [amount, setAmount] = useState<number>(saved?.amount ?? 10000)
  const [typeFilter, setTypeFilter] = useState<TypeFilterValue>(() => ({
    ...DEFAULT_TYPE_FILTER,
    ...(saved?.typeFilter ?? {}),
  }))
  const [excludeFilter, setExcludeFilter] = useState<ExcludeFilterValue>(() => ({
    ...DEFAULT_EXCLUDE_FILTER,
    ...(saved?.excludeFilter ?? {}),
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
        excludeFilter,
        selectedCardIds: Array.from(selectedCardIds),
      }
      localStorage.setItem(LS_KEY, JSON.stringify(payload))
    } catch {
      // localStorage unavailable
    }
  }, [amount, typeFilter, excludeFilter, selectedCardIds])

  const anyType = Object.values(typeFilter).some(Boolean)

  return (
    <>
      <AmountInput amount={amount} onChange={setAmount} />

      {amount > 0 ? (
        <>
          <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 items-start">
              <div className="flex flex-col gap-3">
                <TypeFilter value={typeFilter} onChange={setTypeFilter} />
                <ExcludeFilter value={excludeFilter} onChange={setExcludeFilter} />
              </div>
              <CardPicker value={selectedCardIds} onChange={setSelectedCardIds} />
            </div>
          </section>

          {anyType ? (
            <>
              <h2 className="sr-only">推薦結果</h2>
              <ResultList
                offers={offers}
                amount={amount}
                typeFilter={typeFilter}
                excludeFilter={excludeFilter}
                selectedCardIds={selectedCardIds}
                query={query}
                onQueryChange={setQuery}
              />
            </>
          ) : (
            <TypeFilterEmptyState />
          )}
        </>
      ) : (
        <AmountEmptyState />
      )}
    </>
  )
}

type LoadState = 'loading' | 'ready' | 'error'

export function PaymentRewardsPage() {
  // prerender (Node) 與 client 第一次 hydration 都拿 'loading'：
  //   prerender 時 isPaymentDataReady() === false（cache 從 module scope 開始空白）
  //   client mount 時 fetch 還沒回 → 也 'loading'
  // 兩端起始值一致，無 hydration mismatch。
  // 後續 useEffect 觸發 prefetch、resolve 後 setState('ready') 才 mount InteractiveSection。
  const [state, setState] = useState<LoadState>(() =>
    isPaymentDataReady() ? 'ready' : 'loading',
  )

  useEffect(() => {
    if (state !== 'loading') return
    let cancelled = false
    prefetchPaymentData()
      .then(() => {
        if (!cancelled) setState('ready')
      })
      .catch((err) => {
        console.error('Failed to prefetch payment data', err)
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
    // state 從 'error' retry 時被 onRetry 重設為 'loading'，會觸發 prefetch 重跑。
  }, [state])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="-mx-4 mb-2 border-b border-gray-200 bg-gray-50/95 px-4 pt-2 pb-1">
        <PageHeading
          title="繳稅回饋"
          description="輸入本次應繳稅額，比較各家銀行的繳稅回饋與分期方案"
          className="[&_p]:mb-3 [&_p]:text-sm sm:[&_p]:text-base"
        />
      </div>

      {/* SEO 可索引內容透過 src/pages/PaymentRewardsPage.tsx 的 meta() 內
          ItemList + CreditCard JSON-LD 提供（純機器可讀，不影響視覺）。 */}
      <section>
        {state === 'ready' && <InteractiveSection />}
        {state === 'loading' && <PaymentSkeleton />}
        {state === 'error' && (
          <PaymentLoadError onRetry={() => setState('loading')} />
        )}
      </section>

      <Disclaimer />
    </div>
  )
}
