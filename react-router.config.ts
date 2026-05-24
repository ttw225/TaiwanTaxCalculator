import type { Config } from '@react-router/dev/config'

const basePath = process.env.VITE_BASE_PATH ?? '/'
const basename = basePath === '/' ? '/' : basePath.replace(/\/$/, '')

// Build-time prerender of every route to static HTML. No runtime SSR.
// Output goes to dist/client/ (Cloudflare Pages reads
// pages_build_output_dir = "dist/client", see wrangler.toml).
export default {
  appDirectory: 'src',
  buildDirectory: 'dist',
  basename,
  ssr: false,
  prerender: async () => {
    // Lazy-import content so this config stays light at startup.
    const { CHECKLIST_ITEMS } = await import('./src/content/deductions')
    const SEO_INDEXABLE_CATEGORIES = new Set([
      'exemptions',
      'general_deductions',
      'special_deductions',
    ])
    const deductionPaths = CHECKLIST_ITEMS.filter((i) =>
      SEO_INDEXABLE_CATEGORIES.has(i.category),
    ).map((i) => `/deductions/${i.id}`)
    return ['/', '/checklist/start', '/checklist', '/payment-rewards', '/about', '/methodology', '/404', ...deductionPaths]
  },
} satisfies Config
