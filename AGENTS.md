# Agent instructions (tax-web)

This repository is the **public frontend** for a Taiwan individual income tax (綜合所得稅) information site. It is **not** the private research monorepo.

## Stack

- **Build**: Vite 8, React 19, TypeScript (project references: `tsconfig.app.json`, `tsconfig.node.json`)
- **UI**: Tailwind CSS v4 (`@tailwindcss/vite` in `vite.config.ts`), `src/index.css`
- **Test**: Vitest + jsdom (`pnpm test`, config in `vite.config.ts`)
- **Lint**: ESLint flat config (`eslint.config.js`), TypeScript ESLint recommended

## Commands

| Command | Purpose |
|--------|---------|
| `pnpm dev` | Dev server (default port **5173**) |
| `pnpm build` | `tsc -b` then production build |
| `pnpm typecheck` | Typecheck app TS (`tsconfig.app.json`) |
| `pnpm test` | Run Vitest once |
| `pnpm test:watch` | Vitest watch |
| `pnpm lint` | ESLint |
| `pnpm preview` | Preview production build |

Run **`pnpm test`** and **`pnpm lint`** after non-trivial logic or content-schema changes when feasible.

## Layout (high level)

| Path | Role |
|------|------|
| `src/App.tsx`, `src/main.tsx` | App entry |
| `src/components/` | UI components |
| `src/content/` | Copy and structured content (`deductions.ts`, `decision-tools.ts`, `inlineFields.ts`) |
| `src/data/numbers_2026.json` | **In-repo** canonical numeric snapshot for the app |
| `src/lib/` | Domain logic, storage, exports (`numbers.ts` reads `numbers_2026.json`) |
| `src/types/` | Shared content/types |
| `tests/` | Vitest tests |
| `public/` | Static assets |

Site name, nav, and tax-year labels: **`src/lib/siteConfig.ts`**.

## Content and tax claims

- **User-facing UI copy** should be **Traditional Chinese (zh-TW)** unless the product explicitly adds another locale.
- **Do not invent** statutory rates, brackets, deadlines, or official procedures. Use **`src/data/numbers_2026.json`** and **`src/lib/numbers.ts`** (or existing content modules) as the in-repo source of truth for deployed numbers.
- When adding or changing tax explanations, keep wording aligned with existing modules under `src/content/` and the tone implied by `siteConfig`.
- Do not paste private research excerpts into **public** GitHub issues or PR descriptions.

## Related entry points

- **`CLAUDE.md`** — short pointer for Claude Code (same policies as this file).
- **`.cursor/rules/*.mdc`** — Cursor rule snippets (scopes and globs).
- **`AGENTS.local.md.example`** — optional; copy to gitignored **`AGENTS.local.md`** if you reference a separate private research repo on your machine.
