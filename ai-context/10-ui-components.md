# UI components

All under [`src/components/`](../src/components/) unless noted. User-visible strings are **zh-TW** in source.

## `SiteHeader.tsx`

```ts
interface Props { currentFeatureId: string }
```

- Sticky header: brand from [`SITE_CONFIG`](../src/lib/siteConfig.ts), optional [`DeployBadge`](../src/components/DeployBadge.tsx) when [`getDeployInfo()`](../src/lib/deployInfo.ts) non-null.
- Nav from `NAV_ITEMS`: `active` → link or current marker; `coming-soon` → [`ComingSoonNavItem`](../src/components/ComingSoonNavItem.tsx).
- Mobile menu: `aria-expanded`, Escape to close, `body` overflow lock while open.

## `SiteFooter.tsx`

No props. Footer copy, optional coffee/issue links (hidden when URLs empty in `SITE_CONFIG`), `officialLinks`, copyright / tax year lines, optional deploy line.

## `SituationSelector.tsx`

```ts
interface Props {
  groups: SituationGroup[]
  situations: Situation[]
  selected: SituationId[]
  onToggle: (id: SituationId) => void
  onClear: () => void
  onGenerate: () => void
}
```

- Toggle buttons `aria-pressed`. Clear button: `data-testid="clear-situation-selection"`.
- Generate disabled when no selection.

## `ChecklistResult.tsx`

Exported types: `RemovalImpactPreview`, `AddableSituationGroup`.

```ts
interface Props {
  groups: CategoryGroup[]
  totalSelected: number
  selectedSituations: SituationId[]
  itemSourceSituationLabelsById?: Record<string, string[]>
  addableSituationGroups?: AddableSituationGroup[]
  cardInputMap: CardInputMap
  pendingRemovalImpact?: RemovalImpactPreview | null
  onCardInputChange: (itemId: string, fieldId: string, value: string) => void
  onReset?: () => void
  onAddSituations?: (ids: SituationId[]) => void
  onRemoveItem?: (itemId: string) => void
  onCancelRemoveItem?: () => void
  onConfirmRemoveItem?: () => void
  scrollToItemId?: string | null
  onScrollHandled?: () => void
}
```

- Root uses `print-container` for print layout.
- Layout: `max-w-5xl` with `lg:grid lg:grid-cols-[1fr_360px]` — main checklist column left, `TaxSummaryPanel` sticky sidebar right (desktop only; `no-print`).
- Embeds per-category cards, add-situation modal, remove confirmation dialog, export block (markdown copy/download, `window.print()`).
- Add-situation modal lists situations not currently present in `selected`; savings-investment is disabled and linked to interest income.
- Card routing: regular income card ids (`gross-income`, `dividend-income`, `interest-income`, `other-income`) → `IncomeCard`; `savings-investment-deduction` → derived read-only card; all others → `DeductionCard`.
- Non-removable cards at UI layer: `exemption-general`, `standard-deduction-single`, `standard-deduction-married`, `savings-investment-deduction` (no `×` button).
- Result cards are derived from `filterBySituations(CHECKLIST_ITEMS, selected)`.
- Remove dialog is single-card scoped. Copy contract:
  - Title: `確認移除此項目：{itemTitle}`
  - Body:
    - `將清除「{itemTitle}」已填寫的資料。`
    - `您可以隨時加回此項目`
- Computes income totals from shared income participants and active regular income cards. Salary uses net salary after modeled 薪資所得特別扣除額; dividend/interest/other use raw amounts.
- When dividends are active, the gross section renders both merged-tax and 28% separate-tax totals and passes `null` to `TaxSummaryPanel` for gross income.
- **`onReset`**: wired to the "重新計算" confirmation dialog.
- Scroll-to-item: `useEffect` on `scrollToItemId` → [`animateScrollToY`](../src/lib/scrollAnimation.ts) to center card in viewport → `onScrollHandled`.
- Overlays: `no-print` where appropriate.

## Checklist card shell (`ChecklistCardShell.tsx`)

