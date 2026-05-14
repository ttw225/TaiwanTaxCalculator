# Storage and persistence

## Generic localStorage helpers

[`src/lib/storage.ts`](../src/lib/storage.ts):

| Function | Behavior |
|----------|----------|
| `readLocal<T>(key)` | `getItem` + `JSON.parse`; corrupt / missing → `null` (catch) |
| `writeLocal<T>(key, value)` | `setItem(JSON.stringify)`; catch silent (private mode, etc.) |
| `removeLocal(key)` | `removeItem`; catch silent |

## Situation selection

[`src/lib/situationSelectionStorage.ts`](../src/lib/situationSelectionStorage.ts).

### Storage key

- Base key: **`tax.situationSelection.v1`**
- If `import.meta.env.BASE_URL` is set and not `'/'`, key becomes **`tax.situationSelection.v1:${BASE_URL}`** (see `createSituationSelectionStorageKey`).
- Exported `SITUATION_SELECTION_STORAGE_KEY` uses default `import.meta.env.BASE_URL` at module load.

This isolates selections per GitHub Pages subpath deploy.

### Saved shape

```ts
interface SavedSituationSelection { selected: SituationId[] }
```

`saveSituationSelection` writes `{ selected }` or clears when empty.

### Parse / normalize

- `parseSavedSituationSelection(raw, allowedIds)`: JSON parse; keeps only ids in `allowedIds`, **dedupes**, preserves order.
- Invalid JSON → `[]`.

### API

- `loadSavedSituationSelection(allowedIds)`
- `saveSituationSelection(selected)`
- `clearSavedSituationSelection()` → `removeLocal`

## Checklist card inputs

[`src/lib/checklistInputStorage.ts`](../src/lib/checklistInputStorage.ts).

### Storage key

- Base: **`tax.checklist.inputs.v1`**
- With non-root `BASE_URL`: **`tax.checklist.inputs.v1:${BASE_URL}`** (`createChecklistInputStorageKey`).
- Exported `CHECKLIST_INPUT_STORAGE_KEY`.

### Saved shape

```ts
interface SavedChecklistInput { cardInputMap: CardInputMap }
```

`saveChecklistInputMap` writes `{ cardInputMap }` or clears when the map is empty. `loadSavedChecklistInputMap` accepts legacy raw map or wrapped shape.

### API

- `loadSavedChecklistInputMap()`
- `saveChecklistInputMap(cardInputMap)`
- `clearSavedChecklistInputMap()` → `removeLocal`

## Checklist view state (which screen)

[`src/lib/checklistViewStateStorage.ts`](../src/lib/checklistViewStateStorage.ts).

### Storage key

- Base: **`tax.checklist.view.v1`**
- With non-root `BASE_URL`: **`tax.checklist.view.v1:${BASE_URL}`** (`createChecklistViewStateStorageKey`).
- Exported `CHECKLIST_VIEW_STATE_STORAGE_KEY`.

### Saved shape

```ts
type ChecklistViewState = 'intro' | 'selecting' | 'results'
interface SavedChecklistViewState { page: ChecklistViewState }
```

`saveChecklistViewState(page)` writes `{ page }`. `loadSavedChecklistViewState` normalizes invalid values to `'selecting'` except explicit `'intro'` / `'results'`.

### API

- `loadSavedChecklistViewState()`
- `saveChecklistViewState(page)`
- `clearSavedChecklistViewState()` → `removeLocal`

[`src/App.tsx`](../src/App.tsx) hydrates initial `appState` from this key when present; a full reset clears it (see [`07-app-flow-and-state.md`](./07-app-flow-and-state.md)).

## Checklist generated flag

Defined in [`src/App.tsx`](../src/App.tsx) (not a separate module).

### Storage key

- **`tax.checklist.generated.v1`** — JSON `true` when the user has generated the checklist with a non-empty selection; removed when cleared.

Used with saved selection to set initial **`hasGeneratedChecklist`** (no selection → always `false`). Cleared on **`resetChecklistState`**.

## Cross-tab sync

[`src/App.tsx`](../src/App.tsx) listens to `window` `storage` events for `SITUATION_SELECTION_STORAGE_KEY`; updates `selected` from `parseSavedSituationSelection(event.newValue, SITUATION_IDS)`. Result cards are derived from the synced selection. If synced selection is empty → **`setHasGeneratedChecklist(false)`** and `appState` → `'selecting'`.

Other checklist keys are not cross-tab synced by a dedicated listener in App.

## Legacy key cleanup

- Constant in `App.tsx`: **`tax.checklist.manualOverrides.v1`**
- Removed on mount and on full clear — deprecated pre-v2 checklist overrides.

## Related docs

- App flow: [`07-app-flow-and-state.md`](./07-app-flow-and-state.md)
- Tests: [`13-testing.md`](./13-testing.md)
