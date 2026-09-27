# CI and deploy

## Deployment surfaces

| Surface | URL | How deployed |
|---------|-----|-------------|
| **Production** | `https://taiwantaxcalculator.com` (apex + `www`) | GitHub Actions `release.yml` — commitizen 升版後 `wrangler pages deploy` |
| **Dev test site** | `https://<org>.github.io/TaiwanTaxCalculator/dev/` | GitHub Actions `pages-preview.yml` → `gh-pages` branch |
| **PR previews** | `https://<org>.github.io/TaiwanTaxCalculator/pr-preview/pr-N/` | Same workflow; cleaned up on PR close |

Canonical URL is always the apex (`https://taiwantaxcalculator.com/`). `www` is accessible but all prerendered HTML contains `<link rel="canonical" href="https://taiwantaxcalculator.com/...">` — no 301 redirect needed.

---

## Cloudflare Pages (production)

部署由 GitHub Actions [`release.yml`](../.github/workflows/release.yml) 用 `wrangler pages deploy` 推送 — Cloudflare 端 **不再連 Git**（dashboard → Builds & deployments → Production branch automatic deployments 已關閉）。詳見下方「GitHub Actions CI → `release.yml`」。

### Build config

- **Build command**: `pnpm build` (`react-router build && tsx scripts/generate-sitemap.ts`)，在 Actions runner 上跑
- **Output directory**: `dist/client/` (set in [`wrangler.toml`](../wrangler.toml): `pages_build_output_dir = "dist/client"`)
- **Node version**: `^24.15.0`（在 `release.yml` 中由 `actions/setup-node` + `node-version-file: package.json` 解析）

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
- `/Hero.*` — 30-day cache for homepage hero variants
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
- **Web Analytics**: Web Analytics → Add a site → custom domain. Copy the token into `siteConfig.cloudflareAnalyticsToken`. The beacon is conditionally rendered in [`root.tsx`](../src/root.tsx); CSP already whitelists the Cloudflare Insights script + endpoint.

---

## Post-launch SEO submission

Run these once after the production domain serves real content:

1. **Google Search Console** ([search.google.com/search-console](https://search.google.com/search-console))
   - Add property: `https://taiwantaxcalculator.com` (Domain property; verify via Cloudflare DNS TXT).
   - Submit sitemap: `https://taiwantaxcalculator.com/sitemap.xml`.
   - Watch *Pages* → *Indexed* and *Core Web Vitals* reports over ~14 days.
2. **Bing Webmaster Tools** ([bing.com/webmasters](https://www.bing.com/webmasters))
   - Import from Search Console (one click) or add manually with the same sitemap URL.
3. **Rich Results Test** ([search.google.com/test/rich-results](https://search.google.com/test/rich-results))
   - Spot-check `/`, `/methodology`, a `/deductions/:slug`. Each should show its declared schema (WebApplication / TechArticle / Article+BreadcrumbList) with no errors.
4. **PageSpeed Insights** ([pagespeed.web.dev](https://pagespeed.web.dev/))
   - Run against `/` and `/checklist`. Target: Performance ≥ 90 (mobile), SEO ≥ 95, all CWV "Good".

---

## GitHub Actions CI

### `ci.yml`

[`ci.yml`](../.github/workflows/ci.yml)

- **Triggers**: `pull_request`, `push` to `main` / `dev`, `workflow_dispatch`.
- **Permissions**: `contents: read`.
- **Job** `check` on `ubuntu-latest`: checkout → pnpm setup → Node **24** with pnpm cache → `pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm lint` → `pnpm test` → `pnpm build`.

### `release.yml`

[`release.yml`](../.github/workflows/release.yml)

- **Triggers**: `push` to `main`, `workflow_dispatch`.
- **Top-level permissions**: `contents: read`（job 層再各自提升）。
- **Concurrency**: group `release-main`, `cancel-in-progress: false` — 避免兩個 PR 同時 merge 時 bump push race。

兩個 jobs：

1. **`bump-version`**（permissions `contents: write`）：只在 push 且 commit message 不是 `bump:` / `auto:` 開頭時跑。用 [`commitizen-tools/commitizen-action`](https://github.com/commitizen-tools/commitizen-action)（pin 到 SHA）依 conventional commits 升版、寫 changelog、push `bump: x.y.z` commit 回 main，並用 `ncipollo/release-action` 建 GitHub Release。透過 SHA 比對輸出 `bumped` (true/false) 與升版後的 `sha`。需要 `secrets.PERSONAL_ACCESS_TOKEN`。
2. **`deploy`**（`needs: bump-version`）：當 `workflow_dispatch` 或 `bumped == 'true'` 時跑。checkout 升版後的 SHA（手動觸發時 fallback 到 `github.sha`），跑 `pnpm install` + `pnpm build`，用 [`cloudflare/wrangler-action@v3`](https://github.com/cloudflare/wrangler-action) 執行 `wrangler pages deploy dist/client --project-name=taiwan-tax-calculator --branch=main`。需要 `secrets.CLOUDFLARE_API_TOKEN`（Pages:Edit 最小權限）與 `secrets.CLOUDFLARE_ACCOUNT_ID`。

「沒升版時不部署」是刻意的：純 `chore:` / `docs:` PR 不會 bump，也不會出新版到線上。需要手動補部署時走 `workflow_dispatch`。

### `pages-preview.yml`

[`pages-preview.yml`](../.github/workflows/pages-preview.yml)

- **Permissions**: `contents: write`, `pull-requests: write`.
- **Concurrency**: group `github-pages-previews`, `cancel-in-progress: false`.
- Builds with `VITE_BASE_PATH` injected so assets and React Router client navigation resolve correctly under the GitHub Pages subpath.
- `react-router.config.ts` derives `basename` from `VITE_BASE_PATH`. Because React Router prerenders HTML under that basename path, `scripts/generate-sitemap.ts` flattens the basename output back into `dist/client/` before the workflow copies it into `gh-pages`.

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
