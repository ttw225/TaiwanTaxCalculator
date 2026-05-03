# Decision tools (logic and wiring)

## UI gating

[`src/components/DecisionToolsPanel.tsx`](../src/components/DecisionToolsPanel.tsx) shows tools based on `selectedSituations`:

| Condition | Component |
|-----------|-----------|
| includes `dividends` | [`DividendTool`](../src/components/tools/DividendTool.tsx) |
| includes `married` | [`CoupleFilingTool`](../src/components/tools/CoupleFilingTool.tsx) |
| includes `overseas_income` | [`AmtTool`](../src/components/tools/AmtTool.tsx) |

Metadata (titles, disclaimers, `sourceRefs`): [`src/content/decision-tools.ts`](../src/content/decision-tools.ts). Shared source list UI: [`ToolSourceRefs`](../src/components/tools/ToolSourceRefs.tsx).

## Shared: bracket income tax (`calcBracketTax`)

Source: [`src/lib/decisions.ts`](../src/lib/decisions.ts).

```ts
export function calcBracketTax(taxableIncome: number): number
```

- Non-positive income → `0`.
- Walks [`getBrackets()`](../src/lib/numbers.ts) in order; first bracket where `taxableIncome <= up_to` **or** `up_to === null` wins.
- Tax formula: `Math.round(taxableIncome * rate - quick_deduction)`.

## Dividend tool (`calcDividendOptions`)

Constants in `decisions.ts` (not in JSON):

- Credit rate: **8.5%** (`DIVIDEND_CREDIT_RATE`)
- Credit cap: **80_000** TWD (`DIVIDEND_CREDIT_CAP`)
- Option B flat rate: **28%** (`DIVIDEND_FLAT_RATE`)

```ts
export function calcDividendOptions(dividendAmount: number, marginalRate: number): DividendOptions
```

- Clamps dividend with `Math.max(0, dividendAmount)`.
- `credit = min(amount * 0.085, 80000)`.
- Option A tax: `round(amount * marginalRate - credit)`.
- Option B tax: `round(amount * 0.28)`.
- `recommended`: `'A' | 'B' | 'equal'` by comparing taxes; `savings = abs(optionATax - optionBTax)`.

UI supplies **marginal rate** from a fixed bracket selector in `DividendTool` (not from `numbers_2026.json` brackets directly).

## Couple filing tool (`calcCoupleFilingOptions`)

```ts
export function calcCoupleFilingOptions(husbandSalary: number, wifeSalary: number): CoupleFilingOptions
```

- Salaries clamped with `Math.max(0, ...)`.
- Reads from JSON via `getNumber`: `standard_deduction_married`, `special_deduction_salary`, `exemption_general`.

**Three modes** (labels zh-TW in return value):

1. **Joint filing** — taxable `max(0, h+w - STANDARD_MARRIED - 2*SALARY_DED - 2*EXEMPTION)`; single `calcBracketTax` on joint taxable.
2. **Husband primary / separate salary** — `halfStandard = STANDARD_MARRIED / 2`; per-spouse taxable `max(0, salary - halfStandard - SALARY_DED - EXEMPTION)`; tax = sum of two `calcBracketTax` calls.
3. **Wife primary** — for pure symmetric salary model, **same numeric tax** as mode 2 (order of addition only); still exposed as distinct row for UX.

Returns `modes`, `bestIndex` (first minimum tax), `savings` = second-smallest tax minus smallest (sorted taxes array).

**Comment in source:** simplified model vs full Taiwan separate-salary rules; see disclaimer in `COUPLE_FILING_TOOL_META`.

## AMT threshold (`checkAmtThreshold`)

```ts
const AMT_OVERSEAS_THRESHOLD = 1_000_000 // TWD, in code (not JSON key)

export function checkAmtThreshold(overseasIncome: number): AmtThresholdResult
```

- `aboveThreshold: overseasIncome >= 1_000_000` (inclusive at equality).

UI shows `AMT_CHECKLIST_STEPS` from decision-tools when above threshold.

## Related docs

- Numbers file: [`05-tax-numbers.md`](./05-tax-numbers.md)
- Components: [`10-ui-components.md`](./10-ui-components.md)
