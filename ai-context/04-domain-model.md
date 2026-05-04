# Domain model (TypeScript)

Source: [`src/types/content.ts`](../src/types/content.ts).

## Verification and disclaimer enums

```ts
export type VerificationStatus = 'verified' | 'partially_verified' | 'unverified'
export type DisclaimerLevel = 'low' | 'medium' | 'high'
```

- **`verification_status`**: Used by publication gate — items with `'unverified'` are filtered out of the live checklist set ([`08-checklist-engine.md`](./08-checklist-engine.md)).
- **`disclaimer_level`**: UI emphasis; high-risk items display the `需進一步確認` badge.

## Situations

```ts
export type SituationId =
  | 'salary_income'
  | 'married'
  | 'disability'
  | 'long_term_care'
  | 'donations'
  | 'insurance'
  | 'medical_expenses'
  | 'mortgage_interest'
  | 'rent'
  | 'childcare'
  | 'education_tuition'
  | 'savings_investment'
  | 'dividends'
  | 'overseas_income'

export interface Situation {
  id: SituationId
  label: string
  description: string
}
```

- Labels/descriptions are **zh-TW** in [`src/content/deductions.ts`](../src/content/deductions.ts).
- There is **no** separate `single` situation; single filer standard deduction is tied to `salary_income` on a specific checklist item ([`06-content-modules.md`](./06-content-modules.md)).

## Situation groups (UI grouping only)

```ts
export interface SituationGroup {
  id: string
  title: string
  description: string
  situationIds: SituationId[]
}
```

## Categories

```ts
export type CategoryId =
  | 'gross_income'
  | 'exemptions'
  | 'general_deductions'
  | 'special_deductions'
```

Display order and human-readable labels are defined in [`src/lib/checklist.ts`](../src/lib/checklist.ts) (`CATEGORY_ORDER`, `CATEGORY_LABELS`).

## Sources

```ts
export interface SourceRef {
  source_id: string
  label: string
  authority?: string
  url?: string
}
```

- **`source_id`**: Stable slug for traceability; comment in content asks to keep IDs stable.
- **`url`**: Optional (e.g. one AMT meta ref may omit URL).

## Checklist item

```ts
export interface ChecklistItem {
  id: string
  title: string
  category: CategoryId
  situations: SituationId[]
  why_it_matters: string
  eligibility_cues: string[]
  documents_to_prepare: string[]
  limitations: string[]
  source_refs: SourceRef[]
  verification_status: VerificationStatus
  disclaimer_level: DisclaimerLevel
  next_action: string
}
```

- **`situations`**: Item is eligible if **any** selected situation matches, after gate and special married rule ([`08-checklist-engine.md`](./08-checklist-engine.md)).

## Card inline fields

```ts
export interface CardInlineField {
  id: string
  label: string
  type: 'number'
  unit: string
  capKey: string | null
}
```

- **`capKey`**: When non-null, must be a key in [`src/data/numbers_2026.json`](../src/data/numbers_2026.json) consumable by [`getNumber`](../src/lib/numbers.ts) for cap feedback in [`DeductionCard`](../src/components/DeductionCard.tsx).

## Card input map

```ts
export type CardInputMap = Record<string, Record<string, string>>
```

- Outer key: checklist **`item.id`**. Inner key: **`CardInlineField.id`**. Values are **string** (raw input).

### Special encoding: `gross-income`

The `gross-income` item does not use `ITEM_INLINE_FIELDS`; `GrossIncomeCard` manages its own fields:

| fieldId | type | description |
|---|---|---|
| `self_income` | `string` (number) | 本人年薪 |
| `persons_json` | JSON string | Array of `GrossIncomePerson` (excludes self): `[{id, label, income}]` |

`id` values in `persons_json`: `"spouse"` (配偶, filtered by `isMarriedFiling`) and `"extra-N"` (N = 0, 1, …).

Parse / serialize helpers: [`src/lib/grossIncome.ts`](../src/lib/grossIncome.ts) — `parseGrossIncomePersons`, `serializePersonsJson`.

## Decision tools

```ts
export type DecisionToolId = 'dividend' | 'couple_filing' | 'amt'
```

Used by [`src/content/decision-tools.ts`](../src/content/decision-tools.ts) metadata and [`DecisionToolsPanel`](../src/components/DecisionToolsPanel.tsx) gating.

## Related docs

- Content instances: [`06-content-modules.md`](./06-content-modules.md)
- Engine behavior: [`08-checklist-engine.md`](./08-checklist-engine.md)
