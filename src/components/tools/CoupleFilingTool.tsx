import { useState } from 'react'
import { calcCoupleFilingOptions } from '../../lib/decisions'
import { COUPLE_FILING_TOOL_META } from '../../content/decision-tools'
import { ToolSourceRefs } from './ToolSourceRefs'

function fmt(n: number) {
  return n.toLocaleString('zh-TW')
}

function parseAmount(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number(s.replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function CoupleFilingTool() {
  const [husbandStr, setHusbandStr] = useState('')
  const [wifeStr, setWifeStr] = useState('')

  const husbandSalary = parseAmount(husbandStr)
  const wifeSalary = parseAmount(wifeStr)
  const hasResult = husbandSalary !== null && wifeSalary !== null
  const result = hasResult ? calcCoupleFilingOptions(husbandSalary, wifeSalary) : null

  const minTax = result ? Math.min(...result.modes.map((m) => m.tax)) : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="couple-husband-salary" className="block text-xs font-medium text-gray-700 mb-1">
            先生薪資所得（元）
          </label>
          <input
            id="couple-husband-salary"
            type="number"
            min={0}
            step={10000}
            placeholder="例：800,000"
            value={husbandStr}
            onChange={(e) => setHusbandStr(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="couple-wife-salary" className="block text-xs font-medium text-gray-700 mb-1">
            太太薪資所得（元）
          </label>
          <input
            id="couple-wife-salary"
            type="number"
            min={0}
            step={10000}
            placeholder="例：600,000"
            value={wifeStr}
            onChange={(e) => setWifeStr(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
      </div>

      {result && minTax !== null && (
        <div className="space-y-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left pb-1 font-medium">申報方式</th>
                <th className="text-right pb-1 font-medium">估算稅額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {result.modes.map((mode) => {
                const isBest = mode.tax === minTax
                return (
                  <tr key={mode.label} className={isBest ? 'bg-green-50' : ''}>
                    <td className="py-2 pr-2">
                      <span className="font-medium">{mode.label}</span>
                    </td>
                    <td className="py-2 text-right font-mono">
                      NT${fmt(mode.tax)}
                      {isBest && (
                        <span className="ml-1.5 text-xs font-sans text-green-700">✓ 最省</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="rounded bg-blue-50 px-3 py-2 text-sm">
            {result.savings === 0 ? (
              <span className="text-gray-700">三種方式估算稅額相同</span>
            ) : (
              <span className="text-gray-800 font-medium">
                {result.modes[result.bestIndex].label}估算最省，與次優方案相差
                <span className="ml-1 text-blue-700">NT${fmt(result.savings)}</span>
              </span>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-orange-700 leading-relaxed">{COUPLE_FILING_TOOL_META.disclaimer}</p>
      <ToolSourceRefs refs={COUPLE_FILING_TOOL_META.sourceRefs} />
    </div>
  )
}
