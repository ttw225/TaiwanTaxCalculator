import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { CardPicker } from '../src/components/payment/CardPicker'

let container: HTMLDivElement
let root: Root | null

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  root = null
  container = document.createElement('div')
  document.body.appendChild(container)
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    value: () => {},
    writable: true,
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

function renderCardPicker() {
  const nextRoot = createRoot(container)
  root = nextRoot
  act(() => {
    nextRoot.render(
      createElement(CardPicker, {
        value: new Set<string>(),
        onChange: () => {},
      }),
    )
  })
}

function renderCardPickerWithState() {
  function TestHost() {
    const [value, setValue] = useState<Set<string>>(new Set())
    return createElement(CardPicker, { value, onChange: setValue })
  }

  const nextRoot = createRoot(container)
  root = nextRoot
  act(() => {
    nextRoot.render(createElement(TestHost))
  })
}

function getInput() {
  const input = container.querySelector<HTMLInputElement>('input')
  if (!input) throw new Error('Missing CardPicker input')
  return input
}

function typeInInput(value: string) {
  const input = getInput()
  const valueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set
  act(() => {
    valueSetter?.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function getHighlightedOptionId() {
  return container.querySelector<HTMLButtonElement>('[role="option"].bg-blue-50')?.id ?? null
}

function pressInputKey(key: string, options: { isComposing?: boolean; keyCode?: number } = {}) {
  const input = getInput()
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
  })
  if (options.isComposing) {
    Object.defineProperty(event, 'isComposing', { value: true })
  }
  if (options.keyCode != null) {
    Object.defineProperty(event, 'keyCode', { value: options.keyCode })
  }
  act(() => {
    input.dispatchEvent(event)
  })
}

function clickOptionByText(text: string) {
  const option = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="option"]')).find((el) =>
    el.textContent?.includes(text),
  )
  if (!option) throw new Error(`Missing option text "${text}"`)
  act(() => {
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
  })
}

describe('CardPicker', () => {
  it('matches DAWHO cards with lowercase english query', () => {
    renderCardPicker()
    typeInInput('dawho')

    expect(container.textContent).toContain('DAWHO 大戶')
  })

  it('matches 臺灣銀行 cards when typing 台灣銀行', () => {
    renderCardPicker()
    typeInInput('台灣銀行')

    expect(container.textContent).toContain('臺灣銀行')
  })

  it('matches bank aliases 台銀/土銀/合庫', () => {
    renderCardPicker()

    typeInInput('台銀')
    expect(container.textContent).toContain('臺灣銀行')

    typeInInput('土銀')
    expect(container.textContent).toContain('土地銀行')

    typeInInput('合庫')
    expect(container.textContent).toContain('合作金庫')
  })

  it('shows DAWHO options and selected chip with 大戶 wording', () => {
    renderCardPickerWithState()
    typeInInput('dawho')
    clickOptionByText('DAWHO 大戶')

    expect(container.textContent).toContain('DAWHO 大戶')
    const removeButton = container.querySelector('button[aria-label*="DAWHO 大戶"]')
    expect(removeButton).not.toBeNull()
  })

  it('shows at most 30 options and removes the narrowing hint text', () => {
    renderCardPicker()
    typeInInput('銀行')

    const options = container.querySelectorAll('[role="option"]')
    expect(options.length).toBe(30)
    expect(container.textContent).not.toContain('再輸入縮小範圍')
  })

  it('keeps highlighted menu option without blue ring classes', () => {
    renderCardPicker()
    typeInInput('銀行')

    const highlighted = container.querySelector<HTMLButtonElement>('[role="option"].bg-blue-50')
    expect(highlighted).not.toBeNull()
    expect(highlighted?.className).not.toContain('ring-2')
    expect(highlighted?.className).not.toContain('ring-inset')
    expect(highlighted?.className).not.toContain('ring-blue-300')
  })

  it('does not move highlighted option when IME composition is active', () => {
    renderCardPicker()
    typeInInput('銀行')

    const before = getHighlightedOptionId()
    expect(before).not.toBeNull()

    pressInputKey('ArrowDown', { isComposing: true })
    const afterComposing = getHighlightedOptionId()
    expect(afterComposing).toBe(before)

    pressInputKey('ArrowDown')
    const afterNormal = getHighlightedOptionId()
    expect(afterNormal).not.toBe(before)
  })

  it('does not move highlighted option when keyCode is 229', () => {
    renderCardPicker()
    typeInInput('銀行')

    const before = getHighlightedOptionId()
    expect(before).not.toBeNull()

    pressInputKey('ArrowDown', { keyCode: 229 })
    const after = getHighlightedOptionId()
    expect(after).toBe(before)
  })
})
