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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

          {/* Left: About + Disclaimer */}
          <div className="space-y-6">

            {/* About — Task 4.2 + 4.8 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">關於本站</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                台灣節稅資訊平台是自發整理的綜合所得稅參考工具，開源、完全免費、無商業贊助。
                試算無須登入，資料僅保存在您的瀏覽器。
              </p>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                資料年度：{taxYear} 年度（{dataYear} 年 5 月申報）
                <br />
                最後更新：{lastUpdated}
              </p>
            </div>

            {/* Disclaimer — Task 4.3 */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">申報提醒</h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                本網站內容供申報前整理與試算參考，
                實際申報結果請以官方公告與申報系統認定為準。
              </p>
              {officialLinks.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-3">
                  {officialLinks.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
                    >
                      {link.label} <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Support + Feedback */}
          <div className="space-y-6">

            {/* Support / Buy me a coffee — Task 4.5 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">支持我們</h3>
              <p className="text-sm text-gray-600 mb-2">
                如果這個工具對您有幫助，歡迎請我們喝杯咖啡 ☕
              </p>
              {buyMeCoffeeUrl ? (
                <a
                  href={buyMeCoffeeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
                >
                  Buy me a coffee <ExternalLink size={13} />
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-300 cursor-not-allowed select-none"
                >
                  Buy me a coffee <ExternalLink size={13} />
                </span>
              )}
            </div>

            {/* Feedback — Task 4.4 */}
            <div className="pt-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">意見回報</h3>
              <p className="text-sm text-gray-600 mb-2">資料有誤、連結失效，或有功能建議，歡迎填寫回報表單。</p>
              {githubNewIssueUrl ? (
                <a
                  href={githubNewIssueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-800"
                >
                  填寫回報表單 <ExternalLink size={13} />
                </a>
              ) : (
                <span
                  aria-disabled="true"
                  className="inline-flex items-center gap-1.5 text-sm text-gray-300 cursor-not-allowed select-none"
                >
                  填寫回報表單 <ExternalLink size={13} />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Bottom bar — Task 4.6 */}
        <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-x-2 gap-y-1 text-sm text-gray-400">
          <span>© {dataYear} {name} · {nameEn}</span>
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
