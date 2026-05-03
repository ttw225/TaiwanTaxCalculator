# Stack and tooling

## Runtime / package manager

- **Node**: `>=24` ([`package.json`](../package.json) `engines`).
- **pnpm**: `>=11`; `packageManager`: `pnpm@11.0.3`.

## Application stack

| Layer | Choice | Config / entry |
|-------|--------|----------------|
| Build | **Vite 8** | [`vite.config.ts`](../vite.config.ts) |
| UI | **React 19** | [`src/main.tsx`](../src/main.tsx), [`src/App.tsx`](../src/App.tsx) |
| Language | **TypeScript ~6** (strict) | [`tsconfig.app.json`](../tsconfig.app.json) |
| CSS | **Tailwind CSS v4** via `@tailwindcss/vite` | [`vite.config.ts`](../vite.config.ts), [`src/index.css`](../src/index.css) |
| Icons | **lucide-react** | Components as needed |
| Test | **Vitest 4** + **jsdom** | [`vite.config.ts`](../vite.config.ts) `test` block |
| Lint | **ESLint 10** flat config, TS + React Hooks + React Refresh | [`eslint.config.js`](../eslint.config.js) |

## TypeScript compiler highlights (`tsconfig.app.json`)

- `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`.
- `jsx: "react-jsx"`, `moduleResolution: "bundler"`, `resolveJsonModule: true`.
- Includes `src` and `tests`.

## Scripts (`package.json`)

| Script | Command |
|--------|---------|
| `pnpm dev` | Vite dev server (default port **5173**) |
| `pnpm build` | `tsc -b && vite build` |
| `pnpm typecheck` | `tsc --noEmit -p tsconfig.app.json` |
| `pnpm test` | `vitest run` |
| `pnpm test:watch` | `vitest` |
| `pnpm lint` | `eslint .` |
| `pnpm preview` | `vite preview` |

## Vite specifics

- **`base`**: `process.env.VITE_BASE_PATH ?? '/'` — required for GitHub Pages subpath deploys ([`14-ci-and-deploy.md`](./14-ci-and-deploy.md)).
- Plugins: `@vitejs/plugin-react`, `@tailwindcss/vite`.
- Vitest shares config via `defineConfig` from `vitest/config`.

## Makefile

Optional wrapper: [`Makefile`](../Makefile) — `make check` runs `typecheck && lint && test`.

## Related docs

- Layout: [`03-repo-layout.md`](./03-repo-layout.md)
- CI runs the same checks: [`14-ci-and-deploy.md`](./14-ci-and-deploy.md)
