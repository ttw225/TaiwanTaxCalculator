/** Shown under checklist cards when `show_wealth_clause_notice` is true (footer). */
export const WEALTH_CLAUSE_NOTICE =
  '此項涉及個人條件或排富規定，請以財政部電子申報系統與官方資料確認。'

/** Third line of the checklist usage reminder (page + export); no badge wording. */
export const CHECKLIST_USAGE_REMINDER_COMPLEX_ITEMS =
  '若有項目涉及個人條件或排富條款，該項目下方會顯示提醒；仍請以財政部電子申報系統與官方資料確認後，再決定是否申報。'

export function checklistExportMarkdownHeader(): string {
  return `# 114 年度所得稅節稅清單

> **使用提醒：** 本清單協助整理可能適用的申報項目，根據114年度相關法規與官方資料整理。
> 正式申報結果及稅負計算請以財政部電子申報系統為準，並視個人情況向稅務機關或記帳士確認。
> ${CHECKLIST_USAGE_REMINDER_COMPLEX_ITEMS}`
}