Shared layout for checklist result cards: title, `why_it_matters`, eligibility, documents, **`children`** (form or custom body), then footer `border-t` with optional wealth-clause notice when `item.show_wealth_clause_notice`, and collapsible sources. Root: `print-card`, `data-testid="checklist-card-${item.id}"`.

## `DeductionCard.tsx`

```ts
interface Props {
  item: ChecklistItem
  inlineFields?: CardInlineField[]
  inputValues?: Record<string, string>
  sourceSituationLabels?: string[]
  removable?: boolean
  onInputChange?: (fieldId: string, value: string) => void
  onRemove?: () => void
}
```

- Composes [`ChecklistCardShell`](../src/components/checklist/ChecklistCardShell.tsx); **`children`** = [`ChecklistInlineAmountFields`](../src/components/checklist/ChecklistInlineAmountFields.tsx) when `inlineFields` non-empty (optional amounts + `capKey` feedback via `getNumber`).
- Exemption age bands (`exemption-general`): each choice row uses a native **`<input type="radio">`** inside **`<fieldset>`** / **`<legend class="sr-only">`**, paired **`<label>`**, and a visible circular indicator (focus ring via `peer-focus-visible:*`). `data-testid` values remain on the inputs (e.g. `card-choice-exemption-general-{fieldId}-{value}`); `name` groups radios per field (`exemption-general-self_age_band`, etc.).
- `feedbackContext` is forwarded to `ChecklistInlineAmountFields` for contextual rule rendering. Current contextual hooks include:
  - `qualified-donation` without gross income: inline prompt `請先填寫 綜合所得總額` with clickable jump to the same `gross_income` section target used by summary "Go fill".
  - `qualified-donation` with gross income but empty value: hint is plain cap copy (`可申報上限為 X 元`) without trailing `20%` suffix text.
  - Any capped amount above cap uses unified red copy: `已達可申報上限 X 元` (shared `CapFeedback` path, not card-specific overrides).
  - `mortgage-interest` with savings-investment dependency uses a dedicated branch:
    - The term `儲蓄投資特別扣除額` is rendered as a clickable inline link to the `savings-investment-deduction` card.
    - Empty value + savings enabled: only `須先扣除「儲蓄投資特別扣除額」`.
    - Filled value + eligible amount (`input - savings`) below cap: `扣除「儲蓄投資特別扣除額」後為 X 元`.
    - Filled value + eligible amount above cap: `扣除「儲蓄投資特別扣除額」後已達可申報上限 X 元`.
- Remove control `no-print` on remove button.

## `IncomeCard.tsx`

```ts
interface Props {
  item: ChecklistItem
  config: IncomeCardConfig
  inputValues: Record<string, string>
  participants: IncomeParticipant[]
  sourceSituationLabels?: string[]
  removable?: boolean
  onInputChange: (fieldId: string, value: string) => void
  onParticipantsChange: (participants: IncomeParticipant[], removedId?: string) => void
  onRemove?: () => void
}
```

- Shared regular-income card for salary, dividend, interest, and other income.
- Multi-person income inputs: self (fixed), spouse (from married filing), extra persons (add/remove/rename).
- Participant names are shared through `income-participants`; per-card amounts use `self_income` and per-card `persons_json`.
- Add/remove/rename participant from any income card updates all regular income cards. Removing a participant also prunes that person's amount rows from every regular income card.
- Salary rows show 薪資所得特別扣除額 and net 薪資所得; salary requires explicit input for every participant. Dividend/interest/other default blank to 0.
- Composes same [`ChecklistCardShell`](../src/components/checklist/ChecklistCardShell.tsx) (eligibility and shared footer).
- Calculation logic: [`src/lib/grossIncome.ts`](../src/lib/grossIncome.ts).

## `TaxSummaryPanel.tsx`

```ts
interface Props {
  grossIncome: number | null
  grossIncomePendingCalculation?: boolean
  taxScenarioResult?: TaxScenarioResult | null
  hasOverseasIncomeSection?: boolean // navigational row only (—), between gross and exemptions
  exemptionAmount: number | null
  generalDeductionAmount: number | null // null when itemized checklist lines exist but not all filled
  specialDeductionAmount: number | null
  hasSpecialDeductions: boolean
  onScrollToSection?: (categoryId: string) => void
}
```

