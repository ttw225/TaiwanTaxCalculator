# CI and deploy

## Deployment surfaces

| Surface | URL | How deployed |
|---------|-----|-------------|
| **Production** | `https://taiwantaxcalculator.com` (apex + `www`) | Cloudflare Pages — auto-deploy on push to `main` |
| **Dev test site** | `https://<org>.github.io/TaiwanTaxCalculator/dev/` | GitHub Actions `pages-preview.yml` → `gh-pages` branch |
| **PR previews** | `https://<org>.github.io/TaiwanTaxCalculator/pr-preview/pr-N/` | Same workflow; cleaned up on PR close |

Canonical URL is always the apex (`https://taiwantaxcalculator.com/`). `www` is accessible but all prerendered HTML contains `<link rel="canonical" href="https://taiwantaxcalculator.com/...">` — no 301 redirect needed.

---

## Cloudflare Pages (production)

### Build config

- **Build command**: `pnpm build` (`react-router build && tsx scripts/generate-sitemap.ts`)
- **Output directory**: `dist/client/` (set in [`wrangler.toml`](../wrangler.toml): `pages_build_output_dir = "dist/client"`)
- **Node version**: 24 (set in Cloudflare Pages dashboard or `NODE_VERSION` env var)

### Static file handling

React Router v7 (`ssr: false`) prerenders all routes to static HTML at build time. The full prerender list is in [`react-router.config.ts`](../react-router.config.ts).

Post-build, [`scripts/generate-sitemap.ts`](../scripts/generate-sitemap.ts) writes:
- `dist/client/sitemap.xml` — all indexable URLs
- `dist/client/404.html` — copied from `dist/client/404/index.html`; Cloudflare Pages serves this with HTTP 404 for unmatched routes (avoids soft-404)

### Response headers — `public/_headers`

[`public/_headers`](../public/_headers) is copied into `dist/client/` at build time and applied by Cloudflare Pages on every response.

Key rules:
- `/assets/*` — `max-age=31536000, immutable` (Vite content-hashed bundles)
- `/introduction-image/*` — 30-day cache + `stale-while-revalidate`
- `/Hero.svg` — 30-day cache
- `/*` — HSTS, CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy`, `Referrer-Policy`
- CSP uses `script-src 'self' 'unsafe-inline'` — required because React Router v7 prerender emits per-page inline boot scripts (`__reactRouterContext`, Suspense reveal). There is no user-input injection and no third-party JS, so XSS surface is zero.

### Redirects — `public/_redirects`

[`public/_redirects`](../public/_redirects) is currently empty (comments only). Unmatched routes fall through to `404.html` via Cloudflare Pages' automatic custom-404 detection. Add rules here for URL migrations.

### Preview environment isolation — `functions/_middleware.ts`

[`functions/_middleware.ts`](../functions/_middleware.ts) is a Cloudflare Pages Function (global middleware). It injects `X-Robots-Tag: noindex, nofollow` on any response served from:
- `*.pages.dev` hostnames
- Non-`main` branch deploys (`CF_PAGES_BRANCH !== "main"`)

Production deploys on the custom domain are left untouched; per-route `<meta name="robots">` in prerendered HTML handles indexing directives.

### Manual Cloudflare dashboard settings

These cannot be set via files; configure once in the Cloudflare dashboard:

- **Speed → Optimization → Polish**: Lossy + WebP (edge-side image compression for browsers that don't request AVIF/WebP explicitly)
- **Caching → Tiered Cache**: enabled
- **SSL/TLS → Always Use HTTPS + HSTS**: consistent with `_headers` HSTS rule
- **DNS**: both apex and `www` CNAME → Pages project

---

## GitHub Actions CI

### `ci.yml`

[`ci.yml`](../.github/workflows/ci.yml)

- **Triggers**: `pull_request`, `push` to `main` / `dev`, `workflow_dispatch`.
- **Permissions**: `contents: read`.
- **Job** `check` on `ubuntu-latest`: checkout → pnpm setup → Node **24** with pnpm cache → `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build`.

### `pages-preview.yml`

[`pages-preview.yml`](../.github/workflows/pages-preview.yml)

- **Permissions**: `contents: write`, `pull-requests: write`.
- **Concurrency**: group `github-pages-previews`, `cancel-in-progress: false`.
- Builds with `VITE_BASE_PATH` injected so assets resolve correctly under the GitHub Pages subpath.

#### Job `deploy-dev`

- **If**: `push` to `dev` or `workflow_dispatch`.
- Build env: `VITE_BASE_PATH: /TaiwanTaxCalculator/dev/`, `VITE_DEPLOY_CONTEXT: dev`.
- Clones/initializes `gh-pages` worktree → copies `dist/client` → `pages-worktree/dev/` → re-renders hub `index.html` → commits + pushes.

#### Job `deploy-pr-preview`

- **If**: `pull_request`, action not `closed`, same-repo head.
- Build env: `VITE_BASE_PATH: /TaiwanTaxCalculator/pr-preview/pr-<N>/`.
- Deploys to `pages-worktree/pr-preview/pr-<N>/`.
- **PR comment**: upserts comment with marker `<!-- tax-web-pr-preview -->` and preview URL.

#### Job `cleanup-pr-preview`

- **If**: PR `closed`, same-repo head.
- Removes `pr-preview/pr-<N>` from worktree, re-renders hub `index.html`, commits.

### `render-pages-index.sh`

[`render-pages-index.sh`](../.github/scripts/render-pages-index.sh)

- Args: `<pages-root>`.
- Lists `pr-preview/pr-*` dirs, writes `index.html` (zh-Hant) with links to Production, Dev, and all open PR previews.

---

## Local preview

```bash
pnpm build
pnpm preview          # serves dist/client/ on http://localhost:4173
```

For GitHub Pages subpath simulation (matching pr-preview URLs):

```bash
VITE_BASE_PATH=/TaiwanTaxCalculator/pr-preview/pr-99/ pnpm build
pnpm preview
```

---

## Related docs

- Release process: [`15-release-process.md`](./15-release-process.md)
- Deploy metadata in app: [`src/lib/deployInfo.ts`](../src/lib/deployInfo.ts)
- Repo layout (scripts, functions, public): [`03-repo-layout.md`](./03-repo-layout.md)
