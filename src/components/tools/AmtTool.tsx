import { useState } from 'react'
import { checkAmtThreshold } from '../../lib/decisions'
import { AMT_TOOL_META, AMT_CHECKLIST_STEPS } from '../../content/decision-tools'
import { ToolSourceRefs } from './ToolSourceRefs'

function fmt(n: number) {
  return n.toLocaleString('zh-TW')
}

function parseAmount(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number(s.replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function AmtTool() {
  const [incomeStr, setIncomeStr] = useState('')

  const overseasIncome = parseAmount(incomeStr)
  const result = overseasIncome !== null ? checkAmtThreshold(overseasIncome) : null

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="amt-overseas-income" className="block text-xs font-medium text-gray-700 mb-1">
          估算全年海外所得（元）
        </label>
        <input
          id="amt-overseas-income"
          type="number"
          min={0}
          step={100000}
          placeholder="例：1500000"
          value={incomeStr}
          onChange={(e) => setIncomeStr(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none sm:max-w-xs"
        />
      </div>

      {result && (
        <div className="space-y-3">
          {!result.aboveThreshold ? (
            <div className="rounded bg-green-50 border border-green-200 px-3 py-2 text-sm">
              <span className="text-green-800 font-medium">✓ 未達門檻</span>
              <p className="mt-0.5 text-green-700 text-xs">
                全年海外所得未達 NT${fmt(result.threshold)}，一般不須進入最低稅負制計算流程。
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded bg-orange-50 border border-orange-200 px-3 py-2 text-sm">
                <span className="text-orange-800 font-medium">! 已達門檻，建議確認以下五項</span>
                <p className="mt-0.5 text-orange-700 text-xs">
                  全年海外所得達 NT${fmt(result.threshold)} 以上，需進一步確認是否須申報最低稅負制。
                </p>
              </div>
              <ol className="space-y-2">
                {AMT_CHECKLIST_STEPS.map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs text-gray-700">
                    <span className="shrink-0 w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-medium">
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="text-xs text-gray-600 font-medium">
                計算方式較複雜，建議諮詢稅務師或記帳士。
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-orange-700 leading-relaxed">{AMT_TOOL_META.disclaimer}</p>
      <ToolSourceRefs refs={AMT_TOOL_META.sourceRefs} />
    </div>
  )
}
