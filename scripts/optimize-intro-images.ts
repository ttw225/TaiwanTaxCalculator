/**
 * Optimize introduction-image PNG screenshots in-place.
 *
 * Source files at 7680×4320 (4K) are ~14MB total but the largest rendered slot
 * is ~1024px wide (max-w-5xl) → 2048px on retina. We downscale to 1920px on the
 * longest edge and emit three formats per image:
 *
 *   <name>.avif  (~80% smaller than PNG, modern browsers)
 *   <name>.webp  (~70% smaller, broader support)
 *   <name>.png   (lossy/palette compressed fallback, ~90% smaller than original)
 *
 * Original PNGs are overwritten with the compressed version. Recover from git
 * if you need the originals back. AVIF/WebP encoding uses moderate-effort
 * settings (visually lossless for UI screenshots).
 *
 * Idempotent — re-runs check `<name>.avif` mtime against the PNG mtime and skip
 * unchanged sources.
 *
 * Usage:
 *   pnpm tsx scripts/optimize-intro-images.ts
 *   pnpm tsx scripts/optimize-intro-images.ts --force
 */
import { readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')
const IMG_DIR = join(PROJECT_ROOT, 'public', 'introduction-image')

const MAX_EDGE = 1920
const FORCE = process.argv.includes('--force')

// Files referenced in src/components/IntroPage.tsx. Anything in IMG_DIR not on
// this list is treated as garbage (e.g. Step2.png was orphaned by a refactor).
const USED_BASENAMES = new Set([
  'Step1',
  'Step2-1',
  'Step2-2',
  'Step3-1-income-mobile',
  'Step3-1-income-web',
  'Step3-2-count-web',
  'Step3-2-income-mobile',
  'Step3-3-special-mobile',
  'Step3-3-special-web',
  'Step3-4-summary-mobile',
  'Step3-4-summary-web',
  'Step3-5-result-mobile',
  'Step3-5-result-web',
])

async function mtimeMs(p: string): Promise<number> {
  try {
    return (await stat(p)).mtimeMs
  } catch {
    return 0
  }
}

interface Result {
  name: string
  width: number
  height: number
  origBytes: number
  avifBytes: number
  webpBytes: number
  pngBytes: number
}

async function processOne(pngPath: string, name: string): Promise<Result | null> {
  const base = pngPath.slice(0, -4)
  const avifPath = `${base}.avif`
  const webpPath = `${base}.webp`

  const srcMs = await mtimeMs(pngPath)
  const origStat = await stat(pngPath)

  if (!FORCE) {
    const avifMs = await mtimeMs(avifPath)
    const webpMs = await mtimeMs(webpPath)
    if (avifMs >= srcMs && webpMs >= srcMs) {
      return null // already up-to-date
    }
  }

  // Load and downscale once; reuse the resized buffer for each format.
  const pipeline = sharp(pngPath, { unlimited: true })
  const meta = await pipeline.metadata()
  const w = meta.width ?? 0
  const h = meta.height ?? 0
  const longest = Math.max(w, h)
  const scale = longest > MAX_EDGE ? MAX_EDGE / longest : 1
  const targetW = Math.round(w * scale)
  const targetH = Math.round(h * scale)

  const resized = sharp(pngPath, { unlimited: true }).resize({
    width: targetW,
    height: targetH,
    fit: 'inside',
    withoutEnlargement: true,
  })

  // AVIF: quality 55 is visually lossless for UI screenshots; effort 6 = balanced
  const avifBuf = await resized.clone().avif({ quality: 55, effort: 6 }).toBuffer()
  await writeFile(avifPath, avifBuf)

  // WebP: quality 78 visually lossless for screenshots with sharp text/edges
  const webpBuf = await resized.clone().webp({ quality: 78, effort: 5 }).toBuffer()
  await writeFile(webpPath, webpBuf)

  // PNG fallback: palette mode + max compression. Overwrites the original.
  const pngBuf = await resized
    .clone()
    .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
    .toBuffer()
  await writeFile(pngPath, pngBuf)

  return {
    name,
    width: targetW,
    height: targetH,
    origBytes: origStat.size,
    avifBytes: avifBuf.length,
    webpBytes: webpBuf.length,
    pngBytes: pngBuf.length,
  }
}

function fmtKb(n: number) {
  return `${(n / 1024).toFixed(0)} KB`
}

async function main() {
  const files = await readdir(IMG_DIR)

  // Prune orphan files first (e.g. Step2.png that's no longer in IntroPage)
  for (const f of files) {
    const ext = extname(f)
    if (ext !== '.png' && ext !== '.avif' && ext !== '.webp') continue
    const base = f.slice(0, -ext.length)
    if (!USED_BASENAMES.has(base)) {
      const orphanPath = join(IMG_DIR, f)
      await unlink(orphanPath)
      console.log(`  pruned orphan: ${f}`)
    }
  }

  const results: Result[] = []
  for (const f of files) {
    if (!f.endsWith('.png')) continue
    const name = f.slice(0, -4)
    if (!USED_BASENAMES.has(name)) continue

    const result = await processOne(join(IMG_DIR, f), name)
    if (result) {
      results.push(result)
      const totalNew = result.avifBytes + result.webpBytes + result.pngBytes
      const reduction = (1 - totalNew / (result.origBytes * 3)) * 100
      console.log(
        `  ${name} ${result.width}x${result.height}  ` +
          `orig ${fmtKb(result.origBytes)} → ` +
          `avif ${fmtKb(result.avifBytes)} / ` +
          `webp ${fmtKb(result.webpBytes)} / ` +
          `png ${fmtKb(result.pngBytes)}  ` +
          `(${reduction.toFixed(0)}% smaller per-format avg)`,
      )
    } else {
      console.log(`  ${name} (up-to-date, skipped)`)
    }
  }

  if (results.length > 0) {
    const origTotal = results.reduce((s, r) => s + r.origBytes, 0)
    const newTotal = results.reduce((s, r) => s + r.avifBytes + r.webpBytes + r.pngBytes, 0)
    console.log(
      `\nProcessed ${results.length} images. ` +
        `Original PNGs ${fmtKb(origTotal)} → ` +
        `all variants combined ${fmtKb(newTotal)} ` +
        `(${((1 - newTotal / origTotal) * 100).toFixed(0)}% reduction).`,
    )
  } else {
    console.log('Nothing to do.')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
