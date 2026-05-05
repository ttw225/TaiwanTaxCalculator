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
- Layout: `max-w-4xl` with `lg:grid lg:grid-cols-[1fr_260px]` — main checklist column left, `TaxSummaryPanel` sticky sidebar right (desktop only; `no-print`).
- Embeds `DecisionToolsPanel`, per-category cards, add-situation modal, remove confirmation dialog, export block (markdown copy/download, `window.print()`).
- Card routing: `item.id === 'gross-income'` → renders `GrossIncomeCard`; all others → `DeductionCard`.
- Computes `grossIncomeTotal` via `useMemo` from `cardInputMap['gross-income']` + `parseGrossIncomePersons` + `calcTotalGrossIncome`.
- `gross_income` section header shows `grossIncomeTotal` inline when > 0.
- **`onReset`**: declared on props but **not used** in component body (reserved / dead API until wired).
- Scroll-to-item: `useEffect` on `scrollToItemId` → [`animateScrollToY`](../src/lib/scrollAnimation.ts) to center card in viewport → `onScrollHandled`.
- Overlays / tool panel: `no-print` where appropriate.

## Checklist card shell (`ChecklistCardShell.tsx`)

Shared layout for checklist result cards: title, `why_it_matters`, situation labels, eligibility, documents, limitations, **`children`** (form or custom body), then footer `border-t` with `next_action`, optional wealth-clause notice when `item.show_wealth_clause_notice`, and collapsible sources. Root: `print-card`, `data-testid="checklist-card-${item.id}"`.

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
- Remove control `no-print` on remove button.

## `GrossIncomeCard.tsx`

```ts
interface Props {
  item: ChecklistItem
  inputValues: Record<string, string>
  isMarriedFiling: boolean
  sourceSituationLabels?: string[]
  removable?: boolean
  onInputChange: (fieldId: string, value: string) => void
  onRemove?: () => void
}
```

- Specialized card for item `id: 'gross-income'` (category `gross_income`).
- Multi-person income inputs: self (固定), spouse (when `isMarriedFiling`), extra persons (add/remove).
- State encoded in two `CardInputMap` fields: `self_income` (string number) and `persons_json` (JSON array of `GrossIncomePerson` excluding self).
- Add/remove/update person: serializes full array to `persons_json` in a single `onInputChange` call (avoids debounce race).
- Per-person feedback: shows 薪資所得特別扣除額 and net 薪資所得.
- Composes same [`ChecklistCardShell`](../src/components/checklist/ChecklistCardShell.tsx) (eligibility, limitations from content, shared footer).
- **`children`**: multi-person income UI, add-person control, privacy line, then in-card `綜合所得總額` breakdown (`data-testid="gross-income-total"`).
- Source situation labels: `data-testid="card-source-situations-gross-income"` (from shell).
- Calculation logic: [`src/lib/grossIncome.ts`](../src/lib/grossIncome.ts).

## `TaxSummaryPanel.tsx`

```ts
interface Props {
  grossIncome: number | null
  exemptionAmount: number | null
  generalDeductionAmount: number | null // null when itemized checklist lines exist but not all filled
  specialDeductionAmount: number | null
  hasSpecialDeductions: boolean
  onScrollToSection?: (categoryId: string) => void
}
```

- Sticky right-sidebar panel in `ChecklistResult` (desktop, `lg:sticky lg:top-6`, `no-print`).
- Rows: 綜合所得總額、免稅額、一般扣除額、（選）特別扣除額；所得淨額與應納稅額試算。
- `generalDeductionAmount === null` → that row shows「前往填寫」捲動至 `general_deductions`，且所得淨額／應納稅額為「待計算」（與其他必填列一致）。
- Effective general deduction logic: [`src/lib/generalDeductionEffective.ts`](../src/lib/generalDeductionEffective.ts) (`resolveGeneralDeduction`).

## `DecisionToolsPanel.tsx`

```ts
interface Props { selectedSituations: SituationId[] }
```

- Returns `null` if no tool matches.
- Collapsible amber panel; privacy copy.

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

## `src/components/tools/`

| File | Role |
|------|------|
| `DividendTool.tsx` | State for amount + marginal bracket select; calls `calcDividendOptions` |
| `CoupleFilingTool.tsx` | Two salary strings; `calcCoupleFilingOptions` |
| `AmtTool.tsx` | Overseas income string; `checkAmtThreshold`; lists `AMT_CHECKLIST_STEPS` |
| `ToolSourceRefs.tsx` | `props: { refs: SourceRef[] }` collapsible source list |

## Related docs

- App wiring: [`07-app-flow-and-state.md`](./07-app-flow-and-state.md)
- Scroll helper: [`12-styling-and-print.md`](./12-styling-and-print.md) (motion)
