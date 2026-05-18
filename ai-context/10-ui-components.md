# UI components

All under [`src/components/`](../src/components/) unless noted. Route modules under [`src/pages/`](../src/pages/) export React Router `meta()` / `links()` for SEO. User-visible strings are **zh-TW** in source.

## Route pages (`src/pages/`)

| Module | Role |
|--------|------|
| [`HomePage.tsx`](../src/pages/HomePage.tsx) | Landing + `IntroPage`; `meta()` WebApplication JSON-LD; hero preload + idle route prefetch (see [`07-app-flow-and-state.md`](./07-app-flow-and-state.md)) |
| [`ChecklistStartPage.tsx`](../src/pages/ChecklistStartPage.tsx) / [`ChecklistPage.tsx`](../src/pages/ChecklistPage.tsx) | Thin wrappers mounting `ChecklistFlow` at `/checklist/start` and `/checklist` |
| [`ChecklistFlow.tsx`](../src/pages/ChecklistFlow.tsx) | Shared checklist state machine (formerly monolithic `App.tsx`) |
| [`SiteLayout.tsx`](../src/pages/SiteLayout.tsx) | Header/footer shell for content routes |
| [`AboutPage.tsx`](../src/pages/AboutPage.tsx), [`MethodologyPage.tsx`](../src/pages/MethodologyPage.tsx) | Static content; `meta()` + JSON-LD (`AboutPage`, `TechArticle`) |
| [`DeductionDetailPage.tsx`](../src/pages/DeductionDetailPage.tsx) | `/deductions/:slug`; Article + BreadcrumbList JSON-LD |
| [`NotFoundPage.tsx`](../src/pages/NotFoundPage.tsx) | `/404` and splat; `robots: noindex` |

## `IntroPage.tsx`

```ts
interface Props { onStart: () => void }
```

- Marketing walkthrough with step screenshots. Images use [`introImages.ts`](../src/lib/introImages.ts) + `<picture>` with **AVIF → WebP → PNG** sources and intrinsic `width`/`height` to limit CLS.
- Hero uses [`homeHeroImage.ts`](../src/lib/homeHeroImage.ts) constants in a WebP-first `<picture>` with `fetchPriority="high"` and `loading="eager"`. Do not point the homepage hero back to `Hero.svg`; Safari can render its embedded AVIF black after client navigation.

## `ModalOverlay.tsx` / `useModalDismiss.ts` (`src/components/ui/`)

Shared modal backdrop wrapper for in-app dialogs.

```ts
interface ModalOverlayProps extends HTMLAttributes<HTMLDivElement> {
  onDismiss: () => void
  dismissEnabled?: boolean
  children: ReactNode
}
```

- **Dismiss**: × / footer buttons (per dialog), **Escape** (`useModalDismiss`), and **click on the dimmed overlay** (`e.target === e.currentTarget`).
- **Nested modals**: module-level layer stack — only the topmost layer handles Escape (e.g. `TaxFormulaDialog` over `TaxScenarioCombinationsDialog`).
- **Confirm dialogs** (`RemoveImpactDialog`, `ResetConfirmDialog`): Escape / backdrop call **`onCancel`**, not confirm.
- Used by `IncomeCard` `NameDialog`, `TaxSummaryPanel` portals, and `ChecklistResult` modals.

## `SiteHeader.tsx`

```ts
interface Props { currentFeatureId: string }
```

- Sticky header: brand from [`SITE_CONFIG`](../src/lib/siteConfig.ts), optional [`DeployBadge`](../src/components/DeployBadge.tsx) when [`getDeployInfo()`](../src/lib/deployInfo.ts) non-null.
- Nav from `NAV_ITEMS`: `active` → link or current marker; `coming-soon` → [`ComingSoonNavItem`](../src/components/ComingSoonNavItem.tsx).
- Mobile menu: `aria-expanded`, Escape to close, `body` overflow lock while open.

## `SiteFooter.tsx`

