# App flow and state (`App.tsx`)

Source: [`src/App.tsx`](../src/App.tsx).

## Top-level layout

- `SiteHeader` with `currentFeatureId="tax-checklist"` — `onHome` → `navigateToIntro`, `onNavClick` → `navigateToChecklistFlow`.
- `main`: `IntroPage`, `SituationSelector`, or `ChecklistResult` depending on `appState`.
- `SiteFooter`, `BackToTopButton`.

## State machine

```ts
type AppState = 'intro' | 'selecting' | 'results'
```

| State | UI |
|-------|-----|
| `intro` | [`IntroPage`](../src/components/IntroPage.tsx) |
| `selecting` | [`SituationSelector`](../src/components/SituationSelector.tsx) |
| `results` | [`ChecklistResult`](../src/components/ChecklistResult.tsx) |

- **`navigateToChecklistFlow`**: if `hasGeneratedChecklist && selected.length > 0` → `results`; else → `selecting`.
- **`navigateToIntro`**: `intro`.

Initial `appState` prefers persisted checklist view state when the key exists (see [`11-storage-and-persistence.md`](./11-storage-and-persistence.md)); otherwise non-empty saved selection → `selecting`, else `intro`.

## Core state

| State | Type / role |
|-------|-------------|
| `selected` | `SituationId[]` — source of truth for first-page situation selection and persistence |
| `hasGeneratedChecklist` | `boolean` — user has pressed「產生節稅清單」at least once this session path; persisted (see [`11-storage-and-persistence.md`](./11-storage-and-persistence.md)) |
| `appState` | `AppState` — which top-level screen is shown |
| `cardInputMap` | `CardInputMap` — per-card field strings (updated synchronously on input) |
| `pendingRemovalEffect` | removal confirm dialog payload or `null` |
| `scrollToItemId` | checklist item id to scroll into view after add; cleared via `onScrollHandled` |

## Derived data (constants / maps)

- `CHECKLIST_ITEMS` is the source list for filtering and grouping.
- `ITEM_BY_ID`, `SITUATION_LABEL_BY_ID`
- Helpers: `getAddableSituationGroups`, `getGroupedItemsBySelection`, **`getScrollTargetAfterAdd`**, `getItemSourceSituationLabelsById`

## Situation toggle

- `toggleSituation(id)`: updates `selected`, then normalizes linked situations.
- `savings_investment` is a hidden derived situation, not shown in the selector. Selecting `interest_income` also selects `savings_investment`; removing `interest_income` also removes `savings_investment`.

## Generate / clear / add situations

- **`handleGenerate`**: if selection non-empty → `results`, `setHasGeneratedChecklist(true)`, clear scroll token, `window.scrollTo(0, 0)`.
- **`handleClearSelections`** / **`handleResetCalculation`**: both call **`resetChecklistState()`** (full wipe: selection, inputs, view state, generated flag, legacy key; see below).
- **`handleAddSituations(ids)`**: merge ids into `selected`, normalize the interest/savings link, then set `scrollToItemId` from **`getScrollTargetAfterAdd`** (first newly visible card in render order, with married-only section targets when no new card).
- Add modal lists public situations not currently present in `selected`; `savings_investment` is intentionally absent and appears only as a derived result card when interest income is active.

## View state and full reset

- **`skipNextChecklistViewStateSave`** (`useRef<boolean>`): set `true` inside **`resetChecklistState`**. On the next `appState` commit, the effect that normally **`saveChecklistViewState(appState)`** instead clears the ref, calls **`clearSavedChecklistViewState()`**, and returns without writing. This prevents briefly setting `appState` to `'selecting'` from persisting a stale `'selecting'` page when the user intended a full reset (including removing the last removable situation-driven card).
- **`resetChecklistState`**: clears `selected`, `hasGeneratedChecklist`, sets `appState` to `'selecting'`, resets `cardInputMap`, pending removal, scroll token; **`clearSavedSituationSelection`**, **`clearSavedChecklistInputMap`**, **`clearSavedChecklistViewState`**, persists generated `false`, removes legacy manual-overrides key, `window.scrollTo(0, 0)`.

## Remove checklist item (independent per card)

- Non-removable guard ids: `exemption-general`, `standard-deduction-single`, `standard-deduction-married`, `savings-investment-deduction`.
- **`createRemovalEffect(itemId)`**: builds a preview and checks that card for input-loss; `interest-income` also checks its linked savings-investment card. It simulates **`nextSelected`** after removal; when that would be **empty** (last situation-driven removable card → full reset), it sets **`resetClearedItemTitles`** via **`getResetClearedItemTitles`**: currently **`['免稅額']`** when `exemption-general` already has any non-empty field in `cardInputMap`, else **`[]`**.
- **`requiresConfirm`**: `true` when **`hasInputLoss`** (target ± linked savings cards have input) **or** when **`resetClearedItemTitles.length > 0`** (full reset would clear baseline exemption data the user already filled). If neither applies on the last-card path, removal runs **immediately** without the dialog.
- **`handleRemoveItem`**: apply immediately or set `pendingRemovalEffect`.
- **`applyRemovalEffect`**: removes the target card's `situations` from `selected` and clears that card's entries from `cardInputMap` (and linked interest/savings cards when applicable). If **`nextSelected` is empty**, calls **`resetChecklistState()`** instead of partial updates so storage and generated flag stay consistent.
- Removing `interest-income` also removes `savings_investment` and clears both linked entries.

## Card input

- **`handleCardInputChange`**: merges one `(itemId, fieldId, value)` into `cardInputMap` (no debounce at App level).
- Shared income participants are stored under the synthetic `income-participants` key; income cards update it through `ChecklistResult`.

## Effects

1. **`saveSituationSelection(selected)`** on `[selected]` — empty selection clears storage.
2. **`saveChecklistInputMap(cardInputMap)`** on `[cardInputMap]`.
3. **`saveChecklistViewState(appState)`** on `[appState]` unless skipped via ref (see View state and full reset); otherwise **`clearSavedChecklistViewState()`** once.
4. **`saveChecklistGeneratedFlag(hasGeneratedChecklist)`** on `[hasGeneratedChecklist]`.
5. **Legacy cleanup** on mount: `localStorage.removeItem('tax.checklist.manualOverrides.v1')`.
6. **`storage` listener** for `SITUATION_SELECTION_STORAGE_KEY`: `parseSavedSituationSelection` → `setSelected`; if empty → `setHasGeneratedChecklist(false)` and `appState` → `'selecting'`.

## Related docs

- Storage keys: [`11-storage-and-persistence.md`](./11-storage-and-persistence.md)
- Checklist engine: [`08-checklist-engine.md`](./08-checklist-engine.md)
- UI: [`10-ui-components.md`](./10-ui-components.md)
