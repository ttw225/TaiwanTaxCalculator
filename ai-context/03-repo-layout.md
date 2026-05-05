# Repository layout

Paths are relative to repo root unless noted.

## Root

| Path | Role |
|------|------|
| [`package.json`](../package.json) | Dependencies, scripts, engines |
| [`pnpm-lock.yaml`](../pnpm-lock.yaml) | Lockfile |
| [`vite.config.ts`](../vite.config.ts) | Vite + Vitest + Tailwind plugin |
| [`tsconfig.json`](../tsconfig.json) | Project references |
| [`tsconfig.app.json`](../tsconfig.app.json) | App + tests TS config |
| [`tsconfig.node.json`](../tsconfig.node.json) | Node-side TS (Vite config) |
| [`eslint.config.js`](../eslint.config.js) | ESLint flat config |
| [`index.html`](../index.html) | HTML shell |
| [`Makefile`](../Makefile) | pnpm shortcuts |
| [`cz.toml`](../cz.toml) | Commitizen / version bump settings |
| [`AGENTS.md`](../AGENTS.md), [`CLAUDE.md`](../CLAUDE.md) | Agent / contributor entry |
| [`CONTRIBUTING.md`](../CONTRIBUTING.md), [`SECURITY.md`](../SECURITY.md), [`README.md`](../README.md) | Human docs |
| [`ai-context/`](../ai-context/) | This AI-oriented knowledge base (English) |

## `src/`

| Path | Role |
|------|------|
| [`src/main.tsx`](../src/main.tsx) | `createRoot`, `StrictMode`, CSS import |
| [`src/App.tsx`](../src/App.tsx) | Top-level checklist flow, state, storage wiring |
| [`src/index.css`](../src/index.css) | Tailwind import + print media rules |
| [`src/components/`](../src/components/) | UI: header/footer, situation selector, results, cards, tools |
| [`src/components/tools/`](../src/components/tools/) | Dividend, couple filing, AMT tools + source refs |
| [`src/content/`](../src/content/) | Structured zh-TW content: checklist, decision-tool meta, inline field defs |
| [`src/data/numbers_2026.json`](../src/data/numbers_2026.json) | Canonical numeric snapshot for deployed year |
| [`src/lib/`](../src/lib/) | Domain logic: checklist engine, numbers, [`grossIncome.ts`](../src/lib/grossIncome.ts), [`generalDeductionEffective.ts`](../src/lib/generalDeductionEffective.ts), [`checklistCardCopy.ts`](../src/lib/checklistCardCopy.ts), decisions, storage, export, scroll, deploy, site config |
| [`src/types/content.ts`](../src/types/content.ts) | Shared content types |
| [`src/assets/`](../src/assets/) | Static images (e.g. hero) |

## `tests/`

Vitest tests: [`tests/*.test.ts`](../tests/), [`tests/*.test.tsx`](../tests/). See [`13-testing.md`](./13-testing.md).

- [`tests/schema-fixture.ts`](../tests/schema-fixture.ts): compile-time `ChecklistItem` shape check (not executed by Vitest).

## `public/`

Static assets served as-is (favicon, icon sprite).

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