No props. Root: `site-footer` with `print-footer-content` wrapper.

- **Layout**: 2-column grid on `lg` (single column on small screens). **Left**: **關於本站** (intro, tax year / last-updated lines), **申報提醒** (disclaimer + `officialLinks` as text links with `ExternalLink` icon). **Right**: **意見回報** (Google form + GitHub issue as pill buttons), **支持我們** (Buy me a coffee pill).
- **Links**: `googleFormUrl`, `githubNewIssueUrl`, `buyMeCoffeeUrl` from [`SITE_CONFIG`](../src/lib/siteConfig.ts). Empty URL → disabled `span` placeholder (same pill styling, `aria-disabled`, `cursor-not-allowed`). Non-empty → `rounded-full` pill anchors (`bg-slate-50 border border-slate-200`).
- **Bottom bar**: copyright (`© {dataYear} {name} · {nameEn}`), optional [`DeployBadge`](../src/components/DeployBadge.tsx) detail via `getDeployInfo()`.
- **Markdown parity**: section order and copy align with [`checklistExportSiteFooter()`](../src/lib/checklistCardCopy.ts) in exports (關於本站 → 申報提醒 → 意見回報 → 支持我們).

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
interface RemovalImpactPreview {
  itemId: string
  itemTitle: string
  hasInputLoss: boolean
  resetClearedItemTitles?: string[]
}

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
- Embeds per-category cards, add-situation modal, remove confirmation dialog, export block (markdown copy/download via [`formatChecklistMarkdown`](../src/lib/exportChecklist.ts), `window.print()`). Modals use [`ModalOverlay`](../src/components/ui/ModalOverlay.tsx) (Escape + backdrop dismiss).
- **Print dual-track**: interactive [`TaxSummaryPanel`](../src/components/TaxSummaryPanel.tsx) stays in the right sidebar (`no-print`). After the usage-reminder card, a **`print-only print-tax-summary-stack`** block renders a second `TaxSummaryPanel` with `printMode` plus [`PrintScenarioCombinations`](../src/components/TaxSummaryPanel.tsx) so PDF/print includes 填寫摘要, 試算結果, and **all** tax scenarios with per-scenario formula sections. Keep props in sync when changing summary behavior.
- Add-situation modal lists situations not currently present in `selected`; savings-investment is disabled and linked to interest income.
- Card routing: regular income card ids (`gross-income`, `dividend-income`, `interest-income`, `other-income`) → `IncomeCard`; `savings-investment-deduction` → derived read-only card; all others → `DeductionCard`.
- Non-removable cards at UI layer: `exemption-general`, `standard-deduction-single`, `standard-deduction-married`, `savings-investment-deduction` (no `×` button).
- Result cards are derived from `filterBySituations(CHECKLIST_ITEMS, selected)`.
- **Remove dialog** (`RemoveImpactDialog`, `pendingRemovalImpact`): single-card scoped; preview shape **`RemovalImpactPreview`** (see code block above). Optional **`resetClearedItemTitles`** lists human-readable baseline cards whose saved input would be cleared by a **full reset** when this removal empties `selected` (today only **`免稅額`** when `exemption-general` has any non-empty field).
  - Title: **`移除 {itemTitle}`**
  - Body line 1: **`已填寫的資料將一併清除。`** plus, for `interest-income` only, **`儲蓄投資特別扣除額卡片會一同移除。`**
  - When **`resetClearedItemTitles`** is non-empty: second paragraph **`因為這是最後一張項目，回到選擇頁時也會清除：`** then titles joined with **`、`**, ending **`。`** (e.g. **`免稅額`** when exemption age bands were filled).
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

- Composes [`ChecklistCardShell`](../src/components/checklist/ChecklistCardShell.tsx); **`children`** = [`ChecklistInlineAmountFields`](../src/components/checklist/ChecklistInlineAmountFields.tsx) when `inlineFields` non-empty (optional amounts + `capKey` feedback via `getNumber`). Number inputs use `onWheel` → `blurOnWheel` so scroll wheel does not change values while focused.
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
- Amount inputs: `onWheel` → `blurOnWheel` (same as `ChecklistInlineAmountFields`).

