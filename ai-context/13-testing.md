# Testing

## Runner configuration

- **Vitest** embedded in Vite: [`vite.config.ts`](../vite.config.ts) — `environment: 'jsdom'`, `include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx']`.
- Tests **import** APIs from `'vitest'` (`describe`, `it`, `expect`, `vi`, etc.) — not Vitest `globals` mode.

## Test inventory

| File | Focus |
|------|--------|
| [`tests/foundation.test.ts`](../tests/foundation.test.ts) | `numbers_2026.json`, `getNumber`, `getBrackets`, `readLocal` / `writeLocal` / `removeLocal` |
| [`tests/triage.test.ts`](../tests/triage.test.ts) | `CARD_SORT_RULES` shape, `sortByTriage` stability and non-mutation |
| [`tests/decisions.test.ts`](../tests/decisions.test.ts) | `calcBracketTax`, `calcDividendOptions`, `calcCoupleFilingOptions`, `checkAmtThreshold` |
| [`tests/checklist.test.ts`](../tests/checklist.test.ts) | Publication gate, situation filtering, category order, content integrity, markdown export shape, component markup strings |
| [`tests/decision-tools.test.tsx`](../tests/decision-tools.test.tsx) | `DecisionToolsPanel` visibility vs selected situations |
| [`tests/situation-selection-storage.test.tsx`](../tests/situation-selection-storage.test.tsx) | Storage key with `BASE_URL`, load/save, App clear integration |
| [`tests/situation-single-source-flow.test.tsx`](../tests/situation-single-source-flow.test.tsx) | App flows: add modal, scroll target, remove dialog, multi-source labels, legacy key removal |
| [`tests/back-to-top-button.test.tsx`](../tests/back-to-top-button.test.tsx) | `BackToTopButton` threshold, scroll animation vs reduced motion |
| [`tests/schema-fixture.ts`](../tests/schema-fixture.ts) | **Compile-only** `ChecklistItem` fixture for `pnpm typecheck`; **not** picked up by Vitest `include` |

## Representative invariants

- **Publication**: no `unverified` items in published set used for UI.
- **Married + salary**: `standard-deduction-single` excluded when `married` selected.
- **Categories**: order `gross_income` → `exemptions` → `general_deductions` → `special_deductions` → `further_check`; `further_check` items use `disclaimer_level === 'high'`.
- **Situations**: count **14**; every `SituationId` has at least one published item; `SITUATION_GROUPS` union equals all ids, no duplicates, fixed subgroup ordering tests.
- **Sources**: every item has `source_refs`, `next_action`, `why_it_matters`; `source_id` pattern; export markdown excludes internal fields like raw `source_id` / `verification_status` where tests assert privacy of export.
- **Triage**: rules use negative boosts; `dependents_count` not a sort field; empty input map preserves order.
- **AMT**: threshold **1_000_000** inclusive boundary.

## Integration patterns

- React 19 `createRoot` + `act` from `react-dom/test-utils` or `react` test utils; `IS_REACT_ACT_ENVIRONMENT = true` where needed.
- Mock `window.scrollY`, `scrollTo`, `requestAnimationFrame` / `cancelAnimationFrame`, `matchMedia`, layout (`getBoundingClientRect`, `innerHeight`) for scroll tests.
- Static markup snapshots via `react-dom/server` `renderToStaticMarkup` for some component contracts.

## Commands

- `pnpm test` — single run
- `pnpm test:watch` — watch mode

## Related docs

- CI runs tests: [`14-ci-and-deploy.md`](./14-ci-and-deploy.md)
