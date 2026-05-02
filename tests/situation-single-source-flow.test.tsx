import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { SITUATION_SELECTION_STORAGE_KEY } from '../src/lib/situationSelectionStorage'

const LEGACY_MANUAL_OVERRIDES_STORAGE_KEY = 'tax.checklist.manualOverrides.v1'

let container: HTMLDivElement
let scrollToSpy: ReturnType<typeof vi.fn>
let scrollIntoViewSpy: ReturnType<typeof vi.fn>
let lastScrollTargetTestId: string | null

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  scrollToSpy = vi.fn()
  lastScrollTargetTestId = null
  scrollIntoViewSpy = vi.fn(function (this: HTMLElement) {
    lastScrollTargetTestId = this.getAttribute('data-testid')
  })
  Object.defineProperty(window, 'scrollTo', { value: scrollToSpy, configurable: true })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    value: scrollIntoViewSpy,
    configurable: true,
  })
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
    root.render(createElement(App))
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

function clickByTestId(testId: string) {
  const element = container.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
  if (!element) throw new Error(`Missing element with data-testid "${testId}"`)
  act(() => {
    element.click()
  })
}

describe('situation single-source flow', () => {
  it('supports grouped situation add modal and synchronized removal', () => {
    renderApp()
    clickButtonByText('有薪資收入')
    clickButtonByText('產生節稅清單')

    expect(container.textContent).toContain('節稅清單')
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0)
    expect(container.textContent).not.toContain('帶入說明')
    expect(container.textContent).not.toContain('一個情境可能對應多個檢核項目')
    expect(container.textContent).not.toContain('來源情境：')

    clickByTestId('open-add-situation-modal-btn')
    expect(container.textContent).toContain('申報方式')
    expect(container.textContent).toContain('費用與支出（可列舉）')
    clickByTestId('add-situation-checkbox-rent')
    clickByTestId('add-situation-checkbox-donations')
    clickByTestId('confirm-add-situations-btn')
    expect(scrollIntoViewSpy).toHaveBeenCalledWith({ block: 'center', inline: 'nearest', behavior: 'smooth' })
    expect(lastScrollTargetTestId).toBe('checklist-item-donations-deduction')
    expect(container.textContent).toContain('房屋租金扣除額（需進一步確認）')
    expect(container.textContent).toContain('捐贈扣除額')

    clickByTestId('remove-item-standard-deduction-single')
    expect(container.textContent).toContain('確認移除此項目')
    expect(container.textContent).not.toContain('會取消第一頁情境')
    clickByTestId('confirm-remove-item-btn')
    expect(container.textContent).not.toContain('標準扣除額（單身）')
    expect(container.textContent).not.toContain('來源情境：')
    expect(localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY)).toContain('rent')
    expect(localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY)).toContain('donations')
  })

  it('shows situation labels with prefix when an item is triggered by selected situations', () => {
    renderApp()
    clickButtonByText('有薪資收入')
    clickButtonByText('扶養親屬')
    clickButtonByText('產生節稅清單')

    const multiSource = container.querySelector<HTMLElement>('[data-testid="card-source-situations-exemption-general"]')
    expect(multiSource?.textContent).toContain('情境：有薪資收入、有扶養親屬')
    expect(multiSource?.textContent).not.toContain('來源')

    const singleSource = container.querySelector<HTMLElement>('[data-testid="card-source-situations-salary-special-deduction"]')
    expect(singleSource?.textContent).toContain('情境：有薪資收入')
  })

  it('hides situation labels for standalone one-to-one situations', () => {
    renderApp()
    clickButtonByText('配偶合併申報')
    clickButtonByText('產生節稅清單')

    const marriedSource = container.querySelector<HTMLElement>('[data-testid="card-source-situations-standard-deduction-married"]')
    expect(marriedSource).toBeNull()
  })

  it('cancel add in modal does not apply selection', () => {
    renderApp()
    clickButtonByText('有薪資收入')
    clickButtonByText('產生節稅清單')

    clickByTestId('open-add-situation-modal-btn')
    clickByTestId('add-situation-checkbox-rent')
    clickByTestId('cancel-add-situations-btn')

    expect(scrollIntoViewSpy).not.toHaveBeenCalled()
    expect(container.textContent).not.toContain('房屋租金扣除額（需進一步確認）')
  })

  it('shows confirmation when removing a card with existing status', () => {
    renderApp()
    clickButtonByText('租屋居住')
    clickButtonByText('產生節稅清單')
    clickByTestId('card-status-confirmed-rent-deduction')

    clickByTestId('remove-item-rent-deduction')
    expect(container.textContent).toContain('確認移除此項目')
    clickByTestId('confirm-remove-item-btn')
    expect(scrollToSpy).toHaveBeenCalledTimes(2)
    expect(container.textContent).toContain('台灣所得稅節稅助理')
    expect(localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY)).toBeNull()
  })

  it('clears legacy overrides key on startup', () => {
    localStorage.setItem(LEGACY_MANUAL_OVERRIDES_STORAGE_KEY, '{"foo":"bar"}')
    renderApp()
    expect(localStorage.getItem(LEGACY_MANUAL_OVERRIDES_STORAGE_KEY)).toBeNull()
  })
})
