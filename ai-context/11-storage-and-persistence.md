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

## Cross-tab sync

[`src/App.tsx`](../src/App.tsx) listens to `window` `storage` events for `SITUATION_SELECTION_STORAGE_KEY`; updates `selected` from `parseSavedSituationSelection(event.newValue, SITUATION_IDS)`. Result cards are derived from the synced selection. If synced selection empty → `appState` `'selecting'`.

## Legacy key cleanup

- Constant in `App.tsx`: **`tax.checklist.manualOverrides.v1`**
- Removed on mount and on full clear — deprecated pre-v2 checklist overrides.

## Related docs

- App flow: [`07-app-flow-and-state.md`](./07-app-flow-and-state.md)
- Tests: [`13-testing.md`](./13-testing.md)
