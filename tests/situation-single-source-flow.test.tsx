import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { CHECKLIST_INPUT_STORAGE_KEY } from '../src/lib/checklistInputStorage'
import { CHECKLIST_VIEW_STATE_STORAGE_KEY } from '../src/lib/checklistViewStateStorage'
import { SITUATION_SELECTION_STORAGE_KEY } from '../src/lib/situationSelectionStorage'

const LEGACY_MANUAL_OVERRIDES_STORAGE_KEY = 'tax.checklist.manualOverrides.v1'

let container: HTMLDivElement
let scrollToSpy: ReturnType<typeof vi.fn>
let scrollYValue = 0
let rafCallbacks: Array<FrameRequestCallback | undefined>
let requestAnimationFrameSpy: ReturnType<typeof vi.fn>

const DONATION_TARGET_TOP = 900
const DONATION_TARGET_HEIGHT = 120
const STANDARD_DEDUCTION_MARRIED_TARGET_TOP = 1220
const STANDARD_DEDUCTION_MARRIED_TARGET_HEIGHT = 420
const GROSS_SECTION_TARGET_TOP = 540
const GROSS_SECTION_TARGET_HEIGHT = 360
const EXEMPTIONS_SECTION_TARGET_TOP = 980
const EXEMPTIONS_SECTION_TARGET_HEIGHT = 320
const VIEWPORT_HEIGHT = 800
const SITE_HEADER_HEIGHT = 56
const CONTENT_TOP_GAP = 12
const SECTION_HEADER_BUFFER_PX = 10
const STICKY_HEADING_HEIGHT = 48
const SECTION_SCROLL_OFFSET =
  SITE_HEADER_HEIGHT + STICKY_HEADING_HEIGHT + CONTENT_TOP_GAP + SECTION_HEADER_BUFFER_PX

function runNextAnimationFrame(timestamp: number) {
  const callback = rafCallbacks.find((cb) => cb !== undefined)
  const callbackIndex = rafCallbacks.findIndex((cb) => cb !== undefined)
  if (!callback || callbackIndex < 0) return
  rafCallbacks[callbackIndex] = undefined
  callback(timestamp)
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  localStorage.clear()
  scrollYValue = 0
  Object.defineProperty(window, 'scrollY', {
    get: () => scrollYValue,
    configurable: true,
  })

  scrollToSpy = vi.fn((x: number, y: number) => {
    void x
    scrollYValue = y
  })
  Object.defineProperty(window, 'scrollTo', { value: scrollToSpy, configurable: true })

  rafCallbacks = []
  requestAnimationFrameSpy = vi.fn((cb: FrameRequestCallback) => {
    rafCallbacks.push(cb)
    return rafCallbacks.length
  })
  Object.defineProperty(window, 'requestAnimationFrame', {
    value: requestAnimationFrameSpy,
    configurable: true,
  })
  Object.defineProperty(window, 'cancelAnimationFrame', {
    value: vi.fn((id: number) => {
      if (id > 0 && id <= rafCallbacks.length) rafCallbacks[id - 1] = undefined
    }),
    configurable: true,
  })
  Object.defineProperty(window, 'matchMedia', {
    value: vi.fn((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
    configurable: true,
  })
  Object.defineProperty(window, 'innerHeight', {
    value: VIEWPORT_HEIGHT,
    configurable: true,
  })
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    value: function (this: HTMLElement) {
      const testId = this.getAttribute('data-testid')
      if (testId === 'checklist-item-donations-deduction') {
        return {
          x: 0,
          y: DONATION_TARGET_TOP,
          top: DONATION_TARGET_TOP,
          left: 0,
          bottom: DONATION_TARGET_TOP + DONATION_TARGET_HEIGHT,
          right: 640,
          width: 640,
          height: DONATION_TARGET_HEIGHT,
          toJSON: () => '',
        }
      }
      if (testId === 'checklist-section-gross_income') {
        return {
          x: 0,
          y: GROSS_SECTION_TARGET_TOP,
          top: GROSS_SECTION_TARGET_TOP,
          left: 0,
          bottom: GROSS_SECTION_TARGET_TOP + GROSS_SECTION_TARGET_HEIGHT,
          right: 640,
          width: 640,
          height: GROSS_SECTION_TARGET_HEIGHT,
          toJSON: () => '',
        }
      }
      if (testId === 'checklist-item-standard-deduction-married') {
        return {
          x: 0,
          y: STANDARD_DEDUCTION_MARRIED_TARGET_TOP,
          top: STANDARD_DEDUCTION_MARRIED_TARGET_TOP,
          left: 0,
          bottom: STANDARD_DEDUCTION_MARRIED_TARGET_TOP + STANDARD_DEDUCTION_MARRIED_TARGET_HEIGHT,
          right: 640,
          width: 640,
          height: STANDARD_DEDUCTION_MARRIED_TARGET_HEIGHT,
          toJSON: () => '',
        }
      }
      if (testId === 'checklist-section-exemptions') {
        return {
          x: 0,
          y: EXEMPTIONS_SECTION_TARGET_TOP,
          top: EXEMPTIONS_SECTION_TARGET_TOP,
          left: 0,
          bottom: EXEMPTIONS_SECTION_TARGET_TOP + EXEMPTIONS_SECTION_TARGET_HEIGHT,
          right: 640,
          width: 640,
          height: EXEMPTIONS_SECTION_TARGET_HEIGHT,
          toJSON: () => '',
        }
      }
      const className = typeof this.className === 'string' ? this.className : ''
      if (className.includes('sticky top-14')) {
        return {
          x: 0,
          y: 0,
          top: 0,
          left: 0,
          bottom: STICKY_HEADING_HEIGHT,
          right: 640,
          width: 640,
          height: STICKY_HEADING_HEIGHT,
          toJSON: () => '',
        }
      }
      return {
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        width: 0,
        height: 0,
        toJSON: () => '',
      }
    },
    configurable: true,
  })
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  localStorage.clear()
  document.body.removeChild(container)
})

