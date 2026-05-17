import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HERO_PATH = join(__dirname, '..', 'public', 'Hero.svg')

const fmtKb = (n: number) => `${(n / 1024).toFixed(1)} KB`

const original = await readFile(HERO_PATH, 'utf8')
console.log(`Hero.svg before: ${fmtKb(original.length)}`)

const dataUrlRegex = /data:image\/([a-z]+);base64,([A-Za-z0-9+/=]+)/g
let next = original
let processed = 0

for (const m of original.matchAll(dataUrlRegex)) {
  const [full, format, payload] = m
  if (format === 'avif') {
    console.log('  skip (already AVIF)')
    continue
  }
  const inBuf = Buffer.from(payload, 'base64')
  const meta = await sharp(inBuf).metadata()
  const avif = await sharp(inBuf).avif({ quality: 60, effort: 6 }).toBuffer()
  next = next.replace(full, `data:image/avif;base64,${avif.toString('base64')}`)
  processed++
  console.log(`  ${format} ${meta.width}x${meta.height} ${fmtKb(inBuf.length)} -> avif ${fmtKb(avif.length)}`)
}

if (processed > 0) {
  await writeFile(HERO_PATH, next, 'utf8')
  console.log(`Hero.svg after:  ${fmtKb(next.length)} (${((1 - next.length / original.length) * 100).toFixed(0)}% smaller)`)
}
