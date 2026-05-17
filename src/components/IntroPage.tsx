import { getNumber } from '../lib/numbers'
import { createPublicAssetUrl } from '../lib/publicAsset'

interface Props {
  onStart: () => void
}

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
    title: '確認項目適用資格',
    body: '查看各項目的適用資格與限制條件，協助進行判斷並準備資料。',
    detailImages: [
      { title: '節稅試算清單', imageSrc: createPublicAssetUrl('introduction-image/Step2-1.png'), imageAlt: '步驟 2-1 示意圖' },
      { title: '查看項目適用條件與準備資料', imageSrc: createPublicAssetUrl('introduction-image/Step2-2.png'), imageAlt: '步驟 2-2 示意圖' },
    ],
  },
  {
    n: '3',
    kicker: '試算匯出',
    title: '即時試算，提供申報建議',
    imageSrc: '',
    imageAlt: '步驟 3 示意圖',
    body: (
      <>
        填寫資料後，系統會
        <strong>推薦稅額組合，並提供所有組合的比較</strong>
        ；也可匯出為 PDF 或 Markdown，供後續申報參考。
      </>
    ),
    resultCards: [
      { title: '綜合所得總額', size: 'wide', imageSrc: createPublicAssetUrl('introduction-image/Step3-1-income-mobile.png'), imageSrcDesktop: createPublicAssetUrl('introduction-image/Step3-1-income-web.png'), imageAlt: '綜合所得總額示意圖', desktopImageZoom: true },
      { title: '一般扣除額', size: 'narrow', imageSrc: createPublicAssetUrl('introduction-image/Step3-2-income-mobile.png'), imageSrcDesktop: createPublicAssetUrl('introduction-image/Step3-2-count-web.png'), imageAlt: '一般扣除額示意圖' },
      { title: '特別扣除額', size: 'narrow', imageSrc: createPublicAssetUrl('introduction-image/Step3-3-special-mobile.png'), imageSrcDesktop: createPublicAssetUrl('introduction-image/Step3-3-special-web.png'), imageAlt: '特別扣除額示意圖' },
      { title: '填寫摘要、試算結果', size: 'wide', imageSrc: createPublicAssetUrl('introduction-image/Step3-4-summary-mobile.png'), imageSrcDesktop: createPublicAssetUrl('introduction-image/Step3-4-summary-web.png'), imageAlt: '試算摘要示意圖' },
      { title: '比較所有稅額組合', size: 'full', imageSrc: createPublicAssetUrl('introduction-image/Step3-5-result-mobile.png'), imageSrcDesktop: createPublicAssetUrl('introduction-image/Step3-5-result-web.png'), imageAlt: '試算結果與組合比較示意圖' },
    ],
  },
]

export function IntroPage({ onStart }: Props) {
  const threshold =
    getNumber('exemption_general') +
    getNumber('standard_deduction_single') +
    getNumber('special_deduction_salary')
  const fmt = (n: number) => n.toLocaleString('zh-TW')
  const heroImageSrc = createPublicAssetUrl('Hero.svg')

  return (
    <div className="max-w-5xl mx-auto px-4 pt-16 sm:pt-20 lg:pt-24 pb-8">
      <div>
        <div>
          {/* Hero */}
          <div className="mb-10 mt-2 sm:mt-3 lg:mt-4">
            <h1 className="text-3xl sm:text-[4rem] font-bold tracking-tight text-gray-900 leading-[1.15] text-balance mb-3 sm:mb-6">
              <span className="sm:hidden">一次搞懂申報規則，邊看邊試算更簡單</span>
              <span className="hidden sm:inline">
                一次搞懂申報規則，<br />
                邊看邊試算更簡單
              </span>
            </h1>
            <p className="text-base text-gray-500 max-w-xl mb-6 leading-relaxed">
              把複雜的報稅項目規則變得簡單易懂，提供即時試算和匯出，申報前更有把握。
              <br />
              試算資料僅保留於您的瀏覽器；專案原始碼公開於
              {' '}
              <a
                href="https://github.com/ttw225/TaiwanTaxCalculator"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-700 underline hover:text-blue-800"
              >
                <svg className="inline w-4 h-4 align-text-bottom mr-0.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                </svg>
                GitHub
              </a>
              ，內容透明可查。
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
            <div className="mt-7 sm:mt-8">
              <img
                src={heroImageSrc}
                alt="報稅流程示意圖"
                className="w-full h-auto object-contain"
                loading="lazy"
              />
            </div>
          </div>

        </div>

      </div>

      {/* How it works — vertical timeline (Option D) */}
      <div className="mb-10 mt-20 lg:mt-20">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">三個步驟，快速完成申報前準備</h2>
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
                  <p className="text-lg font-medium text-blue-700 mb-1.5 leading-snug">{s.title}</p>
                  <p className="text-base text-gray-600 leading-relaxed mb-3">{s.body}</p>
                </div>
                <div className="pl-14">
                  {s.resultCards?.length ? (
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-6">
                      {s.resultCards.map((card) => (
                        <div
                          key={card.title}
                          className={`flex flex-col rounded-xl border border-gray-200 bg-white p-3 ${
                            card.size === 'full' ? 'h-auto' : 'h-[320px] lg:h-[500px]'
                          } ${
                            card.size === 'full' ? 'lg:col-span-6' : card.size === 'wide' ? 'lg:col-span-4' : 'lg:col-span-2'
                          }`}
                        >
                          <p className="text-base font-medium text-gray-700 mb-2">{card.title}</p>
                          {card.size === 'full' ? (
                            <div className="overflow-hidden rounded-lg border border-gray-200 bg-[#F4F6F8]">
                              <div className="aspect-video w-full">
                                {card.imageSrc ? (
                                  <picture>
                                    {card.imageSrcDesktop ? <source media="(min-width: 1024px)" srcSet={card.imageSrcDesktop} /> : null}
                                    <img
                                      src={card.imageSrc}
                                      alt={card.imageAlt}
                                      className="h-full w-full object-contain"
                                      loading="lazy"
                                    />
                                  </picture>
                                ) : (
                                  <div className="h-full w-full bg-[#F4F6F8]" aria-hidden="true" />
                                )}
                              </div>
                            </div>
                          ) : card.size === 'narrow' ? (
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
                                    className={`h-full w-full object-contain ${
                                      card.desktopImageZoom ? 'lg:scale-110 lg:origin-top' : ''
                                    }`}
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
                  ) : s.detailImages?.length ? (
                    <div className="space-y-3">
                      {s.detailImages.map((image) => (
                        <div key={image.title} className="overflow-hidden rounded-xl border border-gray-200 bg-white p-3">
                          <p className="text-base font-medium text-gray-700 mb-2">{image.title}</p>
                          <div className="h-full w-full overflow-hidden rounded-lg border border-gray-200 bg-[#F4F6F8]">
                            <img
                              src={image.imageSrc}
                              alt={image.imageAlt}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
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

      {/* CTA */}
      <div className="mt-16 pt-8 sm:pt-10 pb-4 flex items-center gap-12">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
            開始試算，做好申報準備
          </h2>
          <span className="text-sm text-gray-700 tabular-nums">年所得若低於 NT$ {fmt(threshold)} 免報稅</span>
        </div>
        <button
          type="button"
          onClick={onStart}
          data-padding="custom"
          className="shrink-0 px-6 py-3 rounded-xl text-base font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          開始試算
        </button>
      </div>
    </div>
  )
}
