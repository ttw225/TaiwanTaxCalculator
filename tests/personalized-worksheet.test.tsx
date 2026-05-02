import { act, createElement, useState } from 'react'
import type { ReactElement } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TaxProfile, TaxProfilePersistenceMode } from '../src/types/content'
import { DecisionToolsPanel } from '../src/components/DecisionToolsPanel'
import { PersonalizedWorksheetPanel } from '../src/components/PersonalizedWorksheetPanel'
import { createPersonalizedReport } from '../src/lib/personalizedReport'
import { formatChecklistMarkdown } from '../src/lib/exportChecklist'

let container: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  document.body.removeChild(container)
  vi.restoreAllMocks()
})

function renderInteractive(element: ReactElement) {
  const root = createRoot(container)
  act(() => {
    root.render(element)
  })
  return root
}

function inputByTestId(testId: string) {
  const input = container.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement | HTMLSelectElement | null
  if (!input) throw new Error(`Missing input ${testId}`)
  return input
}

function setInputValue(testId: string, value: string) {
  const input = inputByTestId(testId)
  act(() => {
    const proto = input instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype
    const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    valueSetter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

function clickByTestId(testId: string) {
  const el = container.querySelector(`[data-testid="${testId}"]`) as HTMLElement | null
  if (!el) throw new Error(`Missing element ${testId}`)
  act(() => {
    el.click()
  })
}

function WorksheetHarness() {
  const [profile, setProfile] = useState<TaxProfile>({ housingType: 'none', medicalExpenseRange: 'none' })
  const [mode, setMode] = useState<TaxProfilePersistenceMode>('session')
  return createElement(PersonalizedWorksheetPanel, {
    profile,
    report: createPersonalizedReport(profile),
    persistenceMode: mode,
    onProfileChange: (patch) => setProfile((prev) => ({ ...prev, ...patch })),
    onPersistenceChange: setMode,
    onClear: () => setProfile({ housingType: 'none', medicalExpenseRange: 'none' }),
  })
}

describe('PersonalizedWorksheetPanel', () => {
  it('renders the worksheet and privacy notice', () => {
    const html = renderToStaticMarkup(
      createElement(PersonalizedWorksheetPanel, {
        profile: { housingType: 'none', medicalExpenseRange: 'none' },
        report: createPersonalizedReport({}),
        persistenceMode: 'session',
        onProfileChange: () => undefined,
        onPersistenceChange: () => undefined,
        onClear: () => undefined,
      }),
    )

    expect(html).toContain('data-testid="personalized-worksheet-panel"')
    expect(html).toContain('資料僅在您的瀏覽器處理')
    expect(html).toContain('個人化行動報告')
  })

  it('updates the report after field changes', () => {
    renderInteractive(createElement(WorksheetHarness))
    setInputValue('profile-housing-type', 'rent')
    setInputValue('profile-rent-amount', '120000')

    expect(container.textContent).toContain('租屋扣除文件優先整理')
  })

  it('calls opt-in persistence and clear actions', () => {
    const onPersistenceChange = vi.fn()
    const onClear = vi.fn()
    renderInteractive(
      createElement(PersonalizedWorksheetPanel, {
        profile: { housingType: 'none', medicalExpenseRange: 'none' },
        report: createPersonalizedReport({}),
        persistenceMode: 'session',
        onProfileChange: () => undefined,
        onPersistenceChange,
        onClear,
      }),
    )

    clickByTestId('profile-persist-toggle')
    clickByTestId('profile-clear-btn')

    expect(onPersistenceChange).toHaveBeenCalledWith('local')
    expect(onClear).toHaveBeenCalled()
  })
})

describe('profile-aware decision tools and export', () => {
  it('prefills decision tool inputs from tax profile', () => {
    const html = renderToStaticMarkup(
      createElement(DecisionToolsPanel, {
        selectedSituations: ['dividends', 'married', 'overseas_income'],
        taxProfile: {
          dividendAmount: 500_000,
          marginalRate: 0.2,
          isMarried: true,
          selfSalary: 800_000,
          spouseSalary: 600_000,
          overseasIncome: 1_500_000,
        },
      }),
    )

    expect(html).toContain('value="500000"')
    expect(html).toContain('value="800000"')
    expect(html).toContain('value="600000"')
    expect(html).toContain('value="1500000"')
  })

  it('clears decision tool inputs when profile values are cleared', () => {
    const root = renderInteractive(
      createElement(DecisionToolsPanel, {
        selectedSituations: ['dividends', 'married', 'overseas_income'],
        taxProfile: {
          dividendAmount: 500_000,
          marginalRate: 0.2,
          isMarried: true,
          selfSalary: 800_000,
          spouseSalary: 600_000,
          overseasIncome: 1_500_000,
        },
      }),
    )

    expect((document.getElementById('dividend-amount') as HTMLInputElement).value).toBe('500000')
    expect(container.textContent).toContain('合併計稅')
    expect(container.textContent).toContain('已達門檻')

    act(() => {
      root.render(
        createElement(DecisionToolsPanel, {
          selectedSituations: ['dividends', 'married', 'overseas_income'],
          taxProfile: {},
        }),
      )
    })

    expect((document.getElementById('dividend-amount') as HTMLInputElement).value).toBe('')
    expect((document.getElementById('dividend-bracket') as HTMLSelectElement).value).toBe('')
    expect((document.getElementById('couple-husband-salary') as HTMLInputElement).value).toBe('')
    expect((document.getElementById('couple-wife-salary') as HTMLInputElement).value).toBe('')
    expect((document.getElementById('amt-overseas-income') as HTMLInputElement).value).toBe('')
    expect(container.textContent).not.toContain('估算稅額')
    expect(container.textContent).not.toContain('已達門檻')
  })

  it('exports the personalized report without internal storage metadata', () => {
    const report = createPersonalizedReport({ housingType: 'rent', rentAmount: 120_000 })
    const markdown = formatChecklistMarkdown([], {
      totalSelected: 1,
      personalizedReport: report,
    })

    expect(markdown).toContain('## 個人化行動報告')
    expect(markdown).toContain('租屋扣除文件優先整理')
    expect(markdown).toContain('手動輸入資料')
    expect(markdown).not.toContain('tax.personalizedWorksheet.v1')
    expect(markdown).not.toContain('verification_status')
  })
})
