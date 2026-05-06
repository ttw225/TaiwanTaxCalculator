import { readLocal, removeLocal, writeLocal } from './storage'

const BASE_STORAGE_KEY = 'tax.checklist.view.v1'

export type ChecklistViewState = 'selecting' | 'results'

interface SavedChecklistViewState {
  page: ChecklistViewState
}

export function createChecklistViewStateStorageKey(basePath: string | undefined = import.meta.env.BASE_URL): string {
  if (!basePath || basePath === '/') return BASE_STORAGE_KEY
  return `${BASE_STORAGE_KEY}:${basePath}`
}

export const CHECKLIST_VIEW_STATE_STORAGE_KEY = createChecklistViewStateStorageKey()

function normalizeChecklistViewState(input: unknown): ChecklistViewState {
  if (input === 'results') return 'results'
  return 'selecting'
}

export function loadSavedChecklistViewState(): ChecklistViewState {
  const saved = readLocal<Partial<SavedChecklistViewState> | ChecklistViewState>(CHECKLIST_VIEW_STATE_STORAGE_KEY)
  if (!saved) return 'selecting'
  if (typeof saved === 'string') return normalizeChecklistViewState(saved)
  return normalizeChecklistViewState(saved.page)
}

export function saveChecklistViewState(page: ChecklistViewState): void {
  if (page === 'selecting') {
    clearSavedChecklistViewState()
    return
  }
  writeLocal<SavedChecklistViewState>(CHECKLIST_VIEW_STATE_STORAGE_KEY, { page })
}

export function clearSavedChecklistViewState(): void {
  removeLocal(CHECKLIST_VIEW_STATE_STORAGE_KEY)
}
