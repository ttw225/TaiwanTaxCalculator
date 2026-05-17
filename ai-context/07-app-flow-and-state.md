# App flow and state

Source: [`src/pages/ChecklistFlow.tsx`](../src/pages/ChecklistFlow.tsx), route modules under [`src/pages/`](../src/pages/).

## Route-level flow

The checklist workflow uses URL routes for top-level screens. Do not reintroduce a single `/` client state machine for these pages; prerendered HTML must match the route so refresh does not flash the landing page first.

| Route | UI | Indexing |
|-------|----|----------|
| `/` | [`HomePage`](../src/pages/HomePage.tsx) + [`IntroPage`](../src/components/IntroPage.tsx) | `index,follow` |
| `/checklist/start` | [`ChecklistStartPage`](../src/pages/ChecklistStartPage.tsx) + [`SituationSelector`](../src/components/SituationSelector.tsx) | `noindex,follow` |
| `/checklist` | [`ChecklistPage`](../src/pages/ChecklistPage.tsx) + [`ChecklistResult`](../src/components/ChecklistResult.tsx) | `noindex,follow` |

`react-router.config.ts` prerenders all three routes. `scripts/generate-sitemap.ts` includes `/` but intentionally omits `/checklist/start` and `/checklist`.

## Navigation

- Home CTA and active checklist nav call `getChecklistEntryPath()` from [`src/lib/checklistEntryPath.ts`](../src/lib/checklistEntryPath.ts).
- `getChecklistEntryPath()` returns `/checklist` only when saved selection exists and `tax.checklist.generated.v1` is true; otherwise it returns `/checklist/start`.
- `ChecklistFlow` header logo navigates to `/`.
- `/checklist/start` `handleGenerate`: non-empty selection writes selection + generated flag, navigates to `/checklist`, then scrolls top.
- `/checklist`: after client hydration, if no saved selection exists, replace-navigates to `/checklist/start`.

## Core state

`ChecklistFlow` owns state shared by `/checklist/start` and `/checklist`.

| State | Type / role |
|-------|-------------|
| `selected` | `SituationId[]` — source of truth for situation selection and card filtering |
| `hasGeneratedChecklist` | `boolean` — persisted generated flag used for nav entry decisions |
| `cardInputMap` | `CardInputMap` — per-card field strings |
| `pendingRemovalEffect` | removal confirm dialog payload or `null` |
| `scrollToItemId` | checklist item id or section token to scroll into view after add |
| `isHydrated` | client storage has been read; `/checklist` shows a route-specific loading message until then |

There is no active `appState` route selector. The old `tax.checklist.view.v1` key is cleared/ignored; URL is the page identity.

## Selection and checklist behavior

- `toggleSituation(id)`: updates `selected`, then normalizes linked situations.
- `savings_investment` is a hidden derived situation. Selecting `interest_income` also selects it; removing `interest_income` removes it.
- `handleAddSituations(ids)`: merges ids, normalizes links, sets `scrollToItemId` using `getScrollTargetAfterAdd`.
- Add modal lists public situations not already in `selected`; `savings_investment` is intentionally absent.
- Non-removable cards: `exemption-general`, `standard-deduction-single`, `standard-deduction-married`, `savings-investment-deduction`.
- Removing the last removable card calls `resetChecklistState()`, which clears selection, inputs, generated flag, legacy view state, and navigates to `/checklist/start`.

## Persistence and effects

On hydration, `ChecklistFlow` loads:

- `selected` from `SITUATION_SELECTION_STORAGE_KEY`
- `cardInputMap` from `CHECKLIST_INPUT_STORAGE_KEY`
- generated flag from `tax.checklist.generated.v1` only when selection exists

After hydration, effects persist `selected`, `cardInputMap`, and generated flag. The storage listener watches `SITUATION_SELECTION_STORAGE_KEY`; if another tab clears selection while on `/checklist`, this tab replace-navigates to `/checklist/start`.

## Related docs

- Storage keys: [`11-storage-and-persistence.md`](./11-storage-and-persistence.md)
- Checklist engine: [`08-checklist-engine.md`](./08-checklist-engine.md)
- UI: [`10-ui-components.md`](./10-ui-components.md)
