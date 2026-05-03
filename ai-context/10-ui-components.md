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
- Embeds `DecisionToolsPanel`, per-category `DeductionCard`s, add-situation modal, remove confirmation dialog, export block (markdown copy/download, `window.print()`).
- **`onReset`**: declared on props but **not used** in component body (reserved / dead API until wired).
- Scroll-to-item: `useEffect` on `scrollToItemId` → [`animateScrollToY`](../src/lib/scrollAnimation.ts) to center card in viewport → `onScrollHandled`.
- Overlays / tool panel: `no-print` where appropriate.

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

- Wrapper class `print-card`. Remove control `no-print`.
- Optional inline numeric fields; if `capKey` set, compares parsed amount to `getNumber(capKey)` for green/orange feedback.
- Collapsible sources `<details>`.

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
