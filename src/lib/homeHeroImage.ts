import { createPublicAssetUrl } from './publicAsset'

export const HOME_HERO_IMAGE_WEBP_SRC = createPublicAssetUrl('Hero.webp')
export const HOME_HERO_IMAGE_AVIF_SRC = createPublicAssetUrl('Hero.avif')
export const HOME_HERO_IMAGE_SRC = createPublicAssetUrl('Hero.png')
export const HOME_HERO_IMAGE_PRELOAD_SRC = HOME_HERO_IMAGE_WEBP_SRC
export const HOME_HERO_IMAGE_WIDTH = 1920
export const HOME_HERO_IMAGE_HEIGHT = 1173

let heroImage: HTMLImageElement | null = null
let heroDecodePromise: Promise<void> | null = null

export function warmHomeHeroImage(): Promise<void> | null {
  if (typeof window === 'undefined' || typeof Image === 'undefined') return null

  if (!heroImage) {
    heroImage = new Image()
    heroImage.loading = 'eager'
    heroImage.decoding = 'async'
    heroImage.fetchPriority = 'high'
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
