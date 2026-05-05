import type { CategoryGroup } from './checklist'
import { checklistExportMarkdownHeader } from './checklistCardCopy'

export interface ExportOptions {
  totalSelected: number
  exportTime?: string
}

const FOOTER = `---

> **本機處理聲明：** 本清單在您的瀏覽器中產生，未上傳至伺服器。
> 下載或複製後，檔案可能包含個人稅務情境，請自行保管。`

export function formatChecklistMarkdown(
  groups: CategoryGroup[],
  options: ExportOptions,
): string {
  const { totalSelected, exportTime } = options
  const totalItems = groups.reduce((sum, g) => sum + g.items.length, 0)

  const lines: string[] = [
    checklistExportMarkdownHeader(),
    '',
    `**已選情境數**：${totalSelected} 項 **項目數**：${totalItems} 個`,
  ]

  if (exportTime) {
    lines.push(`**產生時間**：${exportTime}`)
  }

  for (const group of groups) {
    lines.push('', '---', '', `## ${group.label}`)

    for (const item of group.items) {
      lines.push('', `### ${item.title}`)

      if (item.why_it_matters) {
        lines.push('', item.why_it_matters)
      }

      if (item.eligibility_cues.length > 0) {
        lines.push('', '**適用條件**')
        for (const cue of item.eligibility_cues) {
          lines.push(`- ${cue}`)
        }
      }

      if (item.documents_to_prepare.length > 0) {
        lines.push('', '**需準備文件**')
        for (const doc of item.documents_to_prepare) {
          lines.push(`- [ ] ${doc}`)
        }
      }

      if (item.source_refs.length > 0) {
        lines.push('', '**來源**')
        for (const ref of item.source_refs) {
          const authority = ref.authority ? ` · ${ref.authority}` : ''
          lines.push(`- ${ref.label}${authority}`)
        }
      }
    }
  }

  lines.push('', FOOTER)

  return lines.join('\n')
}
