# Repository layout

Paths are relative to repo root unless noted.

## Root

| Path | Role |
|------|------|
| [`package.json`](../package.json) | Dependencies, scripts, Node/pnpm version policy (`engines`, `packageManager`) |
| [`pnpm-lock.yaml`](../pnpm-lock.yaml) | Lockfile |
| [`pnpm-workspace.yaml`](../pnpm-workspace.yaml) | `allowBuilds` for native devDeps (`sharp`, `esbuild`) |
| [`vite.config.ts`](../vite.config.ts) | Vite + React Router framework plugin + Tailwind plugin |
| [`react-router.config.ts`](../react-router.config.ts) | React Router framework/prerender config (`ssr: false`, prerender route list) |
| [`wrangler.toml`](../wrangler.toml) | Cloudflare Pages deploy config (`pages_build_output_dir = "dist/client"`) |
| [`tsconfig.json`](../tsconfig.json) | Project references |
| [`tsconfig.app.json`](../tsconfig.app.json) | App + tests TS config |
| [`tsconfig.node.json`](../tsconfig.node.json) | Node-side TS (Vite config) |
| [`tsconfig.functions.json`](../tsconfig.functions.json) | TS config for `functions/` (uses `@cloudflare/workers-types`) |
| [`eslint.config.js`](../eslint.config.js) | ESLint flat config |
| [`cz.toml`](../cz.toml) | Commitizen / version bump settings |
| [`AGENTS.md`](../AGENTS.md), [`CLAUDE.md`](../CLAUDE.md) | Agent / contributor entry |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md), [`SECURITY.md`](../SECURITY.md), [`README.md`](../README.md) | Human docs |
| [`ai-context/`](../ai-context/) | This AI-oriented knowledge base (English) |

## `src/`

| Path | Role |
|------|------|
| [`src/root.tsx`](../src/root.tsx) | React Router root layout (`Layout`), static OG/meta, site-wide JSON-LD (Organization + WebSite), hero image warmup |
| [`src/routes.ts`](../src/routes.ts) | React Router route config |
| [`src/index.css`](../src/index.css) | Tailwind import + print media rules |
| [`src/pages/`](../src/pages/) | Route modules: `HomePage`, `ChecklistStartPage`, `ChecklistPage`, `ChecklistFlow`, `AboutPage`, `MethodologyPage`, `DeductionDetailPage`, `NotFoundPage`, `SiteLayout` |
| [`src/components/`](../src/components/) | UI: header/footer, `IntroPage`, situation selector, results, cards |
| [`src/content/`](../src/content/) | Structured zh-TW content: checklist and inline field defs |
| [`src/data/numbers_2026.json`](../src/data/numbers_2026.json) | Canonical numeric snapshot for deployed year |
| [`src/data/payment_top_offers.generated.json`](../src/data/payment_top_offers.generated.json), [`src/data/payment_reward_units.generated.json`](../src/data/payment_reward_units.generated.json) | Generated payment summary/reward-unit artifacts committed for review transparency |
| [`public/data/tax_payment_rewards_114.json`](../public/data/tax_payment_rewards_114.json) | 114-year tax payment reward campaigns and eligibility restrictions |
| [`public/data/card_catalog_114.json`](../public/data/card_catalog_114.json) | Card catalog joined by `eligible_card_ids` in payment reward data |
| [`src/lib/`](../src/lib/) | Domain logic — see table below |
| [`src/types/`](../src/types/) | Shared content/types |

### `src/lib/` notable files

| File | Role |
|------|------|
| [`siteConfig.ts`](../src/lib/siteConfig.ts) | Site name, URL, tax year, OG image, official links — single source of truth for all SEO/meta values |
| [`homeHeroImage.ts`](../src/lib/homeHeroImage.ts) | LCP hero: WebP/PNG URLs, stable dimensions, `warmHomeHeroImage()` singleton warmup |
| [`introImages.ts`](../src/lib/introImages.ts) | Maps intro-image basenames → AVIF/WebP/PNG URLs + intrinsic `{width, height}` for CLS prevention |
| [`checklistSnapshot.ts`](../src/lib/checklistSnapshot.ts) | Load/save/serialize checklist state; navigation-state key for `/` → `/checklist` transition |
| [`checklistEntryPath.ts`](../src/lib/checklistEntryPath.ts) | Thin helper: returns `/checklist` or `/checklist/start` from saved snapshot |
| [`numbers.ts`](../src/lib/numbers.ts) | `getNumber()`, `getBrackets()` — reads `numbers_2026.json` |
| [`storage.ts`](../src/lib/storage.ts) | SSR-safe `localStorage` helpers (`readLocal`, `writeLocal`, `removeLocal`, `hasLocalKey`) |
| [`exportChecklist.ts`](../src/lib/exportChecklist.ts) | `formatChecklistMarkdown()` — Markdown + PDF export |
| [`taxScenarios.ts`](../src/lib/taxScenarios.ts) | Tax scenario computation |
| [`grossIncome.ts`](../src/lib/grossIncome.ts) | Gross income aggregation |
| [`generalDeductionEffective.ts`](../src/lib/generalDeductionEffective.ts) | Effective general deduction logic |

