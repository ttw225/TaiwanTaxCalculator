import type { CardInputMap } from '../types/content'
import { readLocal, removeLocal, writeLocal } from './storage'

const BASE_STORAGE_KEY = 'tax.checklist.inputs.v1'

export function createChecklistInputStorageKey(basePath: string | undefined = import.meta.env.BASE_URL): string {
  if (!basePath || basePath === '/') return BASE_STORAGE_KEY
  return `${BASE_STORAGE_KEY}:${basePath}`
}

export const CHECKLIST_INPUT_STORAGE_KEY = createChecklistInputStorageKey()

interface SavedChecklistInput {
  cardInputMap: CardInputMap
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
      if (typeof value === 'string') {
        normalizedFieldValues[fieldId] = value
      }
    }

    normalized[itemId] = normalizedFieldValues
  }

  return normalized
}

export function loadSavedChecklistInputMap(): CardInputMap {
  const saved = readLocal<Partial<SavedChecklistInput> | CardInputMap>(CHECKLIST_INPUT_STORAGE_KEY)
  if (!saved) return {}
  if ('cardInputMap' in saved) {
    return normalizeCardInputMap(saved.cardInputMap)
  }
  return normalizeCardInputMap(saved)
}

export function saveChecklistInputMap(cardInputMap: CardInputMap): void {
  if (Object.keys(cardInputMap).length === 0) {
    clearSavedChecklistInputMap()
    return
  }
  writeLocal<SavedChecklistInput>(CHECKLIST_INPUT_STORAGE_KEY, { cardInputMap })
}

export function clearSavedChecklistInputMap(): void {
  removeLocal(CHECKLIST_INPUT_STORAGE_KEY)
}
