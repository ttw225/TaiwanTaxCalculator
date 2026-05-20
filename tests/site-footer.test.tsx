import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SiteFooter } from '../src/components/SiteFooter'

let container: HTMLDivElement
let root: Root | null

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  root = null
  container = document.createElement('div')
  document.body.appendChild(container)
})

afterEach(() => {
  if (root) {
    act(() => { root?.unmount() })
    root = null
  }
  document.body.removeChild(container)
})

function renderFooter() {
  const nextRoot = createRoot(container)
  root = nextRoot
  act(() => { nextRoot.render(createElement(SiteFooter)) })
  return nextRoot
}

describe('SiteFooter', () => {
  it('renders the support email as a mailto link', () => {
    renderFooter()
    const link = container.querySelector<HTMLAnchorElement>('a[href="mailto:taiwantaxcalculator@gmail.com"]')
    expect(link).not.toBeNull()
    expect(link?.textContent?.trim()).toContain('taiwantaxcalculator@gmail.com')
  })

  it('renders the email link inside the 意見回報 section', () => {
    renderFooter()
    const headings = Array.from(container.querySelectorAll('h3'))
    const feedbackHeading = headings.find(h => h.textContent === '意見回報')
    expect(feedbackHeading).not.toBeNull()

    const section = feedbackHeading?.closest('.print-footer-section')
    const link = section?.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')
    expect(link).not.toBeNull()
    expect(link?.href).toBe('mailto:taiwantaxcalculator@gmail.com')
  })
})
