# Checklist engine

Source: [`src/lib/checklist.ts`](../src/lib/checklist.ts).

## `filterBySituations(items, selected)`

```ts
export function filterBySituations(items: ChecklistItem[], selected: SituationId[]): ChecklistItem[]
```

- Empty `selected` → `[]`.
- Otherwise, return result-page baseline items plus situation-matched items.
- Baseline items:
  - always include `exemption-general`
  - include `standard-deduction-married` when `married` is selected
  - otherwise include `standard-deduction-single`
- Non-baseline items match when `item.situations.some(s => selected.includes(s))`.
- Baseline item content uses `situations: []`; the engine derives all result cards from `selected`.
- `src/lib/checklist.ts` itself is intentionally pure and does not enforce cross-situation links. `App.tsx` normalizes `interest_income` ↔ hidden `savings_investment` before calling the engine, so the savings-investment card is present whenever interest income is active even though it is not publicly selectable.

## `CATEGORY_ORDER` / `CATEGORY_LABELS`

Fixed category sort order:

1. `gross_income`
2. `overseas_income` (AMT / overseas-income-amt card only)
3. `exemptions`
4. `general_deductions`
5. `special_deductions`

`CATEGORY_LABELS` maps each `CategoryId` to zh-TW section titles (includes note that standard vs itemized are mutually exclusive in `general_deductions`).

## `groupByCategory(items)`

```ts
export function groupByCategory(items: ChecklistItem[]): CategoryGroup[]
```

- Buckets by `item.category`, then sorts buckets by `CATEGORY_ORDER`.
- Returns `{ category, label, items }[]`.
- **Within each bucket**, item order follows the order items appear in the input array (typically `CHECKLIST_ITEMS` order after filtering).
- Current `gross_income` item order is salary → dividend → interest → other; `overseas-income-amt` is under `overseas_income`.

## `CategoryGroup`

```ts
export interface CategoryGroup {
  category: CategoryId
  label: string
  items: ChecklistItem[]
}
```

## Related docs

- Content IDs: [`06-content-modules.md`](./06-content-modules.md)
- App wiring: [`07-app-flow-and-state.md`](./07-app-flow-and-state.md)
- Tests: [`13-testing.md`](./13-testing.md)
