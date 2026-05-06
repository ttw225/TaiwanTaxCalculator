# Content modules

Primary files: [`src/content/deductions.ts`](../src/content/deductions.ts), [`src/content/decision-tools.ts`](../src/content/decision-tools.ts), [`src/content/inlineFields.ts`](../src/content/inlineFields.ts).

## `deductions.ts`

### Shared `SourceRef` objects

Reused constants (`SRC_ITA`, `SRC_MOF`, `SRC_MANUAL`, `SRC_TAX_SAVING_MANUAL`, `SRC_AMT`) keep `source_id` stable; header comment: keep IDs stable for public traceability UI.

### `CHECKLIST_ITEMS`

**16** items. IDs (kebab-case):

| `id` | `category` | `situations` |
|------|--------------|--------------|
| `exemption-general` | `exemptions` | baseline (`[]`) |
| `standard-deduction-single` | `general_deductions` | baseline (`[]`) |
| `standard-deduction-married` | `general_deductions` | baseline (`[]`) |
| `donations-deduction` | `general_deductions` | `donations` |
| `insurance-deduction` | `general_deductions` | `insurance` |
| `medical-deduction` | `general_deductions` | `medical_expenses` |
| `mortgage-interest-deduction` | `general_deductions` | `mortgage_interest` |
| `gross-income` | `gross_income` | `salary_income` |
| `dividends-tax-choice` | `gross_income` | `dividends` |
| `overseas-income-amt` | `gross_income` | `overseas_income` |
| `savings-investment-deduction` | `special_deductions` | `savings_investment` |
| `disability-special-deduction` | `special_deductions` | `disability` |
| `childcare-deduction` | `special_deductions` | `childcare` |
| `education-tuition-deduction` | `special_deductions` | `education_tuition` |
| `long-term-care-deduction` | `special_deductions` | `long_term_care` |
| `rent-deduction` | `special_deductions` | `rent` |

Dynamic prose in `why_it_matters` / eligibility hints uses local helpers backed by `numbers.ts` (e.g. `getNumber(...).toLocaleString('zh-TW')` and `getValidYear()`).

Baseline items are not triggered by first-page situations. When `selected.length > 0`, the checklist engine always includes `exemption-general` plus one standard deduction card: `standard-deduction-married` when `married` is selected, otherwise `standard-deduction-single`.

### `SITUATIONS`

**14** situations (see [`04-domain-model.md`](./04-domain-model.md) for `SituationId` union). Each has zh-TW `label` and `description`.

### `SITUATION_GROUPS`

**4** groups for the selector UI:

| Group `id` | `situationIds` |
|------------|----------------|
| `filing-method` | `married` |
| `income-sources` | `salary_income`, `dividends`, `overseas_income` |
| `general-deductions` | `donations`, `insurance`, `medical_expenses`, `mortgage_interest` |
| `special-deductions` | `savings_investment`, `disability`, `childcare`, `education_tuition`, `long_term_care`, `rent` |

Union of all `situationIds` equals the full `SituationId` set used in `SITUATIONS` (tests enforce this).

## `decision-tools.ts`

Exports metadata only:

- `DecisionToolMeta`: `id`, `title`, `subtitle`, `disclaimer`, `sourceRefs`
- `DIVIDEND_TOOL_META`, `COUPLE_FILING_TOOL_META`, `AMT_TOOL_META`
- `AMT_CHECKLIST_STEPS`: readonly tuple of **5** zh-TW procedural strings for AMT follow-up UI

Logic and inputs live in [`src/lib/decisions.ts`](../src/lib/decisions.ts) and [`src/components/tools/*.tsx`](../src/components/tools/).

## `inlineFields.ts`

`ITEM_INLINE_FIELDS: Record<string, CardInlineField[]>` — keys **must** match checklist `item.id`.

| Checklist item id | Field `id` | `capKey` |
|-------------------|------------|----------|
| `mortgage-interest-deduction` | `mortgage_interest_amount` | `null` |
| `rent-deduction` | `rent_amount` | `special_deduction_rent` |
| `medical-deduction` | `medical_amount` | `null` |
| `donations-deduction` | `donation_amount_qualified` | `null` |
| `donations-deduction` | `donation_amount_government` | `null` |
| `savings-investment-deduction` | `savings_investment_amount` | `special_deduction_savings_investment` |

All fields: `type: 'number'`, `unit: '元'`.

## Related docs

- Engine filtering/grouping: [`08-checklist-engine.md`](./08-checklist-engine.md)
- Decision math: [`09-decision-tools.md`](./09-decision-tools.md)
