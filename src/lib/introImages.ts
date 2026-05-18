import { createPublicAssetUrl } from './publicAsset'

/**
 * Intrinsic dimensions of optimized introduction-image variants.
 * Source PNGs were 7680×4320 / 5760×9184 etc.; `scripts/optimize-intro-images.ts`
 * resizes each to ≤1920px on the longest edge and emits .avif / .webp / .png.
 *
 * Keeping the dimensions hard-coded here lets us set the `<img width/height>`
 * attributes (which prevent layout shift / CLS) without runtime fetching.
 *
 * Re-run `pnpm tsx scripts/optimize-intro-images.ts` if any source changes and
 * update this table.
 */
const INTRO_IMAGE_SIZE: Record<string, { width: number; height: number }> = {
  Step1: { width: 1920, height: 1080 },
  'Step2-1': { width: 1920, height: 1080 },
  'Step2-2': { width: 1920, height: 1080 },
  'Step3-1-income-mobile': { width: 1920, height: 1080 },
  'Step3-1-income-web': { width: 1920, height: 1080 },
  'Step3-2-count-web': { width: 1204, height: 1920 },
  'Step3-2-income-mobile': { width: 1920, height: 1080 },
  'Step3-3-special-mobile': { width: 1920, height: 1080 },
  'Step3-3-special-web': { width: 1440, height: 1920 },
  'Step3-4-summary-mobile': { width: 1920, height: 1080 },
  'Step3-4-summary-web': { width: 1920, height: 1080 },
  'Step3-5-result-mobile': { width: 1920, height: 1080 },
  'Step3-5-result-web': { width: 1920, height: 1080 },
}

export interface IntroImageSources {
  avif: string
  webp: string
  png: string
  width: number
  height: number
}

export function getIntroImage(basename: string): IntroImageSources {
  const size = INTRO_IMAGE_SIZE[basename]
  if (!size) {
    throw new Error(`Unknown intro image basename: ${basename}. Add it to INTRO_IMAGE_SIZE.`)
  }
  return {
    avif: createPublicAssetUrl(`introduction-image/${basename}.avif`),
    webp: createPublicAssetUrl(`introduction-image/${basename}.webp`),
    png: createPublicAssetUrl(`introduction-image/${basename}.png`),
    width: size.width,
    height: size.height,
  }
}
