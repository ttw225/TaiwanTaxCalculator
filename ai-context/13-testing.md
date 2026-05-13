# Testing

## Runner configuration

- **Vitest** embedded in Vite: [`vite.config.ts`](../vite.config.ts) — `environment: 'jsdom'`, `include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx']`.
- Tests **import** APIs from `'vitest'` (`describe`, `it`, `expect`, `vi`, etc.) — not Vitest `globals` mode.

## Test inventory

| File | Focus |
|------|--------|
| [`tests/foundation.test.ts`](../tests/foundation.test.ts) | `numbers_2026.json`, `getNumber`, `getBrackets`, `readLocal` / `writeLocal` / `removeLocal` |
| [`tests/grossIncome.test.ts`](../tests/grossIncome.test.ts) | [`grossIncome.ts`](../src/lib/grossIncome.ts): cap, per-person deduction/net, legacy salary parsing, shared income participants, explicit salary vs default-zero non-salary income |
| [`tests/generalDeductionEffective.test.ts`](../tests/generalDeductionEffective.test.ts) | `resolveGeneralDeduction` + `getItemizedItemAmount` (includes itemized calc context: donation cap vs gross income, mortgage vs savings-investment dependency) |
| [`tests/checklist.test.ts`](../tests/checklist.test.ts) | Situation filtering, `groupByCategory`, content integrity, traceability UI, standard/itemized panel, export / `formatChecklistMarkdown`, `DeductionCard` |
| [`tests/situation-selection-storage.test.tsx`](../tests/situation-selection-storage.test.tsx) | Storage key with `BASE_URL`, load/save, App clear integration |
| [`tests/situation-single-source-flow.test.tsx`](../tests/situation-single-source-flow.test.tsx) | App flows: add modal, scroll target, selection-driven add/remove, non-removable cards, remove dialog, legacy key removal |
| [`tests/back-to-top-button.test.tsx`](../tests/back-to-top-button.test.tsx) | `BackToTopButton` threshold, scroll animation vs reduced motion |
| [`tests/schema-fixture.ts`](../tests/schema-fixture.ts) | **Compile-only** `ChecklistItem` fixture for `pnpm typecheck`; **not** picked up by Vitest `include` |

## Representative invariants

- **Baseline items**: every non-empty selection includes `exemption-general` plus the correct standard deduction card.
- **Exemption inputs**: single filing shows only filer age; married filing shows filer and spouse age. Required age bands must be selected before the exemption summary and tax scenarios calculate.
- **Married selection**: `standard-deduction-single` excluded when `married` selected.
- **Card removal**: remove action deletes only the target active card (non-removable cards excluded) and clears that card input data; removing interest income also removes linked savings-investment.
- **Add modal**: selected situations are omitted; after removing a related card, that situation becomes addable again.
- **Non-removable cards**: exemption, standard deduction, and savings-investment cards never render remove buttons.
- **Remove dialog copy**: title includes the item title (`確認移除此項目：...`); body uses item-aware copy (`將清除「{itemTitle}」已填寫的資料。`) and follow-up hint (`您可以隨時加回此項目`).
- **Categories**: order `gross_income` → `overseas_income` → `exemptions` → `general_deductions` → `special_deductions`; gross income source cards remain in salary → dividends → interest → other order.
- **Situations**: count **15 public situations**; every public `SituationId` has at least one checklist item; `SITUATION_GROUPS` union equals public ids, no duplicates, fixed subgroup ordering tests. Hidden derived `savings_investment` is tested through interest-income linkage.
- **Sources**: every item has `source_refs`, `why_it_matters`; `source_id` pattern; export markdown excludes internal fields like raw `source_id`.
- **AMT**: threshold **1_000_000** inclusive boundary; summary scenario tests cover the 7,500,000 basic-income deduction, 20% basic-tax rate, overseas-tax credit, and supplement.
- **Basic living expense difference**: tax scenario tests cover positive differences reducing taxable income; zero/negative differences remain floored at 0 by the existing baseline examples.
- **Itemized dependencies**:
  - Donations: qualified donations are capped at 20% of `grossIncomeAmount`; if the qualified amount is filled but gross income is missing, itemized line is treated as unfilled (`null`). When positive dividend income is present, inline feedback shows both merged-tax and 28% separate-tax 20% caps.
  - Mortgage interest: when `savings-investment-deduction` is enabled, mortgage interest subtracts the capped savings-investment deduction first; that deduction is derived from total interest income.
- **Income dependencies**:
  - Selector and add modal do not show savings-investment; selecting interest income auto-selects hidden savings-investment and shows the derived result card.
  - Salary requires explicit input for each participant; dividend/interest/other default blank to 0.
  - Clearing a non-self salary amount removes that row's filled marker and returns salary to an unfilled state.
  - With dividend income active, gross income display shows both merged-tax and 28% separate-tax totals, and summary scenarios pick the best dividend/couple/AMT result.
  - Scenario income reads only currently active income cards; stale hidden dividend or overseas inputs do not affect the summary after the related card is removed.
- **Inline cap copy contracts** (rendered via `DeductionCard` static markup tests):
  - Cap overflow copy is unified as `已達可申報上限 X 元` for all shared capped-field feedback paths.
  - Qualified donation empty-state hint no longer appends `綜合所得總額 20%`.
  - Qualified donation missing-gross prompt asserts the presence of both `請先填寫` and `綜合所得總額` (link text rendered as button content).
  - Mortgage-interest with savings-investment dependency uses dedicated copy:
    - `儲蓄投資特別扣除額` is rendered as link text (button) that scrolls to `savings-investment-deduction`.
    - Empty input: shows only `須先扣除「儲蓄投資特別扣除額」` (no cap prefix).
    - Filled input, post-deduction amount below cap: `扣除「儲蓄投資特別扣除額」後為 X 元`.
    - Filled input, post-deduction amount above cap: `扣除「儲蓄投資特別扣除額」後已達可申報上限 X 元`.

## Integration patterns

- React 19 `createRoot` + `act` from `react-dom/test-utils` or `react` test utils; `IS_REACT_ACT_ENVIRONMENT = true` where needed.
- Mock `window.scrollY`, `scrollTo`, `requestAnimationFrame` / `cancelAnimationFrame`, `matchMedia`, layout (`getBoundingClientRect`, `innerHeight`) for scroll tests.
- Static markup snapshots via `react-dom/server` `renderToStaticMarkup` for some component contracts.

## Commands

- `pnpm test` — single run
- `pnpm test:watch` — watch mode

## Related docs

- CI runs tests: [`14-ci-and-deploy.md`](./14-ci-and-deploy.md)
