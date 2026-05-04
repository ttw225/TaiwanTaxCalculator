# Tax numbers snapshot (`numbers_2026.json`)

## Source of truth

- File: [`src/data/numbers_2026.json`](../src/data/numbers_2026.json)
- Accessors: [`src/lib/numbers.ts`](../src/lib/numbers.ts)

**Do not invent** amounts, brackets, or filing windows. Content may call `getNumber(key)` and format with `toLocaleString('zh-TW')`.

## Top-level JSON fields

| Field | Type | Meaning |
|-------|------|---------|
| `valid_year` | number | ROC tax year label used in official materials (e.g. 114) |
| `filing_year` | number | Calendar year of filing season |
| `filing_window` | string | In-repo filing window descriptor (opaque string in JSON) |
| `items` | array | Named numeric constants (TWD) |
| `brackets` | array | Progressive tax brackets for `calcBracketTax` |

## `items[]` entries

Each element:

| Property | Type | Notes |
|----------|------|--------|
| `key` | string | Passed to `getNumber(key)` |
| `value` | number | TWD amount |
| `unit` | string | `"TWD"` in current file |
| `basis_law` | string | Citation string |
| `basis_announcement` | string | Citation string |
| `source_url` | string | Official or handbook URL |

### Keys and values (as in repo)

| `key` | `value` |
|-------|--------:|
| `exemption_general` | 97000 |
| `exemption_senior_70` | 145500 |
| `standard_deduction_single` | 131000 |
| `standard_deduction_married` | 262000 |
| `special_deduction_salary` | 218000 |
| `special_deduction_disability` | 218000 |
| `special_deduction_long_term_care` | 180000 |
| `itemized_deduction_mortgage_interest` | 300000 |
| `itemized_deduction_personal_insurance` | 24000 |
| `special_deduction_childcare_first` | 150000 |
| `special_deduction_childcare_additional` | 225000 |
| `special_deduction_rent` | 180000 |
| `special_deduction_education_tuition` | 25000 |
| `special_deduction_savings_investment` | 270000 |
| `basic_living_expense` | 213000 |

## `brackets[]`

Each bracket: `{ "up_to": number | null, "rate": number, "quick_deduction": number }`.

Order is ascending by `up_to`. Last row has `"up_to": null` (top bracket).

Current rows (from file):

1. up_to `590000`, rate `0.05`, quick `0`
2. up_to `1330000`, rate `0.12`, quick `41300`
3. up_to `2660000`, rate `0.20`, quick `147700`
4. up_to `4980000`, rate `0.30`, quick `413700`
5. up_to `null`, rate `0.40`, quick `911700`

## API: `getNumber(key: string): number`

- Finds first `items[]` where `item.key === key`.
- **Throws** `Error` with message `numbers_2026: unknown key "${key}"` if missing.

## API: `getBrackets(): Bracket[]`

- Returns `data.brackets` from the parsed JSON module (same array reference for the lifetime of the module).

## Related code

- Bracket tax: [`calcBracketTax`](../src/lib/decisions.ts) in [`09-decision-tools.md`](./09-decision-tools.md).
- Couple filing tool reads `standard_deduction_married`, `special_deduction_salary`, `exemption_general` via `getNumber`.

## Related docs

- Types: [`04-domain-model.md`](./04-domain-model.md)
- Tests asserting keys: [`13-testing.md`](./13-testing.md)