## `TaxSummaryPanel.tsx` / `PrintScenarioCombinations`

```ts
interface Props {
  grossIncome: number | null
  overseasIncomeAmount: number
  grossIncomePendingCalculation?: boolean
  taxScenarioResult?: TaxScenarioResult | null
  hasOverseasIncomeSection?: boolean // navigational row only (—), between gross and exemptions
  exemptionAmount: number | null
  generalDeductionAmount: number | null // null when itemized checklist lines exist but not all filled
  generalDeductionMethod?: 'standard' | 'itemized' | null
  specialDeductionAmount: number | null
  basicLivingExpenseDifference: number | null
  hasSpecialDeductions: boolean
  onScrollToSection?: (categoryId: string) => void
  printMode?: boolean
}
```

- Sticky right-sidebar panel in `ChecklistResult` (desktop, `lg:sticky lg:top-6`, `no-print`) unless rendered inside the `print-only` stack with `printMode`.
- `printMode`: wraps summary cards in `print-tax-summary-cards`; does not mount scenario/formula/rules dialogs; **試算結果** card omits the button that opens **所有稅額組合**.
- Rows: 綜合所得總額、（選）海外所得連結至 `#overseas_income`、免稅額、一般扣除額、（選）特別扣除額；所得淨額與應納稅額試算。
- `exemptionAmount === null` means the required filer/spouse age band is missing, so the row shows「前往填寫」and tax scenarios stay pending.
- When `taxScenarioResult` is present, shows the best filing/dividend combination, payable tax, and **「推薦：…」only when `taxScenarioResult.scenarios.length > 1`** (single-scenario cases omit the recommendation prefix). Sidebar AMT helper copy appears only when overseas income is positive (domain: `taxScenarioResult.hasOverseasIncome` from [`taxScenarios.ts`](../src/lib/taxScenarios.ts)).
- **Dialogs** (internal; `createPortal` to `document.body`; overlay via [`ModalOverlay`](../src/components/ui/ModalOverlay.tsx) — Escape and backdrop dismiss, nested Escape closes top layer only):
  - **`TaxFormulaDialog`** (`data-testid="tax-formula-dialog"`): title **「稅率級距」** — static copy for 所得淨額 / 應納稅額 definitions plus the progressive **bracket table** from `getBrackets()`. Does **not** list per-scenario formulas.
  - **`ScenarioRulesDialog`** (`scenario-rules-dialog`): title **試算規則**. Top-level sections: **配偶申報組合** (intro copy plus nested **五種計稅方式** as a numbered list and **扣除額分配**); **股利所得** (merged vs **28%** separate-tax option in prose); **海外所得 AMT** (threshold-oriented prose: overseas aggregate **100** 萬元以上 feeds「基本所得額」; basic amount over **750** 萬元 may trigger AMT); **排序與推薦**. Footer line **配偶計稅方式說明整理自** + anchor text **財政部稅務入口網** linking the eTax `tax-saving-manual` path on `etax.nat.gov.tw`. No embedded scenario formula tables.
  - **`TaxScenarioCombinationsDialog`** (`tax-scenario-combinations-dialog`): title **所有稅額組合** — intro explains scenario count and links to **試算規則** / **稅率級距**; no AMT prose in the header. Sortable table; row `data-testid` **`scenario-row-{scenario.id}`**; expandable rows render **`ScenarioFormulaSections`** from `scenario.formulaSections` (operands, cap/floor tags, take-min cards; AMT in **AMT 計算** when applicable). **配偶計稅方式** column only when any non-single scenario exists. Best row highlighted. Scenario **假設** footer when `scenario.assumptions.length > 0`.
