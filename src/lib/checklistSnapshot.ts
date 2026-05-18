import { SITUATIONS } from '../content/deductions'
import type { CardInputMap, SituationId } from '../types/content'
import { loadSavedChecklistInputMap } from './checklistInputStorage'
import { loadSavedSituationSelection } from './situationSelectionStorage'
import { readLocal, removeLocal, writeLocal } from './storage'

export const CHECKLIST_GENERATED_STORAGE_KEY = 'tax.checklist.generated.v1'
export const CHECKLIST_NAVIGATION_STATE_KEY = 'checklistSnapshot'

const SITUATION_IDS = SITUATIONS.map((s) => s.id)
const SITUATION_ID_SET = new Set<SituationId>(SITUATION_IDS)

export interface ChecklistSnapshot {
  selected: SituationId[]
  hasGeneratedChecklist: boolean
  cardInputMap: CardInputMap
}

export interface ChecklistNavigationState {
  [CHECKLIST_NAVIGATION_STATE_KEY]: ChecklistSnapshot
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeCardInputMap(input: unknown): CardInputMap {
  if (!isRecord(input)) return {}

  const normalized: CardInputMap = {}
  for (const [itemId, fieldValue] of Object.entries(input)) {
    if (!isRecord(fieldValue)) continue

    const normalizedFieldValues: Record<string, string> = {}
    for (const [fieldId, value] of Object.entries(fieldValue)) {
      if (typeof value === 'string') normalizedFieldValues[fieldId] = value
    }

    normalized[itemId] = normalizedFieldValues
  }

  return normalized
}

export function normalizeChecklistSituations(selected: SituationId[]): SituationId[] {
  const next = new Set(selected.filter((id) => SITUATION_ID_SET.has(id)))
  if (next.has('interest_income')) {
    next.add('savings_investment')
  } else {
    next.delete('savings_investment')
  }
  return Array.from(next)
}

export function loadSavedChecklistGeneratedFlag(): boolean {
  const parsed = readLocal<unknown>(CHECKLIST_GENERATED_STORAGE_KEY)
  if (parsed === null) return false
  if (typeof parsed === 'boolean') return parsed
  if (typeof parsed === 'object' && parsed !== null && 'generated' in parsed) {
    return Boolean((parsed as { generated?: unknown }).generated)
  }
  return false
}

export function saveChecklistGeneratedFlag(generated: boolean): void {
  if (generated) {
    writeLocal(CHECKLIST_GENERATED_STORAGE_KEY, true)
    return
  }
  removeLocal(CHECKLIST_GENERATED_STORAGE_KEY)
}

export function loadSavedChecklistSnapshot(): ChecklistSnapshot {
  const selected = normalizeChecklistSituations(loadSavedSituationSelection(SITUATION_IDS))
  return {
    selected,
    cardInputMap: loadSavedChecklistInputMap(),
    hasGeneratedChecklist: selected.length > 0 ? loadSavedChecklistGeneratedFlag() : false,
  }
}

export function createChecklistSnapshot(
  selected: SituationId[],
  hasGeneratedChecklist: boolean,
  cardInputMap: CardInputMap,
): ChecklistSnapshot {
  const normalizedSelected = normalizeChecklistSituations(selected)
  return {
    selected: normalizedSelected,
    hasGeneratedChecklist: normalizedSelected.length > 0 && hasGeneratedChecklist,
    cardInputMap,
  }
}

export function getChecklistEntryPathFromSnapshot(snapshot: ChecklistSnapshot): '/checklist' | '/checklist/start' {
  return snapshot.selected.length > 0 && snapshot.hasGeneratedChecklist ? '/checklist' : '/checklist/start'
}

export function createChecklistNavigationState(snapshot: ChecklistSnapshot): ChecklistNavigationState {
  return { [CHECKLIST_NAVIGATION_STATE_KEY]: snapshot }
}

export function getChecklistSnapshotFromNavigationState(state: unknown): ChecklistSnapshot | null {
  if (!isRecord(state)) return null
  const snapshot = state[CHECKLIST_NAVIGATION_STATE_KEY]
  if (!isRecord(snapshot)) return null

  const selected = Array.isArray(snapshot.selected)
    ? normalizeChecklistSituations(snapshot.selected.filter((id): id is SituationId => typeof id === 'string'))
    : []
  if (selected.length === 0) return null

  return {
    selected,
    hasGeneratedChecklist: Boolean(snapshot.hasGeneratedChecklist),
    cardInputMap: normalizeCardInputMap(snapshot.cardInputMap),
  }
}
