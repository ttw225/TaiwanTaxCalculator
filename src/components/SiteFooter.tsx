import { ClipboardList, ExternalLink } from 'lucide-react'
import { getDeployInfo } from '../lib/deployInfo'
import { SITE_CONFIG } from '../lib/siteConfig'

export function SiteFooter() {
  const {
    name, nameEn, taxYear, dataYear, lastUpdated,
    buyMeCoffeeUrl, googleFormUrl, githubNewIssueUrl, officialLinks,
  } = SITE_CONFIG
  const deployInfo = getDeployInfo()

  return (
    <footer className="site-footer mt-16 border-t border-gray-200 bg-white">
      <div className="print-footer-content max-w-5xl mx-auto px-4 py-10">

        {/* Main 2-col grid (Task 4.1) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">

          {/* Left: About + Disclaimer */}
          <div className="space-y-6">

            {/* About — Task 4.2 + 4.8 */}
            <div className="print-footer-section">
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
            <div className="print-footer-section pt-2">
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

          {/* Right: Feedback + Support */}
          <div className="space-y-6">

            {/* Feedback */}
            <div className="print-footer-section">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">意見回報</h3>
              <p className="text-sm text-gray-600 mb-3">
                發現資料有誤、連結失效，或有功能建議，歡迎透過以下方式告訴我們。
              </p>
              <div className="flex flex-wrap gap-2">
                {googleFormUrl ? (
                  <a
                    href={googleFormUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-3 py-1 hover:bg-teal-100 hover:text-teal-800 transition-colors"
                  >
                    <ClipboardList size={13} />
                    填寫意見表單
                    <ExternalLink size={11} />
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-300 border border-gray-100 rounded-full px-3 py-1 cursor-not-allowed select-none"
                  >
                    <ClipboardList size={13} />
                    填寫意見表單
                    <ExternalLink size={11} />
                  </span>
                )}
                {githubNewIssueUrl ? (
                  <a
                    href={githubNewIssueUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-full px-3 py-1 hover:bg-slate-100 hover:text-slate-800 transition-colors"
                  >
                    <svg className="w-[13px] h-[13px] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
                    在 GitHub 回報
                    <ExternalLink size={11} />
                  </a>
                ) : (
                  <span
                    aria-disabled="true"
                    className="inline-flex items-center gap-1.5 text-sm text-gray-300 border border-gray-100 rounded-full px-3 py-1 cursor-not-allowed select-none"
                  >
                    <svg className="w-[13px] h-[13px] shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" /></svg>
                    在 GitHub 回報
                    <ExternalLink size={11} />
                  </span>
                )}
              </div>
            </div>

            {/* Support / Buy me a coffee — Task 4.5 */}
            <div className="print-footer-section pt-2">
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
