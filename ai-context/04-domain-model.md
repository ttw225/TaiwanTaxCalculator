# Domain model (TypeScript)

Source: [`src/types/content.ts`](../src/types/content.ts).

## Checklist display metadata

- **`show_wealth_clause_notice`**: When `true`, the checklist card footer shows a standard notice that the item may involve personal conditions or wealth-based (排富) rules; see [`ChecklistCardShell`](../src/components/checklist/ChecklistCardShell.tsx) and copy in [`checklistCardCopy.ts`](../src/lib/checklistCardCopy.ts).

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
  | 'interest_income'
  | 'other_income'
  | 'overseas_income'

export interface Situation {
  id: SituationId
  label: string
  description: string
}
```

- Labels/descriptions are **zh-TW** in [`src/content/deductions.ts`](../src/content/deductions.ts).
- There is **no** separate `single` situation; the checklist engine adds the single-filer standard deduction as a result-page baseline item whenever `married` is not selected ([`08-checklist-engine.md`](./08-checklist-engine.md)).
- `savings_investment` is a hidden derived id. It remains in the TypeScript union and checklist item mapping, but is omitted from public `SITUATIONS` / `SITUATION_GROUPS`; `App.tsx` adds it when `interest_income` is selected.

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
  | 'overseas_income'
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
  source_refs: SourceRef[]
  show_wealth_clause_notice: boolean
}
```

- **`situations`**: Item is eligible if **any** selected situation matches, with the special married rule applied in the checklist engine ([`08-checklist-engine.md`](./08-checklist-engine.md)).
- Baseline items (`exemption-general`, `standard-deduction-single`, `standard-deduction-married`) use `situations: []`; the checklist engine injects the correct baseline set whenever the selection is non-empty.

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

- **`capKey`**: When non-null, must be a key in [`src/data/numbers_2026.json`](../src/data/numbers_2026.json) consumable by [`getNumber`](../src/lib/numbers.ts) for cap feedback in [`ChecklistInlineAmountFields`](../src/components/checklist/ChecklistInlineAmountFields.tsx) (used from [`DeductionCard`](../src/components/DeductionCard.tsx)).

## Card input map

```ts
export type CardInputMap = Record<string, Record<string, string>>
```

- Outer key: checklist **`item.id`**. Inner key: **`CardInlineField.id`**. Values are **string** (raw input).

### Shared encoding: income cards

The four regular income cards (`gross-income`, `dividend-income`, `interest-income`, `other-income`) do not use `ITEM_INLINE_FIELDS`; `IncomeCard` manages their shared participant list and per-card amount fields.

Shared participants are stored under the synthetic `CardInputMap` key `income-participants`:

| fieldId | type | description |
|---|---|---|
| `persons_json` | JSON string | Array of non-self participants: `[{id, label}]` |

Each income card stores its amounts with:

| fieldId | type | description |
|---|---|---|
| `self_income` | `string` (number) | 本人 amount for that income card |
| `persons_json` | JSON string | Array of non-self amounts: `[{id, income}]` |

Participant `id` values: `"spouse"` (配偶; auto-present when married filing) and `"extra-<n>"` (non-negative integer suffix, e.g. `extra-0`, `extra-1`, …). Adding, renaming, or deleting an extra participant from any regular income card updates the shared list for all four cards.

[`src/lib/grossIncome.ts`](../src/lib/grossIncome.ts) exports:

| Symbol | Role |
|--------|------|
| `getSalaryDeductionCap` | Cap from `numbers_2026.json` key `special_deduction_salary` |
| `calcPersonDeduction` | `min(income, cap)` — modeled 薪資所得特別扣除額 |
| `calcPersonNetIncome` | Salary income minus that deduction (floored at 0) |
| `defaultExtraDependentLabel` | Next placeholder label when adding an extra dependent (`親屬1`, …) |
| `parseIncomeParticipantsFromMap` | Builds shared participants from `income-participants`, with legacy fallback to old salary `persons_json` |
| `parseIncomeCardPersons` | Combines shared participants with one income card's amounts and explicit-input flags |
| `serializeIncomeParticipants` / `serializeIncomeAmounts` | JSON-stringify shared participants and per-card non-self amounts |
| `incomeCardIsComplete` | Salary requires explicit input for every participant; dividend/interest/other default blank to 0 |
| `parseGrossIncomePersons` / `serializePersonsJson` / `calcTotalGrossIncome` | Legacy-compatible salary helpers kept for tests and saved-data migration |

Gross income semantics:

- Without dividends: one gross total is shown and passed to the summary/sidebar.
- With dividends: the gross section shows both merged-tax (`salary net + dividends + interest + other`) and 28% separate-tax (`salary net + interest + other`) totals; the summary/sidebar receives `null` for gross income until the later recommendation redesign.
- Overseas income remains an AMT-oriented card and is not included in regular gross income totals.

## Decision tools

```ts
export type DecisionToolId = 'dividend' | 'couple_filing' | 'amt'
```

Used by [`src/content/decision-tools.ts`](../src/content/decision-tools.ts) metadata and [`DecisionToolsPanel`](../src/components/DecisionToolsPanel.tsx) gating.

## Related docs

- Content instances: [`06-content-modules.md`](./06-content-modules.md)
- Engine behavior: [`08-checklist-engine.md`](./08-checklist-engine.md)
