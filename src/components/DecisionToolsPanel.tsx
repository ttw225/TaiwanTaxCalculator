import type { DecisionToolId, SituationId } from '../types/content'
import { CoupleFilingTool } from './tools/CoupleFilingTool'
import { AmtTool } from './tools/AmtTool'
import {
  AMT_TOOL_META,
  COUPLE_FILING_TOOL_META,
} from '../content/decision-tools'

interface DecisionTool {
  id: DecisionToolId
  meta: { title: string; subtitle: string }
  trigger: SituationId
  component: React.ComponentType
}

const TOOLS: DecisionTool[] = [
  {
    id: 'couple_filing',
    meta: COUPLE_FILING_TOOL_META,
    trigger: 'married',
    component: CoupleFilingTool,
  },
  {
    id: 'amt',
    meta: AMT_TOOL_META,
    trigger: 'overseas_income',
    component: AmtTool,
  },
]

interface Props {
  selectedSituations: SituationId[]
}

export function DecisionToolsPanel({ selectedSituations }: Props) {
  const visibleTools = TOOLS.filter((t) => selectedSituations.includes(t.trigger))
  if (visibleTools.length === 0) return null

  return (
    <details className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-base">
      <summary className="cursor-pointer select-none font-medium text-gray-700">
        決策工具
        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
          {visibleTools.length} 項
        </span>
      </summary>

      <div className="mt-3 space-y-1 text-xs text-gray-500">
        <p>資料僅在您的瀏覽器處理，不會傳送至任何伺服器</p>
        <p>以下工具提供初步估算，實際結果請以官方系統確認</p>
      </div>

      <div className="mt-4 space-y-6">
        {visibleTools.map((tool) => {
          const Component = tool.component
          return (
            <section key={tool.id} className="border-t border-amber-200 pt-4 first:border-t-0 first:pt-0">
              <h3 className="text-base font-semibold text-gray-800 mb-0.5">{tool.meta.title}</h3>
              <p className="text-xs text-gray-500 mb-3">{tool.meta.subtitle}</p>
              <Component />
            </section>
          )
        })}
      </div>
    </details>
  )
}
