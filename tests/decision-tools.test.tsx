import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DecisionToolsPanel } from '../src/components/DecisionToolsPanel'

describe('DecisionToolsPanel', () => {
  it('renders selected tools without showing results before inputs are filled', () => {
    const html = renderToStaticMarkup(
      createElement(DecisionToolsPanel, {
        selectedSituations: ['dividends', 'married', 'overseas_income'],
      }),
    )

    expect(html).toContain('決策工具')
    expect(html).toContain('股利課稅方式試算')
    expect(html).toContain('夫妻申報方式比較')
    expect(html).toContain('海外所得 AMT 門檻確認')
    expect(html).not.toContain('三種方式估算稅額相同')
    expect(html).not.toContain('未達門檻')
    expect(html).not.toContain('估算稅額')
  })

  it('does not render when no decision-triggering situation is selected', () => {
    const html = renderToStaticMarkup(
      createElement(DecisionToolsPanel, {
        selectedSituations: ['salary_income'],
      }),
    )

    expect(html).toBe('')
  })
})
