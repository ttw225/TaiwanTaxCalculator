import { SITUATIONS } from '../content/deductions'
import { loadSavedSituationSelection } from './situationSelectionStorage'
import { readLocal } from './storage'

const CHECKLIST_GENERATED_STORAGE_KEY = 'tax.checklist.generated.v1'
const SITUATION_IDS = SITUATIONS.map((s) => s.id)

function loadSavedChecklistGeneratedFlag(): boolean {
  const parsed = readLocal<unknown>(CHECKLIST_GENERATED_STORAGE_KEY)
  if (parsed === null) return false
  if (typeof parsed === 'boolean') return parsed
  if (typeof parsed === 'object' && parsed !== null && 'generated' in parsed) {
    return Boolean((parsed as { generated?: unknown }).generated)
  }
  return false
}

export function getChecklistEntryPath(): '/checklist' | '/checklist/start' {
  const selected = loadSavedSituationSelection(SITUATION_IDS)
  if (selected.length > 0 && loadSavedChecklistGeneratedFlag()) return '/checklist'
  return '/checklist/start'
}
