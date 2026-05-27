import { createPublicAssetUrl } from './publicAsset'

export const HOME_HERO_IMAGE_WEBP_SRC = createPublicAssetUrl('Hero.webp')
export const HOME_HERO_IMAGE_AVIF_SRC = createPublicAssetUrl('Hero.avif')
export const HOME_HERO_IMAGE_SRC = createPublicAssetUrl('Hero.png')
export const HOME_HERO_IMAGE_PRELOAD_SRC = HOME_HERO_IMAGE_WEBP_SRC
export const HOME_HERO_IMAGE_SIZES = '(min-width: 1024px) 1024px, calc(100vw - 2rem)'
export const HOME_HERO_IMAGE_WIDTH = 1920
export const HOME_HERO_IMAGE_HEIGHT = 1173

const HERO_VARIANT_WIDTHS = [640, 960, 1280, 1920] as const

function heroVariantSrc(format: 'avif' | 'webp' | 'png', width: typeof HERO_VARIANT_WIDTHS[number]) {
  const basename = width === 1920 ? 'Hero' : `Hero-${width}`
  return createPublicAssetUrl(`${basename}.${format}`)
}

function heroSrcSet(format: 'avif' | 'webp' | 'png') {
  return HERO_VARIANT_WIDTHS
    .map((width) => `${heroVariantSrc(format, width)} ${width}w`)
    .join(', ')
}

export const HOME_HERO_IMAGE_AVIF_SRC_SET = heroSrcSet('avif')
export const HOME_HERO_IMAGE_WEBP_SRC_SET = heroSrcSet('webp')
export const HOME_HERO_IMAGE_PNG_SRC_SET = heroSrcSet('png')

let heroImage: HTMLImageElement | null = null
let heroDecodePromise: Promise<void> | null = null

export function warmHomeHeroImage(): Promise<void> | null {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return null

  if (!heroImage) {
    heroImage = new Image()
    heroImage.loading = 'eager'
    heroImage.decoding = 'async'
    heroImage.fetchPriority = 'high'
    heroImage.sizes = HOME_HERO_IMAGE_SIZES
    heroImage.srcset = HOME_HERO_IMAGE_WEBP_SRC_SET
    heroImage.src = HOME_HERO_IMAGE_PRELOAD_SRC
  }

  if (!heroDecodePromise) {
    heroDecodePromise = typeof heroImage.decode === 'function'
      ? heroImage.decode().catch(() => {
          heroImage = null
          heroDecodePromise = null
        })
      : Promise.resolve()
  }

  return heroDecodePromise
}

export function resetHomeHeroImageWarmupForTest() {
  heroImage = null
  heroDecodePromise = null
}
