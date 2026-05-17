import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import ChecklistStartPage from '../src/pages/ChecklistStartPage'
import {
  createSituationSelectionStorageKey,
  loadSavedSituationSelection,
  parseSavedSituationSelection,
  saveSituationSelection,
  SITUATION_SELECTION_STORAGE_KEY,
} from '../src/lib/situationSelectionStorage'
import type { SituationId } from '../src/types/content'

const allowedIds: SituationId[] = ['salary_income', 'rent', 'medical_expenses']

let container: HTMLDivElement

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  localStorage.clear()
  document.body.removeChild(container)
})

function renderApp() {
  const root = createRoot(container)
  act(() => {
    root.render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/checklist/start'] },
        createElement(ChecklistStartPage),
      ),
    )
  })
  return root
}

function clickButtonByText(text: string) {
  const button = Array.from(container.querySelectorAll('button')).find((el) =>
    el.textContent?.includes(text),
  )
  if (!button) throw new Error(`Missing button with text "${text}"`)
  act(() => {
    button.click()
  })
}

describe('situation selection storage', () => {
  it('keeps localhost storage key stable and scopes GitHub Pages previews by base path', () => {
    expect(createSituationSelectionStorageKey('/')).toBe('tax.situationSelection.v1')
    expect(createSituationSelectionStorageKey('/TaiwanTaxCalculator/dev/')).toBe(
      'tax.situationSelection.v1:/TaiwanTaxCalculator/dev/',
    )
    expect(createSituationSelectionStorageKey('/TaiwanTaxCalculator/pr-preview/pr-13/')).toBe(
      'tax.situationSelection.v1:/TaiwanTaxCalculator/pr-preview/pr-13/',
    )
  })

  it('roundtrips selected situation ids', () => {
    saveSituationSelection(['rent', 'salary_income'])

    expect(loadSavedSituationSelection(allowedIds)).toEqual(['rent', 'salary_income'])
  })

  it('filters unknown and duplicated ids from saved data', () => {
    localStorage.setItem(
      SITUATION_SELECTION_STORAGE_KEY,
      JSON.stringify({ selected: ['rent', 'unknown', 'rent', 'medical_expenses'] }),
    )

    expect(loadSavedSituationSelection(allowedIds)).toEqual(['rent', 'medical_expenses'])
  })

  it('returns an empty selection for invalid JSON', () => {
    expect(parseSavedSituationSelection('not-json', allowedIds)).toEqual([])
  })

  it('clears page selection and browser storage from selecting page', () => {
    localStorage.setItem(
      SITUATION_SELECTION_STORAGE_KEY,
      JSON.stringify({ selected: ['rent', 'salary_income'] }),
    )

    renderApp()

    expect(container.textContent).toContain('選擇符合 114 年度的報稅項目')
    expect(localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY)).not.toBeNull()

    clickButtonByText('清空')

    expect(container.textContent).toContain('請先選擇至少一項情況')
    expect(localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY)).toBeNull()
  })
})
