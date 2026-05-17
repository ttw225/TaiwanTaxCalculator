// Post-build script: generates dist/client/sitemap.xml and copies the prerendered
// /404 page to dist/client/404.html so Cloudflare Pages auto-serves it as the
// custom 404 page (with HTTP 404 status) for unmatched routes.
// Runs after `react-router build` (see package.json "build" script).
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
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

  // Cloudflare Pages auto-serves a top-level `404.html` for unmatched routes
  // with HTTP 404 status. React Router prerender outputs `404/index.html`, so
  // copy it up one level. (`_redirects` 404-status rewrites are not a
  // documented Cloudflare Pages feature.)
  await copyFile(join(outDir, '404', 'index.html'), join(outDir, '404.html'))
  console.log('Copied dist/client/404/index.html -> dist/client/404.html')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