## `tests/`

Vitest tests: [`tests/*.test.ts`](../tests/), [`tests/*.test.tsx`](../tests/). See [`13-testing.md`](./13-testing.md).

- [`tests/schema-fixture.ts`](../tests/schema-fixture.ts): compile-time `ChecklistItem` shape check (not executed by Vitest).
- [`tests/exportChecklistFixtures.test.ts`](../tests/exportChecklistFixtures.test.ts): golden-style Markdown export contracts via JSON fixtures under [`tests/fixtures/exportChecklist/`](../tests/fixtures/exportChecklist/).

## `public/`

Static assets served as-is. **All files are copied verbatim into `dist/client/` at build time.**

| Path | Role |
|------|------|
| [`favicon.svg`](../public/favicon.svg) | SVG favicon |
| [`icons.svg`](../public/icons.svg) | Icon sprite |
| [`robots.txt`](../public/robots.txt) | Allow all; Sitemap pointer. Preview isolation via `functions/_middleware.ts`. |
| [`_headers`](../public/_headers) | Cloudflare Pages response headers: immutable cache for `/assets/*`, image cache rules, security headers (HSTS, CSP, Permissions-Policy, X-Frame-Options) |
| [`_redirects`](../public/_redirects) | Cloudflare Pages redirect rules (currently empty; top-level `404.html` handles unmatched routes) |
| [`Hero.webp`](../public/Hero.webp), [`Hero.avif`](../public/Hero.avif), [`Hero.png`](../public/Hero.png) | LCP hero image variants. WebP is listed first and used for preload; AVIF is secondary; PNG is the fallback. |
| [`Hero.svg`](../public/Hero.svg) | Legacy/source hero image. Do not use it directly for the homepage LCP image; Safari can render the embedded AVIF black after client navigation. |
| `introduction-image/` | UI screenshot assets. Three formats per image: `.avif` (preferred), `.webp`, `.png` (fallback). All resized to ≤1920px longest edge. Re-generate with `pnpm tsx scripts/optimize-intro-images.ts`. |

No PWA manifest, Apple touch icon, 192/512 app icons, or OG cover image are emitted until those image assets exist in `public/`.

`sitemap.xml` is **not** in `public/` — it is generated post-build by [`scripts/generate-sitemap.ts`](../scripts/generate-sitemap.ts) and written directly to `dist/client/sitemap.xml`. Similarly `404.html` is copied from `dist/client/404/index.html` by the same script.

## `scripts/`

Node scripts run via `tsx`; they are not part of the Vite build pipeline.

| File | When to run | Purpose |
|------|-------------|---------|
| [`generate-sitemap.ts`](../scripts/generate-sitemap.ts) | Automatically after `pnpm build` | Writes `dist/client/sitemap.xml`; copies `dist/client/404/index.html` → `dist/client/404.html` (Cloudflare Pages custom 404) |
| [`optimize-intro-images.ts`](../scripts/optimize-intro-images.ts) | Manually when screenshots change | Re-encodes `public/introduction-image/*.png` → AVIF/WebP/optimized PNG via `sharp`. Idempotent (mtime-based skip). Run `--force` to re-encode all. |
| [`optimize-hero-svg.ts`](../scripts/optimize-hero-svg.ts) | Legacy/manual when `Hero.svg` changes | Re-encodes any embedded base64 PNG raster in `Hero.svg` to AVIF. The homepage should still consume raster variants, not the SVG directly. |

## `functions/`

Cloudflare Pages Functions.

| File | Role |
|------|------|
| [`functions/_middleware.ts`](../functions/_middleware.ts) | Global middleware: injects `X-Robots-Tag: noindex, nofollow` on `*.pages.dev` and non-`main` branch preview deployments. Leaves production untouched. |

## `.github/`

| Path | Role |
|------|------|
| [`workflows/ci.yml`](../.github/workflows/ci.yml) | PR/push CI |
| [`workflows/pages-preview.yml`](../.github/workflows/pages-preview.yml) | Dev + PR preview deploy to `gh-pages` |
| [`workflows/bumpversion.yml`](../.github/workflows/bumpversion.yml) | Version bump on `main` |
| [`scripts/render-pages-index.sh`](../.github/scripts/render-pages-index.sh) | Regenerate Pages hub `index.html` |
| [`dependabot.yml`](../.github/dependabot.yml) | Weekly GitHub Actions updates |
| [`ISSUE_TEMPLATE/`](../.github/ISSUE_TEMPLATE/) | Issue forms |
| [`pull_request_template.md`](../.github/pull_request_template.md) | PR checklist |

## `.cursor/`

[`rules/*.mdc`](../.cursor/rules/) — Cursor scoped rules. Summary: [`16-conventions-and-policies.md`](./16-conventions-and-policies.md).
