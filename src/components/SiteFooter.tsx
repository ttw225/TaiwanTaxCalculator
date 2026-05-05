import { ExternalLink } from 'lucide-react'
import { getDeployInfo } from '../lib/deployInfo'
import { SITE_CONFIG } from '../lib/siteConfig'

export function SiteFooter() {
  const {
    name, nameEn, taxYear, dataYear, lastUpdated,
    buyMeCoffeeUrl, githubNewIssueUrl, officialLinks,
  } = SITE_CONFIG
  const deployInfo = getDeployInfo()

  return (
    <footer className="mt-16 border-t border-gray-200 bg-white">
      <div className="max-w-5xl mx-auto px-4 py-10">

        {/* Main 2-col grid (Task 4.1) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">

          {/* Left: About + Disclaimer */}
          <div className="space-y-6">

            {/* About — Task 4.2 + 4.8 */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">關於本站</h3>
              <p className="text-base text-gray-600 leading-relaxed">
                {name} 是自發整理的節稅參考工具，開源、完全免費、無商業贊助。
                每筆資料均標示來源與更新月份。
                本站不需帳號，所有資料均在您的裝置本機處理，不上傳伺服器。
              </p>
            </div>

            {/* Disclaimer — Task 4.3 */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">申報提醒</h3>
              <p className="text-base text-gray-500 leading-relaxed">
                本站內容協助整理申報前可先檢查的項目。
                實際申報結果以財政部、稽徵機關及官方申報系統核定為準。
              </p>
            </div>
          </div>

          {/* Right: Support + Feedback */}
          <div className="space-y-6">

            {/* Support / Buy me a coffee — Task 4.5 */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">支持我們</h3>
              <p className="text-base text-gray-600 mb-2">
                如果這個工具對你有幫助，歡迎請我們喝杯咖啡 ☕
              </p>
              {buyMeCoffeeUrl ? (
                <a
                  href={buyMeCoffeeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-base font-medium text-teal-700 hover:text-teal-800"
                >
                  Buy me a coffee <ExternalLink size={13} />
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex items-center gap-1.5 text-base text-gray-300 cursor-not-allowed select-none"
                >
                  Buy me a coffee <ExternalLink size={13} />
                </span>
              )}
            </div>

            {/* Feedback — Task 4.4 */}
            <div>
              <h3 className="text-base font-semibold text-gray-900 mb-2">意見回報</h3>
              <p className="text-base text-gray-600 mb-2">資料有誤或有建議嗎？</p>
              {githubNewIssueUrl ? (
                <a
                  href={githubNewIssueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-base font-medium text-teal-700 hover:text-teal-800"
                >
                  填寫回報表單 <ExternalLink size={13} />
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex items-center gap-1.5 text-base text-gray-300 cursor-not-allowed select-none"
                >
                  填寫回報表單 <ExternalLink size={13} />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Official links — Task 4.7 */}
        {officialLinks.length > 0 && (
          <div className="mb-6 pt-5 border-t border-gray-100">
            <p className="text-sm text-gray-400 mb-2">官方資源</p>
            <div className="flex flex-wrap gap-4">
              {officialLinks.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-base text-gray-500 hover:text-gray-700"
                >
                  {link.label} <ExternalLink size={12} />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Bottom bar — Task 4.6 */}
        <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-x-2 gap-y-1 text-sm text-gray-400">
          <span>© {dataYear} {name} · {nameEn}</span>
          <span className="hidden sm:inline">·</span>
          <span>資料年度：{taxYear} 年度（{dataYear} 年 5 月申報）</span>
          <span className="hidden sm:inline">·</span>
          <span>最後更新：{lastUpdated}</span>
          {deployInfo && (
            <>
              <span className="hidden sm:inline">·</span>
              <span>{deployInfo.label}{deployInfo.detail ? ` · ${deployInfo.detail}` : ''}</span>
            </>
          )}
        </div>
      </div>
    </footer>
  )
}