function renderApp({ autoStart = true }: { autoStart?: boolean } = {}) {
  const root = createRoot(container)
  act(() => {
    root.render(createElement(App))
  })
  if (autoStart) {
    const introButton = Array.from(container.querySelectorAll('button')).find(
      (el) => el.textContent?.trim() === '開始試算',
    )
    if (introButton) {
      act(() => {
        introButton.click()
      })
    }
  }
  return root
}

function clickButtonByText(text: string) {
  const clickable = Array.from(container.querySelectorAll<HTMLElement>('button, a')).find((el) =>
    el.textContent?.includes(text),
  )
  if (!clickable) throw new Error(`Missing clickable element with text "${text}"`)
  act(() => {
    clickable.click()
  })
}

function clickByTestId(testId: string) {
  const element = container.querySelector<HTMLElement>(`[data-testid="${testId}"]`)
  if (!element) throw new Error(`Missing element with data-testid "${testId}"`)
  act(() => {
    element.click()
  })
}

function clickSummarySectionLink(sectionId: string) {
  const sidebar = container.querySelector<HTMLElement>('aside.no-print')
  const row = sidebar?.querySelector<HTMLElement>(`[data-testid="summary-row-${sectionId}"]`)
  const link = row?.querySelector<HTMLAnchorElement>('a')
  if (!link) throw new Error(`Missing summary section link for "${sectionId}"`)
  act(() => {
    link.click()
  })
}

function clickSummaryGoFill(sectionId: string) {
  const sidebar = container.querySelector<HTMLElement>('aside.no-print')
  const row = sidebar?.querySelector<HTMLElement>(`[data-testid="summary-row-${sectionId}"]`)
  const button = row?.querySelector<HTMLButtonElement>('button')
  if (!button) throw new Error(`Missing 前往填寫 button for "${sectionId}"`)
  act(() => {
    button.click()
  })
}

