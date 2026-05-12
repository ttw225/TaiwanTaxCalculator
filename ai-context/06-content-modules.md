# Content modules

Primary files: [`src/content/deductions.ts`](../src/content/deductions.ts), [`src/content/inlineFields.ts`](../src/content/inlineFields.ts).

## `deductions.ts`

### Shared `SourceRef` objects

Reused constants (`SRC_ITA`, `SRC_MOF`, `SRC_MANUAL`, `SRC_TAX_SAVING_MANUAL`, `SRC_AMT`) keep `source_id` stable; header comment: keep IDs stable for public traceability UI.

### `CHECKLIST_ITEMS`

**18** items. IDs (kebab-case):

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
| `dividend-income` | `gross_income` | `dividends` |
| `interest-income` | `gross_income` | `interest_income` |
| `other-income` | `gross_income` | `other_income` |
| `overseas-income-amt` | `overseas_income` | `overseas_income` |
| `savings-investment-deduction` | `special_deductions` | `savings_investment` |
| `disability-special-deduction` | `special_deductions` | `disability` |
| `childcare-deduction` | `special_deductions` | `childcare` |
| `education-tuition-deduction` | `special_deductions` | `education_tuition` |
| `long-term-care-deduction` | `special_deductions` | `long_term_care` |
| `rent-deduction` | `special_deductions` | `rent` |

Dynamic prose in `why_it_matters` / eligibility hints uses local helpers backed by `numbers.ts` (e.g. `getNumber(...).toLocaleString('zh-TW')` and `getValidYear()`).

Baseline items are not triggered by first-page situations. When `selected.length > 0`, the checklist engine always includes `exemption-general` plus one standard deduction card: `standard-deduction-married` when `married` is selected, otherwise `standard-deduction-single`.

### `SITUATIONS`

**15** public situations (see [`04-domain-model.md`](./04-domain-model.md) for `SituationId` union). Each has zh-TW `label` and `description`. `savings_investment` remains a hidden internal `SituationId` used to derive the savings-investment result card from interest income; it is not shown on the selector or add modal.

### `SITUATION_GROUPS`

**4** groups for the selector UI:

| Group `id` | `situationIds` |
|------------|----------------|
| `filing-method` | `married` |
| `income-sources` | `salary_income`, `dividends`, `interest_income`, `other_income`, `overseas_income` |
| `general-deductions` | `donations`, `insurance`, `medical_expenses`, `mortgage_interest` |
| `special-deductions` | `disability`, `childcare`, `education_tuition`, `long_term_care`, `rent` |

Union of all grouped `situationIds` equals the public `SITUATIONS` ids (tests enforce this). Hidden derived ids such as `savings_investment` are intentionally excluded.

## `inlineFields.ts`

`ITEM_INLINE_FIELDS: Record<string, CardInlineField[]>` — keys **must** match checklist `item.id`.

| Checklist item id | Field `id` | `capKey` |
|-------------------|------------|----------|
| `mortgage-interest-deduction` | `mortgage_interest_amount` | `null` |
| `rent-deduction` | `rent_amount` | `special_deduction_rent` |
| `medical-deduction` | `medical_amount` | `null` |
| `donations-deduction` | `donation_amount_qualified` | `null` |
| `donations-deduction` | `donation_amount_government` | `null` |
| `savings-investment-deduction` | derived from `interest-income` | `special_deduction_savings_investment` |
| `overseas-income-amt` | `overseas_income_amount` | `null` |
| `overseas-income-amt` | `overseas_income_tax_paid` | `null` |

All fields: `type: 'number'`, `unit: '元'` (count-based rows use `unit: '人'`).

`overseas-income-amt` (checklist category `overseas_income`, section after `gross_income`): `overseas_income_amount` sets `salaryLikeInput` (raw string like salary `self_income`; numeric meaning via `parseIncome`); `overseas_income_tax_paid` sets `implicitZeroWhenEmpty` (empty storage shows `0` in the input like dividend/interest rows, without writing `'0'` to the map). Neither field feeds the gross-income summary total.

`savings-investment-deduction` still has an old inline-field entry for compatibility, but the rendered result card ignores manual input and derives its amount from total interest income.

## Related docs

- Engine filtering/grouping: [`08-checklist-engine.md`](./08-checklist-engine.md)
- Summary scenarios: [`10-ui-components.md`](./10-ui-components.md) (`TaxSummaryPanel`), [`src/lib/taxScenarios.ts`](../src/lib/taxScenarios.ts)