- **Summary → detail**: when `taxScenarioResult` is present, full-width **查看所有稅額組合** opens **`TaxScenarioCombinationsDialog`**; **稅率級距** opens **`TaxFormulaDialog`** from inside that dialog (no summary teaser or bracket shortcut when scenarios are absent).
- **Dividend labels** in UI align with `taxScenarios` titles, e.g. **股利合併計稅**, **股利分開計稅** (no separate "28%" in the short label string). Short couple/dividend labels for print and export come from [`scenarioLabels.ts`](../src/lib/scenarioLabels.ts) (`COUPLE_LABEL_MAP`, `COUPLE_TYPE_MAP`, `DIVIDEND_LABEL_MAP`, `displayScenarioTitle`).
- `generalDeductionAmount === null` → that row shows「前往填寫」捲動至 `general_deductions`，且所得淨額／應納稅額為「待計算」（與其他必填列一致）。
- Effective general deduction logic: [`src/lib/generalDeductionEffective.ts`](../src/lib/generalDeductionEffective.ts) (`resolveGeneralDeduction`) using an itemized calc context derived in [`ChecklistResult.tsx`](../src/components/ChecklistResult.tsx) (e.g. `grossIncomeAmount`, dividend merged/separate gross totals for qualified-donation feedback, `savingsInvestmentDeductionAmount`).

### `PrintScenarioCombinations`

```ts
{ scenarioResult: TaxScenarioResult }
```

- Rendered only in the `print-only` stack when `taxScenarioResult.scenarios.length > 0`.
- Card: `print-summary-card print-scenarios-card`; title **所有稅額組合（共 N 種）**.
- Scenarios ordered: best first, then others by `finalTax` ascending. Each block: `data-testid="print-scenario-{scenario.id}"`, couple/dividend labels from `scenarioLabels`, **推薦** badge only when `hasMultipleScenarios`, expandable **`ScenarioFormulaSections`** with `testidPrefix="print-scenario"`.
- Optional amber disclaimer when any scenario has `assumptions.length > 0` (separate-filing savings-investment caveat).

## `exportChecklist.ts` (`formatChecklistMarkdown`)

```ts
interface ExportInput {
  groups: CategoryGroup[]
  cardInputMap: CardInputMap
  isMarriedFiling: boolean
  totalSelected: number
  exportTime: string
}
```

- Entry: **`formatChecklistMarkdown(input)`** — builds a single Markdown string for copy/download in `ChecklistResult`.
- **Mirrors** summary/tax derivation in [`ChecklistResult.tsx`](../src/components/ChecklistResult.tsx) (comments in source mark parity); uses [`taxScenarios.ts`](../src/lib/taxScenarios.ts) for scenarios and formula sections.
- **Output order**:
  1. [`checklistExportSiteHeader()`](../src/lib/checklistCardCopy.ts) — site name, EN name, year, tagline
  2. [`checklistExportMarkdownHeader()`](../src/lib/checklistCardCopy.ts) — H1 + usage reminder (includes `CHECKLIST_USAGE_REMINDER_COMPLEX_ITEMS`)
  3. Selection count line + **`本文件產生時間`**
  4. **`## 填寫摘要`** — aligned with sidebar (overseas row: amount only, no foreign tax paid; no 基本生活費差額)
  5. **`## 試算結果`** — 推薦組合 + 應繳納稅額, or pending message when not computable
  6. Category sections (`gross_income` → … → `special_deductions`) with per-person salary, dual dividend gross totals, itemized/special line items
  7. **`## 所有申報組合`** when scenarios exist — sorted by `finalTax` asc; **`★ 推薦`** on first row when multiple; **計算過程** from `formulaSections`; conditional 配偶計稅方式 / 股利申報方式 rows
  8. [`checklistExportSiteFooter()`](../src/lib/checklistCardCopy.ts) + local-generation privacy blockquote
- Placeholder for missing amounts: **`待填寫`**. Does not emit raw `source_id` or other internal fields.
- Alias: `ExportOptions` = `ExportInput` (legacy export name).

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
