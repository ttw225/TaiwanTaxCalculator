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
  it('supports grouped situation add modal and removes only the target card', () => {
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
    expect(container.textContent).toContain('房屋租金支出')
    expect(container.textContent).toContain('捐贈扣除額')

    clickByTestId('remove-item-rent-deduction')
    expect(container.textContent).not.toContain('確認移除此項目')
    expect(container.textContent).not.toContain('房屋租金支出')
    expect(container.textContent).toContain('薪資收入')
    expect(container.textContent).toContain('免稅額')
    expect(container.textContent).toContain('標準扣除額（單身）')
    const savedSelectionAfterRemove = localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY) ?? ''
    expect(savedSelectionAfterRemove).not.toContain('rent')
    expect(localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY)).toContain('donations')
  })
  it('does not show remove button for non-removable cards', () => {
    renderApp()
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')

    expect(container.querySelector('[data-testid="remove-item-exemption-general"]')).toBeNull()
    expect(container.querySelector('[data-testid="remove-item-standard-deduction-single"]')).toBeNull()
  })

  it('keeps non-removable standard deduction hidden in married mode too', () => {
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

    expect(container.textContent).toContain('標準扣除額（配偶合併申報）')
    expect(container.textContent).toContain('262,000')
    expect(container.textContent).not.toContain('標準扣除額（單身）')
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

  it('hides fully-added situations in add modal and shows again after removal', () => {
    renderApp()
    clickButtonByText('房屋租金支出')
    clickButtonByText('產生節稅清單')

    clickByTestId('open-add-situation-modal-btn')
    expect(container.querySelector('[data-testid="add-situation-checkbox-rent"]')).toBeNull()
    expect(container.querySelector('[data-testid="add-situation-checkbox-donations"]')).not.toBeNull()
    clickByTestId('cancel-add-situations-btn')

    clickByTestId('remove-item-rent-deduction')
    expect(container.textContent).not.toContain('房屋租金支出')

    clickByTestId('open-add-situation-modal-btn')
    expect(container.querySelector('[data-testid="add-situation-checkbox-rent"]')).not.toBeNull()
    clickByTestId('cancel-add-situations-btn')
  })

  it('shows confirmation when removing a card with existing input', () => {
    renderApp()
    clickButtonByText('房屋租金支出')
    clickButtonByText('產生節稅清單')
    changeInputByTestId('card-input-rent-deduction-rent_amount', '120000')

    clickByTestId('remove-item-rent-deduction')
    expect(container.textContent).toContain('確認移除此項目：房屋租金支出')
    expect(container.textContent).toContain('將清除「房屋租金支出」已填寫的資料。')
    expect(container.textContent).toContain('您可以隨時加回此項目')
    clickByTestId('confirm-remove-item-btn')
    expect(container.textContent).toContain('節稅清單')
    expect(container.textContent).not.toContain('房屋租金支出')
    const savedSelectionAfterConfirmRemove = localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY) ?? ''
    expect(savedSelectionAfterConfirmRemove).not.toContain('rent')
    const savedInputs = localStorage.getItem(CHECKLIST_INPUT_STORAGE_KEY) ?? ''
    expect(savedInputs).not.toContain('rent-deduction')
  })

  it('can re-add a removed card from add modal', () => {
    renderApp()
    clickButtonByText('房屋租金支出')
    clickButtonByText('產生節稅清單')

    expect(container.textContent).toContain('房屋租金支出')
    clickByTestId('remove-item-rent-deduction')
    expect(container.textContent).not.toContain('房屋租金支出')

    clickByTestId('open-add-situation-modal-btn')
    clickByTestId('add-situation-checkbox-rent')
    clickByTestId('confirm-add-situations-btn')

    expect(container.textContent).toContain('房屋租金支出')
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
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderApp()
    clickButtonByText('房屋租金支出')
    clickButtonByText('產生節稅清單')
    changeInputByTestId('card-input-rent-deduction-rent_amount', '120000')

    clickByTestId('reset-checklist-btn')

    expect(confirmSpy).toHaveBeenCalled()
    expect(localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(CHECKLIST_INPUT_STORAGE_KEY)).toBeNull()
    expect(container.textContent).toContain('台灣所得稅節稅助理')

    confirmSpy.mockRestore()
  })

  it('does not reset checklist data when recalculate confirm is cancelled', () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderApp()
    clickButtonByText('房屋租金支出')
    clickButtonByText('產生節稅清單')
    changeInputByTestId('card-input-rent-deduction-rent_amount', '120000')

    clickByTestId('reset-checklist-btn')

    expect(confirmSpy).toHaveBeenCalled()
    expect(localStorage.getItem(SITUATION_SELECTION_STORAGE_KEY)).toContain('rent')
    expect(localStorage.getItem(CHECKLIST_INPUT_STORAGE_KEY)).toContain('120000')
    expect(container.textContent).toContain('節稅清單')

    confirmSpy.mockRestore()
  })

  it('keeps results page after refresh when user already generated checklist', () => {
    const root = renderApp()
    clickButtonByText('房屋租金支出')
    clickButtonByText('產生節稅清單')

    expect(container.textContent).toContain('節稅清單')
    expect(localStorage.getItem(CHECKLIST_VIEW_STATE_STORAGE_KEY)).toContain('results')

    act(() => {
      root.unmount()
    })

    renderApp()
    expect(container.textContent).toContain('節稅清單')
  })

  it('stays on selecting page after refresh when checklist was not generated', () => {
    const root = renderApp()
    clickButtonByText('房屋租金支出')
    expect(container.textContent).toContain('產生節稅清單')
    expect(localStorage.getItem(CHECKLIST_VIEW_STATE_STORAGE_KEY)).toBeNull()

    act(() => {
      root.unmount()
    })

    renderApp()
    expect(container.textContent).toContain('產生節稅清單')
  })

  it('allows spouse salary income to remain 0', () => {
    renderApp()
    clickButtonByText('配偶合併申報')
    clickButtonByText('薪資收入')
    clickButtonByText('產生節稅清單')

    changeInputByTestId('gross-income-input-self', '300000')
    changeInputByTestId('gross-income-input-spouse', '0')

    const spouseInput = container.querySelector<HTMLInputElement>('[data-testid="gross-income-input-spouse"]')
    expect(spouseInput?.value).toBe('0')
    expect(container.textContent).not.toContain('（1 項未填）')
  })
})