function changeInputByTestId(testId: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`)
  if (!input) throw new Error(`Missing input with data-testid "${testId}"`)
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    valueSetter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function getGrossIncomeHeadingText() {
  const section = container.querySelector<HTMLElement>('[data-testid="checklist-section-gross_income"]')
  const heading = section?.querySelector('h2')
  return heading?.textContent ?? ''
}

function getLatestScenarioDialog() {
  const dialogs = Array.from(
    document.body.querySelectorAll<HTMLElement>('[data-testid="tax-scenario-combinations-dialog"]'),
  )
  return dialogs.at(-1) ?? null
}

describe('situation single-source flow', () => {
  it('goes to selecting from intro start button when a selection exists but checklist is not generated', () => {
    renderApp({ autoStart: false })
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', {
        key: SITUATION_SELECTION_STORAGE_KEY,
        newValue: JSON.stringify({ selected: ['rent'] }),
      }))
    })
    clickButtonByText('開始試算')

    expect(container.textContent).toContain('選擇符合 114 年度的報稅項目')
  })

  it('goes to selecting from intro start button when no selection exists', () => {
    renderApp({ autoStart: false })
    clickButtonByText('開始試算')

    expect(container.textContent).toContain('選擇符合 114 年度的報稅項目')
  })

  it('goes to selecting from header nav when a saved selection exists but checklist is not generated', () => {
    localStorage.setItem(
      SITUATION_SELECTION_STORAGE_KEY,
      JSON.stringify({ selected: ['rent'] }),
    )

    renderApp({ autoStart: false })
    clickButtonByText('節稅試算')

    expect(container.textContent).toContain('選擇符合 114 年度的報稅項目')
  })

  it('goes to selecting from header nav when no selection exists', () => {
    renderApp({ autoStart: false })
    clickButtonByText('節稅試算')

    expect(container.textContent).toContain('選擇符合 114 年度的報稅項目')
  })

  it('goes to results from intro start button after checklist has been generated', () => {
    renderApp({ autoStart: false })
    clickButtonByText('開始試算')
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')
    clickButtonByText('台灣節稅資訊平台')
    clickButtonByText('開始試算')

    expect(container.textContent).toContain('節稅試算清單')
  })

  it('goes to results from header nav after checklist has been generated and user returns to intro', () => {
    renderApp({ autoStart: false })
    clickButtonByText('開始試算')
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')
    clickButtonByText('台灣節稅資訊平台')
    clickButtonByText('節稅試算')

    expect(container.textContent).toContain('節稅試算清單')
  })

  it('goes to results from header nav after refresh on intro when checklist has been generated', () => {
    const root = renderApp({ autoStart: false })
    clickButtonByText('開始試算')
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')
    clickButtonByText('台灣節稅資訊平台')
    expect(container.textContent).toContain('開始試算')

    act(() => {
      root.unmount()
    })

    renderApp({ autoStart: false })
    clickButtonByText('節稅試算')

    expect(container.textContent).toContain('節稅試算清單')
  })

  it('scrolls to top when navigating via header nav button', () => {
    renderApp({ autoStart: false })
    act(() => {
      window.scrollTo(0, 420)
    })

    clickButtonByText('節稅試算')
    expect(scrollToSpy).toHaveBeenLastCalledWith(0, 0)
  })

  it('scrolls to gross income section with dynamic offset when clicking summary section link', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')

    clickSummarySectionLink('gross_income')
    act(() => {
      runNextAnimationFrame(0)
      runNextAnimationFrame(500)
      runNextAnimationFrame(1000)
    })

    expect(scrollToSpy).toHaveBeenLastCalledWith(0, GROSS_SECTION_TARGET_TOP - SECTION_SCROLL_OFFSET)
  })

  it('scrolls to section header with same dynamic offset when clicking 前往填寫', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')

    clickSummaryGoFill('gross_income')
    act(() => {
      runNextAnimationFrame(0)
      runNextAnimationFrame(500)
      runNextAnimationFrame(1000)
    })

    expect(scrollToSpy).toHaveBeenLastCalledWith(0, GROSS_SECTION_TARGET_TOP - SECTION_SCROLL_OFFSET)
  })

  it('supports grouped situation add modal and removes only the target card', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')

    expect(container.textContent).toContain('節稅試算清單')
    expect(scrollToSpy).toHaveBeenCalledWith(0, 0)
    expect(container.textContent).not.toContain('帶入說明')
    expect(container.textContent).not.toContain('一個情境可能對應多個檢核項目')
    expect(container.textContent).not.toContain('來源情境：')

    clickByTestId('open-add-situation-modal-btn')
    expect(container.textContent).toContain('申報方式')
    expect(container.textContent).toContain('一般扣除額')
    expect(container.textContent).toContain('特別扣除額')
    clickByTestId('add-situation-checkbox-rent')
    clickByTestId('add-situation-checkbox-donations')
    clickByTestId('confirm-add-situations-btn')
    act(() => {
      runNextAnimationFrame(0)
      runNextAnimationFrame(500)
      runNextAnimationFrame(1000)
    })
    expect(container.textContent).toContain('房屋租金支出')
    expect(container.textContent).toContain('捐贈扣除額')

    clickByTestId('remove-item-rent-deduction')
    expect(container.textContent).not.toContain('已填寫的資料將一併清除')
    expect(container.textContent).not.toContain('房屋租金支出')
    expect(container.textContent).toContain('薪資收入')
    expect(container.textContent).toContain('免稅額')
    expect(container.textContent).toContain('標準扣除額（單身）')
    const savedSelectionAfterRemove = localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY) ?? ''
    expect(savedSelectionAfterRemove).not.toContain('rent')
    expect(localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY)).toContain('donations')
  })

  it('scrolls newly added card to top with dynamic safe offset', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')

    clickByTestId('open-add-situation-modal-btn')
    clickByTestId('add-situation-checkbox-donations')
    clickByTestId('confirm-add-situations-btn')
    act(() => {
      runNextAnimationFrame(0)
      runNextAnimationFrame(500)
      runNextAnimationFrame(1000)
    })

    expect(scrollToSpy).toHaveBeenLastCalledWith(0, DONATION_TARGET_TOP - SECTION_SCROLL_OFFSET)
  })
  it('opens and closes tax formula dialog with shared modal overlay classes', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')

    clickButtonByText('了解更多')

    const overlay = document.querySelector<HTMLElement>('[data-testid="tax-formula-dialog-overlay"]')
    expect(overlay).not.toBeNull()
    expect(overlay?.classList.contains('fixed')).toBe(true)
    expect(overlay?.classList.contains('inset-0')).toBe(true)
    expect(overlay?.classList.contains('bg-gray-900/40')).toBe(true)
    expect(overlay?.classList.contains('no-print')).toBe(true)

    const dialog = document.querySelector<HTMLElement>('[data-testid="tax-formula-dialog"]')
    expect(dialog).not.toBeNull()

    const closeButton = dialog?.querySelector<HTMLButtonElement>('button[aria-label="關閉"]')
    expect(closeButton).not.toBeNull()
    act(() => {
      closeButton?.click()
    })

    expect(document.querySelector('[data-testid="tax-formula-dialog-overlay"]')).toBeNull()
    expect(document.querySelector('[data-testid="tax-formula-dialog"]')).toBeNull()
  })

  it('does not show remove button for non-removable cards', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')

    expect(container.querySelector('[data-testid="remove-item-exemption-general"]')).toBeNull()
    expect(container.querySelector('[data-testid="remove-item-standard-deduction-single"]')).toBeNull()
  })

  it('keeps non-removable standard deduction without a remove button in married mode too', () => {
    renderApp()
    clickButtonByText('配偶合併申報')
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')

    expect(container.querySelector('[data-testid="remove-item-standard-deduction-married"]')).toBeNull()
  })


  it('hides source situation labels even when items are triggered by income situations', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('股利收入')
    clickButtonByText('產生節稅清單')

    const multiSource = container.querySelector<HTMLElement>('[data-testid="card-source-situations-exemption-general"]')
    expect(multiSource).toBeNull()

    const singleSource = container.querySelector<HTMLElement>('[data-testid="card-source-situations-gross-income"]')
    expect(singleSource).toBeNull()
  })

  it('hides situation labels for standalone one-to-one situations', () => {
    renderApp()
    clickButtonByText('配偶合併申報')
    clickButtonByText('產生節稅清單')

    const marriedSource = container.querySelector<HTMLElement>('[data-testid="card-source-situations-standard-deduction-married"]')
    expect(marriedSource).toBeNull()
  })

  it('updates standard deduction card title and amount after adding married filing', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')
    expect(container.textContent).toContain('標準扣除額（單身）')
    expect(container.textContent).toContain('131,000')

    clickByTestId('open-add-situation-modal-btn')
    clickByTestId('add-situation-checkbox-married')
    clickByTestId('confirm-add-situations-btn')
    act(() => {
      runNextAnimationFrame(0)
      runNextAnimationFrame(500)
      runNextAnimationFrame(1000)
    })

    expect(container.textContent).toContain('標準扣除額（配偶合併申報）')
    expect(container.textContent).toContain('262,000')
    expect(container.textContent).not.toContain('標準扣除額（單身）')
    expect(scrollToSpy).toHaveBeenLastCalledWith(
      0,
      STANDARD_DEDUCTION_MARRIED_TARGET_TOP - SECTION_SCROLL_OFFSET,
    )
  })

  it('cancel add in modal does not apply selection', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')

    clickByTestId('open-add-situation-modal-btn')
    clickByTestId('add-situation-checkbox-rent')
    clickByTestId('cancel-add-situations-btn')

    expect(requestAnimationFrameSpy).not.toHaveBeenCalled()
    expect(container.textContent).not.toContain('房屋租金支出')
  })

  it('shows baseline exemption and standard deduction for rent-only results', () => {
    renderApp()
    clickButtonByText('房屋租金支出')
    clickButtonByText('產生節稅清單')

    expect(container.textContent).toContain('免稅額')
    expect(container.textContent).toContain('標準扣除額（單身）')
    expect(container.textContent).toContain('房屋租金支出')
  })

  it('opens export menu below button with aligned rounded radius', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')
    clickButtonByText('匯出')

    const downloadButton = container.querySelector<HTMLElement>('[data-testid="download-checklist-btn"]')
    const printButton = container.querySelector<HTMLElement>('[data-testid="print-checklist-btn"]')
    expect(downloadButton).not.toBeNull()
    expect(printButton).not.toBeNull()

    const menuPanel = downloadButton?.parentElement
    expect(menuPanel?.className).toContain('top-full')
    expect(menuPanel?.className).toContain('mt-2')
    expect(menuPanel?.className).toContain('rounded-xl')
  })

  it('omits selected situations in add modal and shows them again after removing their card', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('捐贈')
    clickButtonByText('產生節稅清單')

    clickByTestId('open-add-situation-modal-btn')
    expect(container.querySelector('[data-testid="add-situation-checkbox-salary_income"]')).toBeNull()
    expect(container.querySelector('[data-testid="add-situation-checkbox-rent"]')).not.toBeNull()
    clickByTestId('cancel-add-situations-btn')

    clickByTestId('remove-item-gross-income')
    expect(container.querySelector('[data-testid="checklist-item-gross-income"]')).toBeNull()

    clickByTestId('open-add-situation-modal-btn')
    expect(container.querySelector('[data-testid="add-situation-checkbox-salary_income"]')).not.toBeNull()
    clickByTestId('cancel-add-situations-btn')
  })

  it('shows confirmation when removing a card with existing input', () => {
    renderApp()
    clickButtonByText('房屋租金支出')
    clickButtonByText('產生節稅清單')
    changeInputByTestId('card-input-rent-deduction-rent_amount', '120000')

    clickByTestId('remove-item-rent-deduction')
    expect(container.textContent).toContain('移除 房屋租金支出')
    expect(container.textContent).toContain('已填寫的資料將一併清除。')
    clickByTestId('confirm-remove-item-btn')
    expect(container.textContent).toContain('選擇符合 114 年度的報稅項目')
    expect(container.querySelector('[data-testid="checklist-item-rent-deduction"]')).toBeNull()
    const savedSelectionAfterConfirmRemove = localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY) ?? ''
    expect(savedSelectionAfterConfirmRemove).not.toContain('rent')
    const savedInputs = localStorage.getItem(CHECKLIST_INPUT_STORAGE_KEY) ?? ''
    expect(savedInputs).not.toContain('rent-deduction')
  })

  it('can re-add a removed card from add modal', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('捐贈')
    clickButtonByText('產生節稅清單')

    expect(container.querySelector('[data-testid="checklist-item-gross-income"]')).not.toBeNull()
    clickByTestId('remove-item-gross-income')
    expect(container.querySelector('[data-testid="checklist-item-gross-income"]')).toBeNull()

    clickByTestId('open-add-situation-modal-btn')
    clickByTestId('add-situation-checkbox-salary_income')
    clickByTestId('confirm-add-situations-btn')

    expect(container.querySelector('[data-testid="checklist-item-gross-income"]')).not.toBeNull()
  })

  it('does not restore removed gross income after refresh', () => {
    const root = renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('捐贈')
    clickButtonByText('產生節稅清單')

    clickByTestId('remove-item-gross-income')
    expect(container.querySelector('[data-testid="checklist-item-gross-income"]')).toBeNull()
    expect(localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY)).not.toContain('salary_income')

    act(() => {
      root.unmount()
    })

    renderApp()
    expect(container.querySelector('[data-testid="checklist-item-gross-income"]')).toBeNull()
    expect(container.textContent).toContain('捐贈扣除額')
  })

  it('clears legacy overrides key on startup', () => {
    localStorage.setItem(LEGACY_MANUAL_OVERRIDES_STORAGE_KEY, '{"foo":"bar"}')
    renderApp()
    expect(localStorage.getItem(LEGACY_MANUAL_OVERRIDES_STORAGE_KEY)).toBeNull()
  })

  it('persists checklist input values and restores after reload', () => {
    const root = renderApp()
    clickButtonByText('房屋租金支出')
    clickButtonByText('產生節稅清單')
    changeInputByTestId('card-input-rent-deduction-rent_amount', '120000')

    const savedRaw = localStorage.getItem(CHECKLIST_INPUT_STORAGE_KEY)
    expect(savedRaw).toContain('rent-deduction')
    expect(savedRaw).toContain('120000')

    act(() => {
      root.unmount()
    })

    renderApp()
    const restoredInput = container.querySelector<HTMLInputElement>('[data-testid="card-input-rent-deduction-rent_amount"]')
    expect(restoredInput?.value).toBe('120000')
  })

  it('resets checklist data after confirming recalculate', () => {
    renderApp()
    clickButtonByText('房屋租金支出')
    clickButtonByText('產生節稅清單')
    changeInputByTestId('card-input-rent-deduction-rent_amount', '120000')

    clickByTestId('reset-checklist-btn')
    clickByTestId('confirm-reset-btn')

    expect(localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(CHECKLIST_INPUT_STORAGE_KEY)).toBeNull()
    expect(container.textContent).toContain('選擇符合 114 年度的報稅項目')
  })

  it('does not reset checklist data when recalculate confirm is cancelled', () => {
    renderApp()
    clickButtonByText('房屋租金支出')
    clickButtonByText('產生節稅清單')
    changeInputByTestId('card-input-rent-deduction-rent_amount', '120000')

    clickByTestId('reset-checklist-btn')
    clickButtonByText('取消')

    expect(localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY)).toContain('rent')
    expect(localStorage.getItem(CHECKLIST_INPUT_STORAGE_KEY)).toContain('120000')
    expect(container.textContent).toContain('節稅試算清單')
  })

  it('keeps results page after refresh when user already generated checklist', () => {
    const root = renderApp()
    clickButtonByText('房屋租金支出')
    clickButtonByText('產生節稅清單')

    expect(container.textContent).toContain('節稅試算清單')
    expect(localStorage.getItem(CHECKLIST_VIEW_STATE_STORAGE_KEY)).toContain('results')

    act(() => {
      root.unmount()
    })

    renderApp()
    expect(container.textContent).toContain('節稅試算清單')
  })

  it('returns to selecting page after refresh when a selection exists but checklist was not generated', () => {
    const root = renderApp()
    clickButtonByText('房屋租金支出')
    expect(container.textContent).toContain('產生節稅清單')
    expect(localStorage.getItem(CHECKLIST_VIEW_STATE_STORAGE_KEY)).toContain('selecting')

    act(() => {
      root.unmount()
    })

    renderApp()
    expect(container.textContent).toContain('選擇符合 114 年度的報稅項目')
  })

  it('keeps intro page after refresh when no selection exists', () => {
    const root = renderApp({ autoStart: false })
    expect(container.textContent).toContain('開始試算')

    act(() => {
      root.unmount()
    })

    renderApp({ autoStart: false })
    expect(container.textContent).toContain('開始試算')
  })

  it('keeps selecting page after refresh when selecting page has no selection', () => {
    const root = renderApp({ autoStart: false })
    clickButtonByText('節稅試算')
    expect(container.textContent).toContain('選擇符合 114 年度的報稅項目')
    expect(localStorage.getItem(CHECKLIST_VIEW_STATE_STORAGE_KEY)).toContain('selecting')

    act(() => {
      root.unmount()
    })

    renderApp({ autoStart: false })
    expect(container.textContent).toContain('選擇符合 114 年度的報稅項目')
  })

  it('allows spouse salary income to remain 0', () => {
    renderApp()
    clickButtonByText('配偶合併申報')
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')

    changeInputByTestId('income-input-gross-income-self', '300000')
    changeInputByTestId('income-input-gross-income-spouse', '0')

    const spouseInput = container.querySelector<HTMLInputElement>('[data-testid="income-input-gross-income-spouse"]')
    expect(spouseInput?.value).toBe('0')
    expect(container.textContent).not.toContain('（1 項未填）')

    changeInputByTestId('income-input-gross-income-spouse', '')
    expect(spouseInput?.value).toBe('')
    expect(container.querySelector('[data-testid="income-total-gross-income"]')?.textContent).toContain('未填寫')
  })

  it('shows a single gross income total when the dividend card total is 0', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('股利收入')
    clickButtonByText('產生節稅清單')

    changeInputByTestId('income-input-gross-income-self', '300000')
    changeInputByTestId('income-input-dividend-income-self', '0')

    expect(getGrossIncomeHeadingText()).toContain('82,000 元')
    expect(container.querySelector('[data-testid="summary-row-gross_income"]')?.textContent).toContain('82,000 元')
    expect(container.querySelector('[data-testid="gross-income-dividend-scenarios"]')).toBeNull()
  })

  it('shows filing mode without recommendation prefix when there is only one tax scenario', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')

    changeInputByTestId('income-input-gross-income-self', '300000')
    clickByTestId('card-choice-exemption-general-self_age_band-under_70')

    expect(container.textContent).toContain('單身申報')
    expect(container.textContent).not.toContain('推薦：單身申報')
  })

  it('calculates summary scenarios when completed income cards include positive dividends', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('股利收入')
    clickButtonByText('產生節稅清單')

    changeInputByTestId('income-input-gross-income-self', '300000')
    changeInputByTestId('income-input-dividend-income-self', '100000')
    clickByTestId('card-choice-exemption-general-self_age_band-under_70')

    expect(getGrossIncomeHeadingText()).toContain('182,000 元')
    expect(container.querySelector('[data-testid="summary-row-gross_income"]')?.textContent).toContain('182,000 元')
    expect(container.querySelector('[data-testid="gross-income-dividend-scenarios"]')).not.toBeNull()
    expect(container.textContent).toContain('合併計稅')
    expect(container.textContent).toContain('股利合併計稅')
    expect(container.textContent).toContain('推薦：')

    clickButtonByText('查看詳情')
    const dialog = getLatestScenarioDialog()
    expect(dialog?.textContent).toContain('股利合併計稅')
    expect(dialog?.textContent).toContain('股利分開計稅')
    expect(dialog?.textContent).not.toContain('股利合併計稅並扣抵')
    expect(dialog?.textContent).not.toContain('股利 28% 分開計稅')
  })

  it('hides AMT wording in summary scenario details until overseas income is positive', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('股利收入')
    clickButtonByText('產生節稅清單')

    changeInputByTestId('income-input-gross-income-self', '300000')
    changeInputByTestId('income-input-dividend-income-self', '100000')
    clickByTestId('card-choice-exemption-general-self_age_band-under_70')
    clickButtonByText('查看詳情')

    const dialog = getLatestScenarioDialog()
    expect(dialog?.textContent).not.toContain('AMT')
  })

  it('shows AMT wording in summary scenario details when overseas income is positive', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('海外所得')
    clickButtonByText('產生節稅清單')

    changeInputByTestId('income-input-gross-income-self', '300000')
    changeInputByTestId('card-input-overseas-income-amt-overseas_income_amount', '500000')
    clickByTestId('card-choice-exemption-general-self_age_band-under_70')
    clickButtonByText('查看詳情')

    const dialog = getLatestScenarioDialog()
    expect(dialog?.textContent).toContain('AMT')
  })

  it('hides savings investment from selectors and derives it from interest income on the result page', () => {
    renderApp()

    expect(container.textContent).not.toContain('儲蓄投資')

    clickButtonByText('利息收入')
    expect(container.textContent).not.toContain('儲蓄投資')
    clickButtonByText('產生節稅清單')

    expect(container.textContent).toContain('利息收入')
    expect(container.textContent).toContain('儲蓄投資特別扣除額')
    expect(container.querySelector('[data-testid="remove-item-savings-investment-deduction"]')).toBeNull()
    clickByTestId('open-add-situation-modal-btn')
    expect(container.querySelector('[data-testid="add-situation-checkbox-savings_investment"]')).toBeNull()
    clickByTestId('cancel-add-situations-btn')

    changeInputByTestId('income-input-interest-income-self', '300000')
    expect(container.textContent).toContain('270,000 元')

    clickByTestId('remove-item-interest-income')
    clickByTestId('confirm-remove-item-btn')
    expect(container.textContent).not.toContain('利息收入小計')
    expect(container.textContent).not.toContain('儲蓄投資特別扣除額')
  })
})
