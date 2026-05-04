import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../src/App'
import { SITUATION_SELECTION_STORAGE_KEY } from '../src/lib/situationSelectionStorage'

const LEGACY_MANUAL_OVERRIDES_STORAGE_KEY = 'tax.checklist.manualOverrides.v1'

let container: HTMLDivElement
let scrollToSpy: ReturnType<typeof vi.fn>
let scrollYValue = 0
let rafCallbacks: Array<FrameRequestCallback | undefined>
let requestAnimationFrameSpy: ReturnType<typeof vi.fn>

const DONATION_TARGET_TOP = 900
const DONATION_TARGET_HEIGHT = 120
const VIEWPORT_HEIGHT = 800

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

function changeInputByTestId(testId: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`[data-testid="${testId}"]`)
  if (!input) throw new Error(`Missing input with data-testid "${testId}"`)
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  act(() => {
    valueSetter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('situation single-source flow', () => {
  it('supports grouped situation add modal and synchronized removal', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')

    expect(container.textContent).toContain('節稅清單')
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
    const expectedTargetY = DONATION_TARGET_TOP + DONATION_TARGET_HEIGHT / 2 - VIEWPORT_HEIGHT / 2
    expect(requestAnimationFrameSpy).toHaveBeenCalled()
    expect(scrollToSpy).toHaveBeenLastCalledWith(0, expectedTargetY)
    expect(container.textContent).toContain('房屋租金支出')
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

  it('shows situation labels with prefix when the merged exemption item is triggered by multiple income sources', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('股利收入')
    clickButtonByText('產生節稅清單')

    const multiSource = container.querySelector<HTMLElement>('[data-testid="card-source-situations-exemption-general"]')
    expect(multiSource?.textContent).toContain('情境：薪資收入、股利收入')
    expect(multiSource?.textContent).not.toContain('來源')

    const singleSource = container.querySelector<HTMLElement>('[data-testid="card-source-situations-gross-income"]')
    expect(singleSource?.textContent).toContain('情境：薪資收入')
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
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')

    clickByTestId('open-add-situation-modal-btn')
    clickByTestId('add-situation-checkbox-rent')
    clickByTestId('cancel-add-situations-btn')

    expect(requestAnimationFrameSpy).not.toHaveBeenCalled()
    expect(container.textContent).not.toContain('房屋租金支出')
  })

  it('shows confirmation when removing a card with existing input', () => {
    renderApp()
    clickButtonByText('房屋租金支出')
    clickButtonByText('產生節稅清單')
    changeInputByTestId('card-input-rent-deduction-rent_amount', '120000')

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
