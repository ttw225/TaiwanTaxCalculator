import { getChecklistEntryPathFromSnapshot, loadSavedChecklistSnapshot } from './checklistSnapshot'

export function getChecklistEntryPath(): '/checklist' | '/checklist/start' {
  return getChecklistEntryPathFromSnapshot(loadSavedChecklistSnapshot())
}
