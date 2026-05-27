/**
 * Generate responsive homepage hero image variants from public/Hero.png.
 *
 * Keep public/Hero.png as the canonical 1920px raster fallback. The generated
 * smaller variants let browsers avoid downloading the full 1920px LCP image on
 * narrow viewports while preserving the existing Safari-safe raster path.
 *
 * Usage:
 *   pnpm tsx scripts/optimize-hero-images.ts
 */
import { stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')
const HERO_SOURCE = join(PROJECT_ROOT, 'public', 'Hero.png')
const HERO_DIR = join(PROJECT_ROOT, 'public')

const WIDTHS = [640, 960, 1280]

function fmtKb(n: number) {
  return `${(n / 1024).toFixed(0)} KB`
}

async function main() {
  const sourceStat = await stat(HERO_SOURCE)
  const source = sharp(HERO_SOURCE, { unlimited: true })
  const meta = await source.metadata()
  const sourceWidth = meta.width ?? 0
  const sourceHeight = meta.height ?? 0

  if (sourceWidth === 0 || sourceHeight === 0) {
    throw new Error(`Could not read Hero.png dimensions`)
  }

  console.log(`Hero source: ${sourceWidth}x${sourceHeight} ${fmtKb(sourceStat.size)}`)

  for (const width of WIDTHS) {
    if (width >= sourceWidth) continue
    const height = Math.round((sourceHeight / sourceWidth) * width)
    const resized = sharp(HERO_SOURCE, { unlimited: true }).resize({
      width,
      height,
      fit: 'inside',
      withoutEnlargement: true,
    })

    const avif = await resized.clone().avif({ quality: 58, effort: 6 }).toBuffer()
    const webp = await resized.clone().webp({ quality: 80, effort: 5 }).toBuffer()
    const png = await resized
      .clone()
      .png({ compressionLevel: 9, palette: true, quality: 92, effort: 10 })
      .toBuffer()

    await writeFile(join(HERO_DIR, `Hero-${width}.avif`), avif)
    await writeFile(join(HERO_DIR, `Hero-${width}.webp`), webp)
    await writeFile(join(HERO_DIR, `Hero-${width}.png`), png)

    console.log(
      `  Hero-${width} ${width}x${height}: ` +
        `avif ${fmtKb(avif.length)} / ` +
        `webp ${fmtKb(webp.length)} / ` +
        `png ${fmtKb(png.length)}`,
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
