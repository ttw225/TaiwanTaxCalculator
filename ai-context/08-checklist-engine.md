# Checklist engine

Source: [`src/lib/checklist.ts`](../src/lib/checklist.ts).

## `applyPublicationGate(items)`

```ts
export function applyPublicationGate(items: ChecklistItem[]): ChecklistItem[]
```

- Drops items where `verification_status === 'unverified'`.
- Used in [`App.tsx`](../src/App.tsx) so unpublished items never enter the UI pipeline.

## `filterBySituations(items, selected)`

```ts
export function filterBySituations(items: ChecklistItem[], selected: SituationId[]): ChecklistItem[]
```

- Empty `selected` → `[]`.
- Otherwise: items where `item.situations.some(s => selected.includes(s))`.
- **Married rule**: if `'married'` is in `selected`, **exclude** item `id === 'standard-deduction-single'` (married filers use `standard-deduction-married`).

## `CATEGORY_ORDER` / `CATEGORY_LABELS`

Fixed category sort order:

1. `gross_income`
2. `exemptions`
3. `general_deductions`
4. `special_deductions`

`CATEGORY_LABELS` maps each `CategoryId` to zh-TW section titles (includes note that standard vs itemized are mutually exclusive in `general_deductions`).

## `groupByCategory(items)`

```ts
export function groupByCategory(items: ChecklistItem[]): CategoryGroup[]
```

- Buckets by `item.category`, then sorts buckets by `CATEGORY_ORDER`.
- Returns `{ category, label, items }[]`.
- **Within each bucket**, item order follows the order items appear in the input array (typically the published checklist array order after filtering).

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
