import { describe, expect, it } from 'vitest'
import { createPublicAssetUrl } from '../src/lib/publicAsset'

describe('createPublicAssetUrl', () => {
  it('keeps root deployments rooted at /', () => {
    expect(createPublicAssetUrl('introduction-image/Step1.png', '/')).toBe('/introduction-image/Step1.png')
    expect(createPublicAssetUrl('/introduction-image/Step1.png', '/')).toBe('/introduction-image/Step1.png')
  })

  it('prefixes GitHub Pages preview base paths', () => {
    expect(createPublicAssetUrl('introduction-image/Step1.png', '/TaiwanTaxCalculator/dev/')).toBe(
      '/TaiwanTaxCalculator/dev/introduction-image/Step1.png',
    )
    expect(createPublicAssetUrl('/introduction-image/Step1.png', '/TaiwanTaxCalculator/pr-preview/pr-13/')).toBe(
      '/TaiwanTaxCalculator/pr-preview/pr-13/introduction-image/Step1.png',
    )
  })
})
