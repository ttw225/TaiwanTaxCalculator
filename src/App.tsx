import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  CardInputMap,
  CardStatusMap,
  SituationId,
  TaxProfile,
  TaxProfilePersistenceMode,
} from './types/content'
import { CHECKLIST_ITEMS, SITUATIONS, SITUATION_GROUPS } from './content/deductions'
import { applyPublicationGate, filterBySituations, groupByCategory, sortByTriage } from './lib/checklist'
import {
  clearSavedTaxProfile,
  createPersonalizedReport,
  EMPTY_TAX_PROFILE,
  hasSavedTaxProfile,
  loadSavedTaxProfile,
  normalizeTaxProfile,
  saveTaxProfile,
} from './lib/personalizedReport'
import {
  clearSavedSituationSelection,
  loadSavedSituationSelection,
  parseSavedSituationSelection,
  saveSituationSelection,
  SITUATION_SELECTION_STORAGE_KEY,
} from './lib/situationSelectionStorage'
import { SituationSelector } from './components/SituationSelector'
import { ChecklistResult } from './components/ChecklistResult'
import { PersonalizedTaxPage } from './components/PersonalizedTaxPage'
import { SiteHeader } from './components/SiteHeader'
import { SiteFooter } from './components/SiteFooter'

const PUBLISHED_ITEMS = applyPublicationGate(CHECKLIST_ITEMS)
const SITUATION_IDS = SITUATIONS.map((s) => s.id)

type AppState = 'selecting' | 'results' | 'personalized'

function App() {
  const [appState, setAppState] = useState<AppState>('selecting')
  const [selected, setSelected] = useState<SituationId[]>(() => loadSavedSituationSelection(SITUATION_IDS))
  const [cardInputMap, setCardInputMap] = useState<CardInputMap>({})
  const [cardStatusMap, setCardStatusMap] = useState<CardStatusMap>({})
  const [taxProfile, setTaxProfile] = useState<TaxProfile>(() => loadSavedTaxProfile())
  const [profilePersistence, setProfilePersistence] = useState<TaxProfilePersistenceMode>(() =>
    hasSavedTaxProfile() ? 'local' : 'session',
  )

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [sortedCardInputMap, setSortedCardInputMap] = useState<CardInputMap>({})

  useEffect(() => {
    saveSituationSelection(selected)
  }, [selected])

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== SITUATION_SELECTION_STORAGE_KEY) return
      const syncedSelection = parseSavedSituationSelection(event.newValue, SITUATION_IDS)
      setSelected(syncedSelection)
      if (syncedSelection.length === 0) setAppState('selecting')
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  useEffect(() => {
    if (profilePersistence === 'local') {
      saveTaxProfile(taxProfile)
    } else {
      clearSavedTaxProfile()
    }
  }, [profilePersistence, taxProfile])

  function toggleSituation(id: SituationId) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  function handleGenerate() {
    if (selected.length > 0) setAppState('results')
  }

  function handleReset() {
    setAppState('selecting')
    setCardInputMap({})
    setCardStatusMap({})
    setSortedCardInputMap({})
  }

  function handleClearSelections() {
    setSelected([])
    setAppState('selecting')
    setCardInputMap({})
    setCardStatusMap({})
    setSortedCardInputMap({})
    clearSavedSituationSelection()
  }

  const handleCardInputChange = useCallback((itemId: string, fieldId: string, value: string) => {
    setCardInputMap((prev) => {
      const updated = {
        ...prev,
        [itemId]: { ...(prev[itemId] ?? {}), [fieldId]: value },
      }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        setSortedCardInputMap(updated)
      }, 300)
      return updated
    })
  }, [])

  function handleCardStatusChange(itemId: string, status: 'confirmed' | 'na') {
    setCardStatusMap((prev) => ({ ...prev, [itemId]: status }))
  }

  function handleTaxProfileChange(patch: Partial<TaxProfile>) {
    setTaxProfile((prev) => normalizeTaxProfile({ ...prev, ...patch }))
  }

  function handleTaxProfileClear() {
    setTaxProfile(EMPTY_TAX_PROFILE)
    setProfilePersistence('session')
    clearSavedTaxProfile()
  }

  const content = (() => {
    const filtered = filterBySituations(PUBLISHED_ITEMS, selected)
    const grouped = groupByCategory(filtered)
    const groups = sortByTriage(grouped, sortedCardInputMap)
    const personalizedReport = createPersonalizedReport(taxProfile, groups)

    if (appState === 'personalized') {
      return (
        <PersonalizedTaxPage
          taxProfile={taxProfile}
          personalizedReport={personalizedReport}
          profilePersistence={profilePersistence}
          hasChecklist={selected.length > 0}
          onTaxProfileChange={handleTaxProfileChange}
          onProfilePersistenceChange={setProfilePersistence}
          onTaxProfileClear={handleTaxProfileClear}
          onBackToChecklist={() => setAppState(selected.length > 0 ? 'results' : 'selecting')}
          onBackToSelection={handleReset}
        />
      )
    }

    if (appState === 'results') {
      return (
        <ChecklistResult
          groups={groups}
          totalSelected={selected.length}
          selectedSituations={selected}
          cardInputMap={cardInputMap}
          cardStatusMap={cardStatusMap}
          onCardInputChange={handleCardInputChange}
          onCardStatusChange={handleCardStatusChange}
          onOpenPersonalized={() => setAppState('personalized')}
          onReset={handleReset}
        />
      )
    }
    return (
      <SituationSelector
        groups={SITUATION_GROUPS}
        situations={SITUATIONS}
        selected={selected}
        onToggle={toggleSituation}
        onClear={handleClearSelections}
        onGenerate={handleGenerate}
      />
    )
  })()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <SiteHeader currentFeatureId="tax-checklist" />
      <main className="flex-1">
        {content}
      </main>
      <SiteFooter />
    </div>
  )
}

export default App
