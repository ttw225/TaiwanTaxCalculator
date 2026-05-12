import { getNumber } from '../lib/numbers'
import { createPublicAssetUrl } from '../lib/publicAsset'

interface Props {
  onStart: () => void
}

const FEATURES = [
  {
    title: '快速釐清可申報的報稅項目',
    body: '篩選申報項目，了解適用資格與限制條件，快速判斷並準備資料。',
    icon: (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
      </svg>
    ),
  },
  {
    title: '即時試算，提供申報建議',
    body: '完成試算後可比較不同申報方式差異，並匯出結果，供後續參考。',
    icon: (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-7a2 2 0 00-2-2H6a2 2 0 00-2 2v7a2 2 0 002 2zm10-9V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    title: '試算資料僅存在您的瀏覽器上，專案開源透明',
    body: (
      <>
        試算資料僅保留於您的瀏覽器；專案原始碼公開於
        {' '}
        <a
          href="https://github.com/ttw225/TaiwanTaxCalculator"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline hover:text-blue-800"
        >
          GitHub
        </a>
        ，內容透明可查。
      </>
    ),
    icon: (
      <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m-6-8h6M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
      </svg>
    ),
  },
]

const STEPS = [
  {
    n: '1',
    kicker: '篩選項目',
    title: '篩選可申報項目',
    imageSrc: createPublicAssetUrl('introduction-image/Step1.png'),
    imageAlt: '步驟 1 示意圖',
    body: (
      <>
        依照申報年度，先從
        <strong>申報方式</strong>
        、
        <strong>所得來源</strong>
        、
        <strong>一般扣除額</strong>
        與
        <strong>特別扣除額</strong>
        勾選可能適用項目，快速縮小需要確認的範圍。
      </>
    ),
  },
  {
    n: '2',
    kicker: '確認資格',
    title: '確認資格與所需資料',
    imageSrc: createPublicAssetUrl('introduction-image/Step2.png'),
    imageAlt: '步驟 2 示意圖',
    body: '查看各項目的適用資格與限制條件，並準備對應資料，減少申報前反覆查找。',
  },
  {
    n: '3',
    kicker: '試算匯出',
    title: '即時試算並匯出結果',
    imageSrc: '',
    imageAlt: '步驟 3 示意圖',
    body: '系統即時更新試算結果與建議方向，完成後可匯出，供後續申報參考。',
    resultCards: [
      { title: '綜合所得總額', size: 'wide', imageSrc: createPublicAssetUrl('introduction-image/Step3-1-income-mobile.png'), imageSrcDesktop: createPublicAssetUrl('introduction-image/Step3-1-income-web.png'), imageAlt: '綜合所得總額示意圖' },
      { title: '一般扣除額', size: 'narrow', imageSrc: createPublicAssetUrl('introduction-image/Step3-2-income-mobile.png'), imageSrcDesktop: createPublicAssetUrl('introduction-image/Step3-2-count-web.png'), imageAlt: '一般扣除額示意圖' },
      { title: '特別扣除額', size: 'narrow', imageSrc: createPublicAssetUrl('introduction-image/Step3-3-special-mobile.png'), imageSrcDesktop: createPublicAssetUrl('introduction-image/Step3-3-special-web.png'), imageAlt: '特別扣除額示意圖' },
      { title: '試算摘要', size: 'wide', imageSrc: createPublicAssetUrl('introduction-image/Step3-4-summary-mobile.png'), imageSrcDesktop: createPublicAssetUrl('introduction-image/Step3-4-summary-web.png'), imageAlt: '試算摘要示意圖' },
    ],
  },
]

export function IntroPage({ onStart }: Props) {
  const threshold =
    getNumber('exemption_general') +
    getNumber('standard_deduction_single') +
    getNumber('special_deduction_salary')
  const fmt = (n: number) => n.toLocaleString('zh-TW')

  return (
    <div className="max-w-5xl mx-auto px-4 pt-24 pb-8">
      {/* Hero */}
      <div className="mb-10 mt-4">
        <h1 className="text-3xl sm:text-[4rem] font-bold tracking-tight text-gray-900 leading-[1.15] text-balance mb-3 sm:mb-6">
          <span className="sm:hidden">一次搞懂申報規則，邊看邊試算更簡單</span>
          <span className="hidden sm:inline">
            一次搞懂申報規則，<br />
            邊看邊試算更簡單
          </span>
        </h1>
        <p className="text-base text-gray-500 max-w-xl mb-6 leading-relaxed">
          把複雜的報稅項目規則變得簡單易懂，提供即時試算和匯出，申報前更有把握。
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
      <div className="mt-20">
        <div className="space-y-10">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex gap-4">
              <div className="shrink-0 mt-0.5 w-7 h-7 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center">
                {f.icon}
              </div>
              <div>
                <p className="text-[18px] font-medium text-gray-900 mb-0.5">{f.title}</p>
                <p className="text-base text-gray-600 leading-relaxed">{f.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* How it works — vertical timeline (Option D) */}
      <div className="mb-10 mt-20 lg:mt-20">
        <p className="text-xs font-semibold text-gray-500 tracking-wide uppercase mb-2">操作步驟</p>
        <h2 className="text-xl font-semibold text-gray-900 tracking-tight mb-2">三個步驟，快速完成申報前準備</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-12">先釐清可報項目，再即時試算與匯出，整個流程更清楚也更有把握。</p>
        <div className="relative">
          {STEPS.map((s, idx) => (
            <div key={s.n} className={idx < STEPS.length - 1 ? 'mb-10' : ''}>
              <div className="relative">
                {idx < STEPS.length - 1 ? (
                  <div className="absolute left-[19px] top-10 h-[calc(100%+2.5rem)] w-px bg-blue-200" aria-hidden="true" />
                ) : null}
                <div className="sticky top-14 z-10 bg-gray-50 pl-14 pt-2 pb-3">
                  <div className="absolute left-0 top-0 w-10 h-10 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center">
                    <span className="font-mono text-sm font-semibold text-blue-700">{s.n}</span>
                  </div>
                  <p className="text-[18px] font-medium text-blue-700 mb-1.5 leading-snug">{s.title}</p>
                  <p className="text-[16px] text-gray-600 leading-relaxed mb-3">{s.body}</p>
                </div>
                <div className="pl-14">
                  {s.resultCards?.length ? (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
                      {s.resultCards.map((card) => (
                        <div
                          key={card.title}
                          className={`flex h-[320px] flex-col rounded-xl border border-gray-200 bg-white p-3 lg:h-[500px] ${
                            card.size === 'wide' ? 'lg:col-span-4' : 'lg:col-span-2'
                          }`}
                        >
                          <p className="text-[16px] font-medium text-gray-700 mb-2">{card.title}</p>
                          {card.size === 'narrow' ? (
                            <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-[#F4F6F8] lg:flex lg:items-center lg:justify-center">
                              <div className="h-full w-full overflow-hidden lg:w-auto lg:aspect-[3/4]">
                                {card.imageSrc ? (
                                  <picture>
                                    {card.imageSrcDesktop ? <source media="(min-width: 1024px)" srcSet={card.imageSrcDesktop} /> : null}
                                    <img
                                      src={card.imageSrc}
                                      alt={card.imageAlt}
                                      className="h-full w-full object-contain lg:object-cover"
                                      loading="lazy"
                                    />
                                  </picture>
                                ) : (
                                  <div className="h-full w-full bg-[#F4F6F8]" aria-hidden="true" />
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-[#F4F6F8]">
                              {card.imageSrc ? (
                                <picture>
                                  {card.imageSrcDesktop ? <source media="(min-width: 1024px)" srcSet={card.imageSrcDesktop} /> : null}
                                  <img
                                    src={card.imageSrc}
                                    alt={card.imageAlt}
                                    className="h-full w-full object-contain lg:object-cover"
                                    loading="lazy"
                                  />
                                </picture>
                              ) : (
                                <div className="h-full w-full bg-[#F4F6F8]" aria-hidden="true" />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                      <div className="h-full w-full overflow-hidden bg-[#F4F6F8]">
                        {s.imageSrc ? (
                          <img
                            src={s.imageSrc}
                            alt={s.imageAlt}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-full min-h-[220px] w-full bg-[#F4F6F8]" aria-hidden="true" />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
