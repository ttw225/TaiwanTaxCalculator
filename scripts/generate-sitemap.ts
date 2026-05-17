// Generate dist/client/sitemap.xml from the same route list as react-router.config.ts.
// Runs after `react-router build` (see package.json "build" script).
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CHECKLIST_ITEMS } from '../src/content/deductions'
import { SITE_CONFIG } from '../src/lib/siteConfig'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = join(__dirname, '..')

const SEO_INDEXABLE_CATEGORIES = new Set([
  'exemptions',
  'general_deductions',
  'special_deductions',
])

interface Entry {
  path: string
  changefreq: 'monthly' | 'weekly' | 'yearly'
  priority: number
}

function buildEntries(): Entry[] {
  const deductionEntries: Entry[] = CHECKLIST_ITEMS
    .filter((i) => SEO_INDEXABLE_CATEGORIES.has(i.category))
    .map((i) => ({ path: `/deductions/${i.id}`, changefreq: 'yearly', priority: 0.7 }))
  return [
    { path: '/', changefreq: 'monthly', priority: 1.0 },
    { path: '/about', changefreq: 'yearly', priority: 0.5 },
    { path: '/methodology', changefreq: 'yearly', priority: 0.5 },
    ...deductionEntries,
  ]
}

function renderXml(entries: Entry[]): string {
  const lastmod = SITE_CONFIG.lastUpdated.length === 7
    ? `${SITE_CONFIG.lastUpdated}-01`
    : SITE_CONFIG.lastUpdated
  const items = entries
    .map(
      (e) => `  <url>
    <loc>${SITE_CONFIG.siteUrl}${e.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items}
</urlset>
`
}

async function main() {
  const outDir = join(PROJECT_ROOT, 'dist', 'client')
  await mkdir(outDir, { recursive: true })
  const xml = renderXml(buildEntries())
  await writeFile(join(outDir, 'sitemap.xml'), xml, 'utf8')
  console.log(`Wrote sitemap with ${buildEntries().length} URLs to dist/client/sitemap.xml`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
