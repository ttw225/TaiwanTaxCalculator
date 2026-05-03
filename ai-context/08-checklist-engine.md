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
5. `further_check`

`CATEGORY_LABELS` maps each `CategoryId` to zh-TW section titles (includes note that standard vs itemized are mutually exclusive in `general_deductions`).

## `groupByCategory(items)`

```ts
export function groupByCategory(items: ChecklistItem[]): CategoryGroup[]
```

- Buckets by `item.category`, then sorts buckets by `CATEGORY_ORDER`.
- Returns `{ category, label, items }[]`.

## `CategoryGroup`

```ts
export interface CategoryGroup {
  category: CategoryId
  label: string
  items: ChecklistItem[]
}
```

## `CARD_SORT_RULES`

```ts
type CardSortRule = { fieldId: string; situationId: SituationId; boost: number }
export const CARD_SORT_RULES: CardSortRule[]
```

Current rules (negative `boost` = lower score = earlier in list):

| `fieldId` | `situationId` | `boost` |
|-----------|-----------------|---------|
| `mortgage_interest_amount` | `mortgage_interest` | -2 |
| `rent_amount` | `rent` | -2 |
| `medical_amount` | `medical_expenses` | -2 |
| `donation_amount` | `donations` | -1 |

## `sortByTriage(groups, cardInputMap)`

```ts
export function sortByTriage(groups: CategoryGroup[], cardInputMap: CardInputMap): CategoryGroup[]
```

- If **no** non-empty string exists anywhere in `cardInputMap`, returns shallow copies of groups with **item order unchanged** (still clones arrays).
- Otherwise, **within each category only**:
  - For each item, start `score = 0`.
  - For each rule: if **any** card row in `cardInputMap` has a **non-empty** value for `rule.fieldId`, and the item's `situations` includes `rule.situationId`, add `rule.boost` to `score`.
  - Sort by `(score, originalIndex)` ascending — **stable** tie-break.
- **Does not** move items across categories.

**Important:** "Field filled" is **global** across all items: one user filling `donation_amount` on the donations card boosts **every** item that includes `donations` in `situations` (within the same category), not only the donations card.

## Caller contract

- App debounces updates to the map passed into triage (~300ms) — see comment in `checklist.ts` and [`07-app-flow-and-state.md`](./07-app-flow-and-state.md).

## Related docs

- Content IDs: [`06-content-modules.md`](./06-content-modules.md)
- Tests: [`13-testing.md`](./13-testing.md) (`triage.test.ts`)
