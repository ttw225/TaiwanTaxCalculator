# Stack and tooling

## Runtime / package manager

- **Node**: `^24.0.0` ([`package.json`](../package.json) `engines`).
- **pnpm**: `^11.0.0`; pinned via `packageManager` in [`package.json`](../package.json).

## Application stack

| Layer | Choice | Config / entry |
|-------|--------|----------------|
| Build | **React Router v7** (framework mode) + **Vite 8** | [`vite.config.ts`](../vite.config.ts), [`react-router.config.ts`](../react-router.config.ts) |
| UI | **React 19** | [`src/root.tsx`](../src/root.tsx), [`src/routes.ts`](../src/routes.ts) |
| Language | **TypeScript ~6** (strict) | [`tsconfig.app.json`](../tsconfig.app.json) |
| CSS | **Tailwind CSS v4** via `@tailwindcss/vite` | [`vite.config.ts`](../vite.config.ts), [`src/index.css`](../src/index.css) |
| Icons | **lucide-react** | Components as needed |
| Test | **Vitest 4** + **jsdom** | [`vitest.config.ts`](../vitest.config.ts) |
| Lint | **ESLint 10** flat config, TS + React Hooks + React Refresh | [`eslint.config.js`](../eslint.config.js) |

## TypeScript compiler highlights (`tsconfig.app.json`)

- `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`.
- `jsx: "react-jsx"`, `moduleResolution: "bundler"`, `resolveJsonModule: true`.
- Includes `src` and `tests`.

## Scripts (`package.json`)

| Script | Command |
|--------|---------|
| `pnpm dev` | React Router dev server (default port **5173**) |
| `pnpm dev:clean` | `rm -rf node_modules/.vite && react-router dev` — clears Vite optimize-deps cache first (use after changing `vite.config.ts` or when hydration mysteriously breaks) |
| `pnpm build` | `react-router build && tsx scripts/generate-sitemap.ts` |
| `pnpm typecheck` | `tsc --noEmit -p tsconfig.app.json` |
| `pnpm test` | `vitest run -c vitest.config.ts` |
| `pnpm test:watch` | `vitest -c vitest.config.ts` |
| `pnpm lint` | `eslint .` |
| `pnpm preview` | `vite preview --outDir dist/client` |

## Image optimization devDependencies

- **`sharp`** — used by `scripts/optimize-intro-images.ts` and `scripts/optimize-hero-svg.ts` to re-encode screenshots/SVG rasters to AVIF/WebP/PNG. Native binary; `pnpm-workspace.yaml` sets `allowBuilds: sharp: true`.
- **`svgo`** — SVG optimization (minimal gain on `Hero.svg` due to embedded raster; kept for future use).

## Framework and build specifics

- **`base`**: `process.env.VITE_BASE_PATH ?? '/'` — required for GitHub Pages subpath PR-preview deploys ([`14-ci-and-deploy.md`](./14-ci-and-deploy.md)). Production on Cloudflare Pages uses `/`.
- `vite.config.ts` plugins: `reactRouter()` (`@react-router/dev/vite`) + `tailwindcss()`. **Not** `@vitejs/plugin-react` — the framework plugin handles React transformation for production builds.
- `vitest.config.ts` uses a separate standalone `react()` plugin (`@vitejs/plugin-react`) — Vitest does not go through the React Router framework plugin.
- `react-router.config.ts`: `ssr: false`, `prerender` list — builds fully static HTML to `dist/client/` at build time. No runtime server required.

## Local verification

Use `pnpm check` for local verification. It runs generated-data freshness checks,
typecheck, lint, and the Vitest suite.

## Related docs

- Layout: [`03-repo-layout.md`](./03-repo-layout.md)
- CI runs the same checks: [`14-ci-and-deploy.md`](./14-ci-and-deploy.md)
