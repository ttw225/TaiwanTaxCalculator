# App flow and state (`App.tsx`)

Source: [`src/App.tsx`](../src/App.tsx).

## Top-level layout

- `SiteHeader` with `currentFeatureId="tax-checklist"`.
- `main`: either `SituationSelector` or `ChecklistResult`.
- `SiteFooter`, `BackToTopButton`.

## State machine

```ts
type AppState = 'selecting' | 'results'
```

| State | UI |
|-------|-----|
| `selecting` | [`SituationSelector`](../src/components/SituationSelector.tsx) |
| `results` | [`ChecklistResult`](../src/components/ChecklistResult.tsx) |

Switch to `results` on **generate** when `selected.length > 0`; scroll window to top.

## Core state

| State | Type / role |
|-------|-------------|
| `selected` | `SituationId[]` — initialized from `loadSavedSituationSelection(SITUATION_IDS)` |
| `cardInputMap` | `CardInputMap` — per-card field strings (updated synchronously on input) |
| `pendingRemovalEffect` | removal confirm dialog payload or `null` |
| `scrollToItemId` | checklist item id to scroll into view after add; cleared via `onScrollHandled` |

## Derived data (constants / maps)

- `PUBLISHED_ITEMS = applyPublicationGate(CHECKLIST_ITEMS)`
- `ITEM_BY_ID`, `SITUATION_LABEL_BY_ID`
- Helpers: `getEffectiveState`, `getAddableSituationGroups`, `getGroupedItemsBySelection`, `getScrollTargetItemIdAfterAdd`, `getItemSourceSituationLabelsById`

## Situation toggle

- `toggleSituation(id)`: add/remove id; clears pending removal.

## Generate / clear / add situations

- **`handleGenerate`**: if selection non-empty → `results`, clear scroll token, `window.scrollTo(0, 0)`.
- **`handleClearSelections`**: empty selection, reset `cardInputMap`, clear storage, remove legacy key (see [`11-storage-and-persistence.md`](./11-storage-and-persistence.md)).
- **`handleAddSituations(ids)`**: append unique ids; set `scrollToItemId` from `getScrollTargetItemIdAfterAdd(currentSelected, nextSelected)` (first newly visible card in render order).

## Remove checklist item (and linked situations)

- **`createRemovalEffect(itemId)`**: computes `nextSelected` by removing all situations attached to that item; lists co-removed items and input-loss flag.
- **`requiresConfirm`**: `true` if more than one item removed **or** any removed item had card input.
- **`handleRemoveItem`**: apply immediately or set `pendingRemovalEffect`.
- **`applyRemovalEffect`**: update selection, strip removed item ids from `cardInputMap`; if selection empty → return to `selecting`, scroll top.

## Card input

- **`handleCardInputChange`**: merges one `(itemId, fieldId, value)` into `cardInputMap` (no debounce at App level).

## Effects

1. **`saveSituationSelection(selected)`** on `[selected]` — empty selection clears storage.
2. **Legacy cleanup** on mount: `localStorage.removeItem('tax.checklist.manualOverrides.v1')`.
3. **`storage` listener** for `SITUATION_SELECTION_STORAGE_KEY`: `parseSavedSituationSelection` → `setSelected`; if empty, `appState` → `selecting`.

## Related docs

- Storage keys: [`11-storage-and-persistence.md`](./11-storage-and-persistence.md)
- Checklist engine: [`08-checklist-engine.md`](./08-checklist-engine.md)
- UI: [`10-ui-components.md`](./10-ui-components.md)
