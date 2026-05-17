import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IntroPage } from '../src/components/IntroPage'
import {
  HOME_HERO_IMAGE_HEIGHT,
  HOME_HERO_IMAGE_SRC,
  HOME_HERO_IMAGE_WIDTH,
  resetHomeHeroImageWarmupForTest,
  warmHomeHeroImage,
} from '../src/lib/homeHeroImage'
import { links } from '../src/pages/HomePage'

describe('home hero image loading', () => {
  afterEach(() => {
    resetHomeHeroImageWarmupForTest()
    vi.unstubAllGlobals()
  })

  it('renders the first-viewport hero image with eager priority and stable dimensions', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    act(() => {
      root.render(createElement(IntroPage, { onStart: vi.fn() }))
    })

    const heroImage = container.querySelector<HTMLImageElement>('img[alt="報稅流程示意圖"]')
    expect(heroImage?.getAttribute('src')).toBe(HOME_HERO_IMAGE_SRC)
    expect(heroImage?.getAttribute('loading')).toBe('eager')
    expect(heroImage?.getAttribute('fetchpriority')).toBe('high')
    expect(heroImage?.getAttribute('decoding')).toBe('async')
    expect(heroImage?.getAttribute('width')).toBe(String(HOME_HERO_IMAGE_WIDTH))
    expect(heroImage?.getAttribute('height')).toBe(String(HOME_HERO_IMAGE_HEIGHT))

    act(() => {
      root.unmount()
    })
    document.body.removeChild(container)
  })

  it('preloads the home hero image from the home route', () => {
    expect(links()).toContainEqual({
      rel: 'preload',
      as: 'image',
      href: HOME_HERO_IMAGE_SRC,
      fetchPriority: 'high',
    })
  })

  it('warms the home hero image once and keeps the image reference alive', async () => {
    const createdImages: MockImage[] = []

    class MockImage {
      loading = ''
      decoding = ''
      fetchPriority = ''
      src = ''
      decode = vi.fn(() => Promise.resolve())

      constructor() {
        createdImages.push(this)
      }
    }

    vi.stubGlobal('Image', MockImage)

    const firstWarmup = warmHomeHeroImage()
    const secondWarmup = warmHomeHeroImage()

    expect(createdImages).toHaveLength(1)
    expect(createdImages[0].loading).toBe('eager')
    expect(createdImages[0].decoding).toBe('async')
    expect(createdImages[0].fetchPriority).toBe('high')
    expect(createdImages[0].src).toBe(HOME_HERO_IMAGE_SRC)
    expect(createdImages[0].decode).toHaveBeenCalledTimes(1)
    expect(secondWarmup).toBe(firstWarmup)

    await firstWarmup
  })
})
