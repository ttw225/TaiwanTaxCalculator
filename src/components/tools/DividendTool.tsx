import { useState } from 'react'
import type { TaxProfile } from '../../types/content'
import { calcDividendOptions } from '../../lib/decisions'
import { DIVIDEND_TOOL_META } from '../../content/decision-tools'
import { ToolSourceRefs } from './ToolSourceRefs'

const BRACKETS = [
  { label: '5%（年所得 59 萬以下）', value: 0.05 },
  { label: '12%（年所得 133 萬以下）', value: 0.12 },
  { label: '20%（年所得 266 萬以下）', value: 0.20 },
  { label: '30%（年所得 498 萬以下）', value: 0.30 },
  { label: '40%（年所得超過 498 萬）', value: 0.40 },
]

function fmt(n: number) {
  return n.toLocaleString('zh-TW')
}

function parseAmount(s: string): number | null {
  if (s.trim() === '') return null
  const n = Number(s.replace(/,/g, ''))
  return Number.isFinite(n) && n >= 0 ? n : null
}

export function DividendTool({ taxProfile }: { taxProfile?: TaxProfile }) {
  const [dividendStr, setDividendStr] = useState(
    taxProfile?.dividendAmount === undefined ? '' : String(taxProfile.dividendAmount),
  )
  const [bracketStr, setBracketStr] = useState(
    taxProfile?.marginalRate === undefined ? '' : String(taxProfile.marginalRate),
  )

  const dividendAmount = parseAmount(dividendStr)
  const marginalRate = bracketStr !== '' ? Number(bracketStr) : null
  const hasResult = dividendAmount !== null && marginalRate !== null
  const result = hasResult ? calcDividendOptions(dividendAmount, marginalRate) : null

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="dividend-amount" className="block text-xs font-medium text-gray-700 mb-1">
            股利金額（元）
          </label>
          <input
            id="dividend-amount"
            type="number"
            min={0}
            step={10000}
            placeholder="例：500,000"
            value={dividendStr}
            onChange={(e) => setDividendStr(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="dividend-bracket" className="block text-xs font-medium text-gray-700 mb-1">
            估算邊際稅率
          </label>
          <select
            id="dividend-bracket"
            value={bracketStr}
            onChange={(e) => setBracketStr(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-400 focus:outline-none bg-white"
          >
            <option value="">請選擇</option>
            {BRACKETS.map((b) => (
              <option key={b.value} value={b.value}>{b.label}</option>
            ))}
          </select>
        </div>
      </div>

      {result && (
        <div className="space-y-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-xs text-gray-500 uppercase">
                <th className="text-left pb-1 font-medium">計稅方式</th>
                <th className="text-right pb-1 font-medium">估算稅額</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr className={result.recommended === 'A' || result.recommended === 'equal' ? 'bg-green-50' : ''}>
                <td className="py-2 pr-2">
                  <span className="font-medium">合併計稅（選項 A）</span>
                  <span className="block text-xs text-gray-500">
                    可抵減稅額 NT${fmt(result.optionA.credit)}
                  </span>
                </td>
                <td className="py-2 text-right font-mono">
                  NT${fmt(result.optionA.tax)}
                  {(result.recommended === 'A' || result.recommended === 'equal') && (
                    <span className="ml-1.5 text-xs font-sans text-green-700">✓ 較省</span>
                  )}
                </td>
              </tr>
              <tr className={result.recommended === 'B' || result.recommended === 'equal' ? 'bg-green-50' : ''}>
                <td className="py-2 pr-2">
                  <span className="font-medium">28% 分開計稅（選項 B）</span>
                  <span className="block text-xs text-gray-500">固定稅率，不享抵減</span>
                </td>
                <td className="py-2 text-right font-mono">
                  NT${fmt(result.optionB.tax)}
                  {(result.recommended === 'B' || result.recommended === 'equal') && (
                    <span className="ml-1.5 text-xs font-sans text-green-700">✓ 較省</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="rounded bg-blue-50 px-3 py-2 text-sm">
            {result.recommended === 'equal' ? (
              <span className="text-gray-700">兩種方式估算稅額相同</span>
            ) : (
              <span className="text-gray-800 font-medium">
                {result.recommended === 'A' ? '合併計稅' : '28% 分開計稅'}較省
                <span className="ml-1 text-blue-700">NT${fmt(result.savings)}</span>
              </span>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-orange-700 leading-relaxed">{DIVIDEND_TOOL_META.disclaimer}</p>
      <ToolSourceRefs refs={DIVIDEND_TOOL_META.sourceRefs} />
    </div>
  )
}
