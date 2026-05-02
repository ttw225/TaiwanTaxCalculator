import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BackToTopButton } from '../src/components/BackToTopButton'

let container: HTMLDivElement
let root: Root | null
let scrollYValue = 0
let scrollToSpy: ReturnType<typeof vi.fn>
let rafCallbacks: Array<FrameRequestCallback | undefined>
let requestAnimationFrameSpy: ReturnType<typeof vi.fn>

function setScrollY(next: number) {
  scrollYValue = next
}

function runNextAnimationFrame(timestamp: number) {
  const callback = rafCallbacks.find((cb) => cb !== undefined)
  const callbackIndex = rafCallbacks.findIndex((cb) => cb !== undefined)
  if (!callback || callbackIndex < 0) return
  rafCallbacks[callbackIndex] = undefined
  callback(timestamp)
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

  root = null
  container = document.createElement('div')
  document.body.appendChild(container)

  setScrollY(0)
  Object.defineProperty(window, 'scrollY', {
    get: () => scrollYValue,
    configurable: true,
  })

  scrollToSpy = vi.fn((x: number, y: number) => {
    void x
    setScrollY(y)
  })
  Object.defineProperty(window, 'scrollTo', {
    value: scrollToSpy,
    configurable: true,
  })

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
})

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount()
    })
    root = null
  }
  document.body.removeChild(container)
})

function renderButton() {
  const nextRoot = createRoot(container)
  root = nextRoot
  act(() => {
    nextRoot.render(createElement(BackToTopButton))
  })
  return nextRoot
}

describe('BackToTopButton', () => {
  it('is hidden when user is near top', () => {
    renderButton()
    const button = container.querySelector('[data-testid="back-to-top-btn"]')
    expect(button).toBeNull()
  })

  it('shows after scrolling beyond threshold', () => {
    renderButton()
    act(() => {
      setScrollY(241)
      window.dispatchEvent(new Event('scroll'))
    })
    const button = container.querySelector<HTMLElement>('[data-testid="back-to-top-btn"]')
    expect(button).not.toBeNull()
    expect(button?.getAttribute('aria-label')).toBe('回到頁面頂部')
    expect(button?.textContent?.trim()).toBe('')
  })

  it('animates back to top over custom duration', () => {
    setScrollY(600)
    renderButton()
    const button = container.querySelector<HTMLElement>('[data-testid="back-to-top-btn"]')
    if (!button) throw new Error('Missing back to top button')

    act(() => {
      button.click()
    })

    act(() => {
      runNextAnimationFrame(0)
      runNextAnimationFrame(500)
      runNextAnimationFrame(1000)
    })

    expect(requestAnimationFrameSpy).toHaveBeenCalled()
    expect(scrollToSpy).toHaveBeenCalled()
    expect(scrollToSpy).toHaveBeenLastCalledWith(0, 0)
  })

  it('jumps immediately to top for reduced-motion users', () => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
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

    setScrollY(500)
    renderButton()
    const button = container.querySelector<HTMLElement>('[data-testid="back-to-top-btn"]')
    if (!button) throw new Error('Missing back to top button')

    act(() => {
      button.click()
    })

    expect(requestAnimationFrameSpy).not.toHaveBeenCalled()
    expect(scrollToSpy).toHaveBeenLastCalledWith(0, 0)
  })
})
