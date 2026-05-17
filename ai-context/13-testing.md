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
| [`tests/checklist.test.ts`](../tests/checklist.test.ts) | Situation filtering, `groupByCategory`, content integrity, traceability UI, standard/itemized panel, export / `formatChecklistMarkdown` (unit cases), `DeductionCard` (including exemption native radios) |
| [`tests/exportChecklistFixtures.test.ts`](../tests/exportChecklistFixtures.test.ts) | `formatChecklistMarkdown` end-to-end via [`tests/fixtures/exportChecklist/`](../tests/fixtures/exportChecklist/) — **full** (married + dividend + overseas + AMT), **single**, **partial** (待填寫) |
| [`tests/situation-selection-storage.test.tsx`](../tests/situation-selection-storage.test.tsx) | Storage key with `BASE_URL`, load/save, App clear integration |
| [`tests/situation-single-source-flow.test.tsx`](../tests/situation-single-source-flow.test.tsx) | App flows: intro vs selecting when selection exists but not generated, add modal, scroll target, selection-driven add/remove, non-removable cards, remove dialog copy (`移除 {itemTitle}` title, `已填寫的資料將一併清除。`, last-card `因為這是最後一張項目，回到選擇頁時也會清除：免稅額。` when exemption had input), **last removable card** removes without dialog when target and exemption are empty, full reset after last removable card (selection + inputs + view state), tax summary dialogs (formula / rules / combinations), **試算規則** copy (五種計稅方式 list, 28% 分開計稅 prose, AMT threshold lines, 推薦 disclaimer, eTax `tax-saving-manual` footer link — not scenario formula dump), recommendation prefix only when multiple scenarios, AMT copy gated on overseas income, legacy key removal |
| [`tests/taxScenarios.test.ts`](../tests/taxScenarios.test.ts) | [`taxScenarios.ts`](../src/lib/taxScenarios.ts): `calcTaxScenarios`, `hasOverseasIncome` / `hasAmt`, AMT formula lines vs zero overseas income, official couple goldens |
| [`tests/back-to-top-button.test.tsx`](../tests/back-to-top-button.test.tsx) | `BackToTopButton` threshold, scroll animation vs reduced motion |
| [`tests/schema-fixture.ts`](../tests/schema-fixture.ts) | **Compile-only** `ChecklistItem` fixture for `pnpm typecheck`; **not** picked up by Vitest `include` |

## Representative invariants

- **Baseline items**: every non-empty selection includes `exemption-general` plus the correct standard deduction card.
- **Exemption inputs**: single filing shows only filer age; married filing shows filer and spouse age. Required age bands must be selected before the exemption summary and tax scenarios calculate. Static markup expects native **`<input type="radio">`**, **`name="exemption-general-{fieldId}"`**, `checked`, and focus-ring classes (`peer-focus-visible:ring-2`), not `role="radiogroup"` / `role="radio"`.
- **Married selection**: `standard-deduction-single` excluded when `married` selected.
- **Card removal**: remove action deletes only the target active card (non-removable cards excluded) and clears that card input data; removing interest income also removes linked savings-investment. Removing the **last** situation-driven removable card triggers a **full** `resetChecklistState`-class wipe: situation selection, card inputs, and checklist **view state** storage are cleared so a fresh checklist does not reuse prior exemption or other field values. **Confirm vs immediate**: if that wipe would clear **exemption-general** input already on disk, **`requiresConfirm`** is true and the remove dialog shows the extra **回到選擇頁時也會清除** line (today **`免稅額`**); if the removed card and exemption have no input, the last card is removed **without** opening the dialog.
- **Add modal**: selected situations are omitted; after removing a related card, that situation becomes addable again.
- **Non-removable cards**: exemption, standard deduction, and savings-investment cards never render remove buttons.
- **Remove dialog copy**: title **`移除 {itemTitle}`**; body **`已填寫的資料將一併清除。`** (plus interest-income savings-investment sentence when applicable); optional second paragraph when **`resetClearedItemTitles`** is set — **`因為這是最後一張項目，回到選擇頁時也會清除：`** + joined titles + **`。`**.
- **Categories**: order `gross_income` → `overseas_income` → `exemptions` → `general_deductions` → `special_deductions`; gross income source cards remain in salary → dividends → interest → other order.
- **Situations**: count **15 public situations**; every public `SituationId` has at least one checklist item; `SITUATION_GROUPS` union equals public ids, no duplicates, fixed subgroup ordering tests. Hidden derived `savings_investment` is tested through interest-income linkage.
- **Sources**: every item has `source_refs`, `why_it_matters`; `source_id` pattern; export markdown excludes internal fields like raw `source_id`.
- **Markdown export** (`formatChecklistMarkdown`):
  - Header uses **`本文件產生時間`** (not legacy `已選情境數` / `項目數` / `產生時間`).
  - **`## 填寫摘要`** matches sidebar rows; summary omits 基本生活費差額 and overseas 已繳國外稅額.
  - **`## 試算結果`**: 推薦組合 + 應繳納稅額; no “second-best savings” line; pending copy when not computable.
  - **`## 所有申報組合`**: scenarios sorted by `finalTax` asc; **`★ 推薦`** only when multiple scenarios; per-scenario **計算過程**; 配偶計稅方式 / 股利申報方式 rows when applicable.
  - Site banner/footer from `checklistCardCopy`; privacy blockquote (瀏覽器中產生 / 請自行保管).
  - Partial fixture: **`待填寫`**, no 所有申報組合 when tax not computable.
- **AMT**: threshold **1_000_000** inclusive boundary; summary scenario tests cover the 7,500,000 basic-income deduction, 20% basic-tax rate, overseas-tax credit, and supplement. **Combinations dialog** header never shows **AMT**; with positive overseas income, **AMT** appears only after expanding a scenario row (`ScenarioFormulaSections`, **AMT 計算**). `taxScenarios` tests assert `hasOverseasIncome` / `hasAmt`, `formulaSections`, and derived `formulas` (flat rows via **`deriveFormulaLinesFromSections`**).
- **Basic living expense difference**: tax scenario tests cover positive differences reducing taxable income; zero/negative differences remain floored at 0 by the existing baseline examples.
- **Itemized dependencies**:
  - Donations: qualified donations are capped at 20% of `grossIncomeAmount`; if the qualified amount is filled but gross income is missing, itemized line is treated as unfilled (`null`). When positive dividend income is present, inline feedback shows both merged-tax and 28% separate-tax 20% caps.
  - Mortgage interest: when `savings-investment-deduction` is enabled, mortgage interest subtracts the capped savings-investment deduction first; that deduction is derived from total interest income.
- **Income dependencies**:
  - Selector and add modal do not show savings-investment; selecting interest income auto-selects hidden savings-investment and shows the derived result card.
  - Salary requires explicit input for each participant; dividend/interest/other default blank to 0.
  - Clearing a non-self salary amount removes that row's filled marker and returns salary to an unfilled state.
  - With dividend income active, gross income display shows both merged-tax and 28% separate-tax totals, and summary scenarios pick the best dividend/couple/AMT result. Short dividend labels in the summary UI use **股利合併計稅** / **股利分開計稅** (not legacy「並扣抵」/「28%」button copy). **「推薦：」** prefix appears only when there is more than one tax scenario; single-scenario cases still show the filing label without that prefix.
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
