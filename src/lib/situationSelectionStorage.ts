import type { SituationId } from '../types/content'
import { readLocal, removeLocal, writeLocal } from './storage'

export const SITUATION_SELECTION_STORAGE_KEY = 'tax.situationSelection.v1'

interface SavedSituationSelection {
  selected: SituationId[]
}

function normalizeSituationSelection(
  input: Partial<SavedSituationSelection> | SituationId[] | null | undefined,
  allowedIds: SituationId[],
): SituationId[] {
  const rawSelected = Array.isArray(input) ? input : input?.selected
  if (!Array.isArray(rawSelected)) return []

  const allowed = new Set(allowedIds)
  const normalized: SituationId[] = []

  for (const id of rawSelected) {
    if (allowed.has(id) && !normalized.includes(id)) {
      normalized.push(id)
    }
  }

  return normalized
}

export function parseSavedSituationSelection(raw: string | null, allowedIds: SituationId[]): SituationId[] {
  if (raw === null) return []
  try {
    return normalizeSituationSelection(JSON.parse(raw) as Partial<SavedSituationSelection>, allowedIds)
  } catch {
    return []
  }
}

export function loadSavedSituationSelection(allowedIds: SituationId[]): SituationId[] {
  const saved = readLocal<Partial<SavedSituationSelection> | SituationId[]>(SITUATION_SELECTION_STORAGE_KEY)
  return normalizeSituationSelection(saved, allowedIds)
}

export function saveSituationSelection(selected: SituationId[]): void {
  if (selected.length === 0) {
    clearSavedSituationSelection()
    return
  }
  writeLocal<SavedSituationSelection>(SITUATION_SELECTION_STORAGE_KEY, { selected })
}

export function clearSavedSituationSelection(): void {
  removeLocal(SITUATION_SELECTION_STORAGE_KEY)
}
