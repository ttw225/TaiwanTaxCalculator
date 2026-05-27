# Keeping `ai-context/` up to date

When you change behavior or contracts, update the **English** docs in [`ai-context/`](../ai-context/) in the **same PR** when feasible so AI tools and humans stay aligned.

## Trigger matrix

| Change | Update |
|--------|--------|
| New / removed `SituationId`, situation group, or checklist item | [`04-domain-model.md`](./04-domain-model.md), [`06-content-modules.md`](./06-content-modules.md), [`08-checklist-engine.md`](./08-checklist-engine.md), [`MAP.json`](./MAP.json) keywords if new domain words |
| `numbers_2026.json` keys or values | [`05-tax-numbers.md`](./05-tax-numbers.md); grep other `ai-context` files for stale literals |
| `public/data/tax_payment_rewards_114.json` / `card_catalog_114.json` schema or field semantics | [`payment-rewards-schema.md`](./payment-rewards-schema.md); if eligibility / solver rules change, also [`04-domain-model.md`](./04-domain-model.md) § Payment rewards |
| Payment reward content-only edits (no schema change) | Re-run `pnpm generate:payment-data` and commit generated files if changed; schema doc usually unchanged |
| `ChecklistFlow.tsx` state, removal rules, `cardInputMap`, route URLs | [`07-app-flow-and-state.md`](./07-app-flow-and-state.md) |
| React Router routes, prerender list, build output dir (`dist/client`) | [`03-repo-layout.md`](./03-repo-layout.md), [`14-ci-and-deploy.md`](./14-ci-and-deploy.md), [`.github/workflows/pages-preview.yml`](../.github/workflows/pages-preview.yml) |
| Storage key format or legacy cleanup | [`11-storage-and-persistence.md`](./11-storage-and-persistence.md) |
| New component or major prop change | [`10-ui-components.md`](./10-ui-components.md) |
| `exportChecklist.ts` / `formatChecklistMarkdown` output shape or export copy | [`10-ui-components.md`](./10-ui-components.md), [`13-testing.md`](./13-testing.md); update [`tests/fixtures/exportChecklist/`](../tests/fixtures/exportChecklist/) when golden contracts change |
| Print CSS or print-only layout classes | [`12-styling-and-print.md`](./12-styling-and-print.md), [`10-ui-components.md`](./10-ui-components.md) if component hooks change |
| Checklist engine rules (`checklist.ts`) | [`08-checklist-engine.md`](./08-checklist-engine.md) |
| `grossIncome.ts`, `gross-income` card fields, or sidebar gross total semantics | [`04-domain-model.md`](./04-domain-model.md), [`10-ui-components.md`](./10-ui-components.md), [`13-testing.md`](./13-testing.md) |
| CI / Pages / env vars | [`14-ci-and-deploy.md`](./14-ci-and-deploy.md) |
| Release / Commitizen / branch policy | [`15-release-process.md`](./15-release-process.md) |
| Global policy (language, numbers, private repo) | [`16-conventions-and-policies.md`](./16-conventions-and-policies.md); may also need [`AGENTS.md`](../AGENTS.md) / [`.cursor/rules/`](../.cursor/rules/) |
| New top-level directory or script | [`03-repo-layout.md`](./03-repo-layout.md), [`02-stack-and-tooling.md`](./02-stack-and-tooling.md) if tooling |

## PR checklist (recommended)

Add a checkbox to your PR description:

- [ ] Updated `ai-context/` if this PR changes contracts, content IDs, tax numbers, CI, or user-visible flows.

## Optional Cursor rule

See [`.cursor/rules/ai-context.mdc`](../.cursor/rules/ai-context.mdc) — non–always-on hint to read [`ai-context/README.md`](../ai-context/README.md) before non-trivial work.

## Encoding

- All `ai-context` text files are **UTF-8**. After editing Chinese examples, re-open files to confirm no replacement character (U+FFFD).
