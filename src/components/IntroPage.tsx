import { getNumber } from '../lib/numbers'

interface Props {
  onStart: () => void
}

const FEATURES = [
  {
    title: '完全開源',
    body: '原始碼公開於 GitHub，計算邏輯與資料來源人人可審閱。歡迎發 issue 修正錯誤。',
    icon: (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
      </svg>
    ),
  },
  {
    title: '不儲存任何資料',
    body: '純前端運算，輸入金額僅暫存於你的瀏覽器，關閉分頁不會送出至任何伺服器。',
    icon: (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2zm10-9V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: '清楚的條目說明',
    body: '每筆免稅額、扣除額皆標示法源、公告與最後更新月份，看得到出處才放心。',
    icon: (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-6-8h6M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    ),
  },
]

export function IntroPage({ onStart }: Props) {
  const threshold =
    getNumber('exemption_general') +
    getNumber('standard_deduction_single') +
    getNumber('special_deduction_salary')
  const fmt = (n: number) => n.toLocaleString('zh-TW')

  return (
    <div className="max-w-5xl mx-auto px-4 pt-12 pb-8">

      {/* Hero */}
      <div className="mb-12">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 mb-6">
          <span className="size-1.5 rounded-full bg-blue-500" />
          114 年度（2026 年 5 月申報）
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 leading-tight mb-4">
          報稅前，先把<br />能省的部分整理乾淨。
        </h1>
        <p className="text-base text-gray-500 max-w-xl mb-8 leading-relaxed">
          這是一個自發整理、開源、完全免費的節稅參考工具。勾選符合你今年情況的項目，系統會列出值得確認的扣除清單。不需要登入或填寫任何個人資料。
        </p>
        <div className="flex items-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={onStart}
            data-padding="custom"
            className="px-6 py-3 rounded-xl text-base font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            開始試算
          </button>
          <span className="text-sm text-gray-700 tabular-nums">年所得若低於 NT$ {fmt(threshold)} 免報稅</span>
        </div>
      </div>

      {/* Features */}
      <div className="mt-8">
        <p className="text-base font-semibold text-gray-500 mb-3">這個網站</p>
        <div className="space-y-8">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="shrink-0 mt-0.5 w-7 h-7 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center">
                {f.icon}
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-0.5">{f.title}</p>
                <p className="text-base text-gray-600 leading-relaxed">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