- Sticky right-sidebar panel in `ChecklistResult` (desktop, `lg:sticky lg:top-6`, `no-print`).
- Rows: 綜合所得總額、（選）海外所得連結至 `#overseas_income`、免稅額、一般扣除額、（選）特別扣除額；所得淨額與應納稅額試算。
- `exemptionAmount === null` means the required filer/spouse age band is missing, so the row shows「前往填寫」and tax scenarios stay pending.
- When `taxScenarioResult` is present, shows the best filing/dividend combination, payable tax, and **「推薦：…」only when `taxScenarioResult.scenarios.length > 1`** (single-scenario cases omit the recommendation prefix). Sidebar AMT helper copy appears only when overseas income is positive (domain: `taxScenarioResult.hasOverseasIncome` from [`taxScenarios.ts`](../src/lib/taxScenarios.ts)).
- **Dialogs** (internal; `createPortal` to `document.body`):
  - **`TaxFormulaDialog`** (`data-testid="tax-formula-dialog"`): title **「所得稅應納稅額」公式** — static copy for 所得淨額 / 應納稅額 definitions plus the progressive **bracket table** from `getBrackets()`. Does **not** list per-scenario formulas.
  - **`ScenarioRulesDialog`** (`scenario-rules-dialog`): title **試算規則** — prose sections (夫妻申報組合、五種計稅方式、扣除額分配、股利與 AMT、排序與推薦免責).
  - **`TaxScenarioCombinationsDialog`** (`tax-scenario-combinations-dialog`): title **稅額組合試算明細** — sortable table of all scenarios from `calcTaxScenarios`; expandable rows show **`FormulaTable`** per scenario. Intro copy mentions AMT ordering only when **`taxScenarioResult.hasOverseasIncome`** is true. Links inside open **試算規則** or the **bracket formula** dialog. Best row is highlighted; expanded rows show **`StructureHint`**: 所得淨額 includes **基本生活費差額**; **一般稅額** line reflects dividend mode (merged: 應納稅額 − 股利可抵減稅額; separate: 應納稅額 + 股利分開計稅稅額; none: 應納稅額). **「最終稅額 = 一般稅額 + AMT 補稅」** appears in the hint only when **`includeAmt`** is true (combinations dialog passes **`taxScenarioResult.hasOverseasIncome`**). Scenario **假設** footer renders only when `scenario.assumptions.length > 0`.
- **「了解更多」** (print mode off): with **no** `taxScenarioResult`, opens **`TaxFormulaDialog`** only. With `taxScenarioResult`, the primary link opens **`TaxScenarioCombinationsDialog`** (not the bracket dialog).
- **Dividend labels** in UI align with `taxScenarios` titles, e.g. **股利合併計稅**, **股利分開計稅** (no separate "28%" in the short label string).
- `generalDeductionAmount === null` → that row shows「前往填寫」捲動至 `general_deductions`，且所得淨額／應納稅額為「待計算」（與其他必填列一致）。
- Effective general deduction logic: [`src/lib/generalDeductionEffective.ts`](../src/lib/generalDeductionEffective.ts) (`resolveGeneralDeduction`) using an itemized calc context derived in [`ChecklistResult.tsx`](../src/components/ChecklistResult.tsx) (e.g. `grossIncomeAmount`, dividend merged/separate gross totals for qualified-donation feedback, `savingsInvestmentDeductionAmount`).

## `BackToTopButton.tsx`

No props. Fixed FAB; visible when `scrollY > 240`; `aria-label` for scroll-to-top; uses `animateScrollToY(0)`; `no-print`.

## `ComingSoonNavItem.tsx`

```ts
interface Props { item: NavItem; block?: boolean }
```

- `aria-disabled`, `tabIndex={-1}`.

## `DeployBadge.tsx`

```ts
interface Props { deployInfo: DeployInfo }
```

- Styles by `deployInfo.context` (`dev` | `pr-preview`); optional `title` with commit detail.

## Related docs

- App wiring: [`07-app-flow-and-state.md`](./07-app-flow-and-state.md)
- Scroll helper: [`12-styling-and-print.md`](./12-styling-and-print.md) (motion)
