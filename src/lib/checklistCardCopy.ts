import { SITE_CONFIG } from './siteConfig'

/** Shown under checklist cards when `show_wealth_clause_notice` is true (footer). */
export const WEALTH_CLAUSE_NOTICE =
  '此項涉及個人條件或排富規定，請以財政部電子申報系統與官方資料確認。'

/** Third line of the checklist usage reminder (page + export); no badge wording. */
export const CHECKLIST_USAGE_REMINDER_COMPLEX_ITEMS =
  '若有項目涉及個人條件或排富條款，該項目下方會顯示提醒；仍請以財政部電子申報系統與官方資料確認後，再決定是否申報。'

export function checklistExportMarkdownHeader(): string {
  const { taxYear } = SITE_CONFIG
  return `# ${taxYear} 年度所得稅節稅清單

> **使用提醒：** 本清單協助整理可能適用的申報項目，根據 ${taxYear} 年度相關法規與官方資料整理。
> 正式申報結果及稅負計算請以財政部電子申報系統為準，並視個人情況向稅務機關或記帳士確認。
> ${CHECKLIST_USAGE_REMINDER_COMPLEX_ITEMS}`
}

/** Site identity banner shown above the checklist heading in markdown exports. */
export function checklistExportSiteHeader(): string {
  const { name, nameEn, taxYear, tagline, siteUrl } = SITE_CONFIG
  return `**[${name}](${siteUrl})** · ${nameEn} · ${taxYear} 年度

${tagline}`
}

/** Site footer information block appended at the end of markdown exports. */
export function checklistExportSiteFooter(): string {
  const {
    name,
    nameEn,
    taxYear,
    dataYear,
    lastUpdated,
    siteUrl,
    officialLinks,
    googleFormUrl,
    githubNewIssueUrl,
    buyMeCoffeeUrl,
  } = SITE_CONFIG
  const lines: string[] = [
    '---',
    '',
    '## 關於本站',
    '',
    `${name}是自發整理的綜合所得稅參考工具，開源、完全免費、無商業贊助。試算無須登入，資料僅保存在您的瀏覽器。`,
    '',
    `資料年度：${taxYear} 年度（${dataYear} 年 5 月申報） · 最後更新：${lastUpdated}`,
    '',
    '## 申報提醒',
    '',
    '本網站內容供申報前整理與試算參考，實際申報結果請以官方公告與申報系統認定為準。',
  ]
  const visibleOfficialLinks = officialLinks.filter((l) => l.url.trim() !== '')
  if (visibleOfficialLinks.length > 0) {
    lines.push('')
    lines.push(visibleOfficialLinks.map((l) => `[${l.label}](${l.url})`).join(' · '))
  }

  lines.push('', '## 意見回報', '', '發現資料有誤、連結失效，或有功能建議，歡迎透過以下方式告訴我們。')
  const feedbackLinks: string[] = []
  if (googleFormUrl.trim() !== '') feedbackLinks.push(`[填寫意見表單](${googleFormUrl})`)
  if (githubNewIssueUrl.trim() !== '') feedbackLinks.push(`[在 GitHub 回報](${githubNewIssueUrl})`)
  if (feedbackLinks.length > 0) {
    lines.push('')
    lines.push(feedbackLinks.join(' · '))
  }

  lines.push('', '## 支持我們', '', '如果這個工具對您有幫助，歡迎請我們喝杯咖啡 ☕')
  if (buyMeCoffeeUrl.trim() !== '') {
    lines.push('')
    lines.push(`[Buy me a coffee](${buyMeCoffeeUrl})`)
  }

  lines.push('')
  lines.push(`© ${dataYear} [${name}](${siteUrl}) · ${nameEn}`)
  return lines.join('\n')
}
