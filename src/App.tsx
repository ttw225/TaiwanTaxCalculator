import { useCallback, useEffect, useState } from 'react'
import type {
  CardInputMap,
  ChecklistItem,
  Situation,
  SituationId,
  SituationGroup,
} from './types/content'
import { CHECKLIST_ITEMS, SITUATIONS, SITUATION_GROUPS } from './content/deductions'
import { filterBySituations, groupByCategory } from './lib/checklist'
import type { CategoryGroup } from './lib/checklist'
import {
  clearSavedChecklistInputMap,
  loadSavedChecklistInputMap,
  saveChecklistInputMap,
} from './lib/checklistInputStorage'
import {
  clearSavedChecklistViewState,
  loadSavedChecklistViewState,
  saveChecklistViewState,
} from './lib/checklistViewStateStorage'
import {
  clearSavedSituationSelection,
  loadSavedSituationSelection,
  parseSavedSituationSelection,
  saveSituationSelection,
  SITUATION_SELECTION_STORAGE_KEY,
} from './lib/situationSelectionStorage'
import { SituationSelector } from './components/SituationSelector'
import { ChecklistResult } from './components/ChecklistResult'
import type { RemovalImpactPreview } from './components/ChecklistResult'
import { IntroPage } from './components/IntroPage'
import { SiteHeader } from './components/SiteHeader'
import { SiteFooter } from './components/SiteFooter'
import { BackToTopButton } from './components/BackToTopButton'

const SITUATION_IDS = SITUATIONS.map((s) => s.id)
const ITEM_BY_ID = new Map(CHECKLIST_ITEMS.map((item) => [item.id, item]))
const SITUATION_LABEL_BY_ID = new Map(SITUATIONS.map((s) => [s.id, s.label]))
const LEGACY_MANUAL_OVERRIDES_STORAGE_KEY = 'tax.checklist.manualOverrides.v1'

type AppState = 'intro' | 'selecting' | 'results'

interface RemovalEffect {
  itemId: string
  preview: RemovalImpactPreview
  requiresConfirm: boolean
}

const NON_REMOVABLE_ITEM_IDS = new Set([
  'exemption-general',
  'standard-deduction-single',
  'standard-deduction-married',
])

interface AddableSituationGroup {
  id: string
  title: string
  description: string
  situations: Situation[]
}

function getAddableSituationGroups(
  groups: SituationGroup[],
  situations: Situation[],
  selected: SituationId[],
): AddableSituationGroup[] {
  const selectedSet = new Set(selected)
  const situationMap = new Map(situations.map((s) => [s.id, s]))
  return groups
    .map((group) => {
      const addable = group.situationIds
        .filter((id) => !selectedSet.has(id))
        .map((id) => situationMap.get(id))
        .filter((s): s is Situation => Boolean(s))
      return {
        id: group.id,
        title: group.title,
        description: group.description,
        situations: addable,
      }
    })
    .filter((group) => group.situations.length > 0)
}

function hasCardData(
  itemId: string,
  cardInputMap: CardInputMap,
): boolean {
  return Object.values(cardInputMap[itemId] ?? {}).some((value) => value !== '')
}

function omitIdsFromCardInputMap(map: CardInputMap, itemIds: string[]): CardInputMap {
  const next = { ...map }
  for (const itemId of itemIds) {
    delete next[itemId]
  }
  return next
}

function getGroupedItemsBySelection(selected: SituationId[]): CategoryGroup[] {
  return groupByCategory(filterBySituations(CHECKLIST_ITEMS, selected))
}

function getScrollTargetItemIdAfterAdd(
  currentSelected: SituationId[],
  nextSelected: SituationId[],
): string | null {
  const currentGroups = getGroupedItemsBySelection(currentSelected)
  const nextGroups = getGroupedItemsBySelection(nextSelected)

  const currentItemIdSet = new Set(currentGroups.flatMap((group) => group.items.map((item) => item.id)))
  const nextItemsInRenderOrder = nextGroups.flatMap((group) => group.items)
  const firstAddedItem = nextItemsInRenderOrder.find((item) => !currentItemIdSet.has(item.id))

  return firstAddedItem?.id ?? null
}

function getItemSourceSituationLabelsById(
  selected: SituationId[],
  effectiveItems: ChecklistItem[],
): Record<string, string[]> {
  const selectedSet = new Set(selected)
  const linkedItemCountBySituation = new Map<SituationId, number>()
  for (const situationId of selected) {
    const linkedCount = effectiveItems.filter((item) => item.situations.includes(situationId)).length
    linkedItemCountBySituation.set(situationId, linkedCount)
  }

  const itemSourceSituationLabelsById: Record<string, string[]> = {}

  for (const item of effectiveItems) {
    const matchedSituationIds = item.situations.filter((id) => selectedSet.has(id))
    const hasMultiSituationMatch = matchedSituationIds.length > 1
    const hasLinkedSituation = matchedSituationIds.some((id) => (linkedItemCountBySituation.get(id) ?? 0) > 1)
    const shouldShowSourceLabel = hasMultiSituationMatch || hasLinkedSituation
    if (!shouldShowSourceLabel) continue

    const sourceLabels = matchedSituationIds
      .map((id) => SITUATION_LABEL_BY_ID.get(id) ?? id)
    if (sourceLabels.length > 0) {
      itemSourceSituationLabelsById[item.id] = sourceLabels
    }
  }

  return itemSourceSituationLabelsById
}

function App() {
  const [selected, setSelected] = useState<SituationId[]>(() => loadSavedSituationSelection(SITUATION_IDS))
  const [appState, setAppState] = useState<AppState>(() => {
    const savedViewState = loadSavedChecklistViewState()
    const savedSelection = loadSavedSituationSelection(SITUATION_IDS)
    if (savedViewState === 'intro') return 'intro'
    if (savedViewState === 'results' && savedSelection.length > 0) return 'results'
    if (savedSelection.length > 0) return 'selecting'
    return 'intro'
  })
  const [cardInputMap, setCardInputMap] = useState<CardInputMap>(() => loadSavedChecklistInputMap())

  const [pendingRemovalEffect, setPendingRemovalEffect] = useState<RemovalEffect | null>(null)
  const [scrollToItemId, setScrollToItemId] = useState<string | null>(null)

  useEffect(() => {
    saveSituationSelection(selected)
  }, [selected])

  useEffect(() => {
    saveChecklistInputMap(cardInputMap)
  }, [cardInputMap])

  useEffect(() => {
    saveChecklistViewState(appState)
  }, [appState])

  useEffect(() => {
    // Clean up deprecated pre-v2 checklist overrides data to keep refresh behavior deterministic.
    localStorage.removeItem(LEGACY_MANUAL_OVERRIDES_STORAGE_KEY)
  }, [])

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === SITUATION_SELECTION_STORAGE_KEY) {
        const syncedSelection = parseSavedSituationSelection(event.newValue, SITUATION_IDS)
        setSelected(syncedSelection)
        if (syncedSelection.length === 0) {
          setAppState('selecting')
          saveChecklistViewState('selecting')
        }
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  function toggleSituation(id: SituationId) {
    setPendingRemovalEffect(null)
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    )
  }

  function handleGenerate() {
    if (selected.length > 0) {
      setScrollToItemId(null)
      setAppState('results')
      saveChecklistViewState('results')
      window.scrollTo(0, 0)
    }
  }

  function resetChecklistState() {
    setSelected([])
    setAppState('selecting')
    setCardInputMap({})
    setPendingRemovalEffect(null)
    setScrollToItemId(null)
    clearSavedSituationSelection()
    clearSavedChecklistInputMap()
    clearSavedChecklistViewState()
    localStorage.removeItem(LEGACY_MANUAL_OVERRIDES_STORAGE_KEY)
    window.scrollTo(0, 0)
  }

  function handleClearSelections() {
    resetChecklistState()
  }

  function handleResetCalculation() {
    resetChecklistState()
  }

  function handleAddSituations(ids: SituationId[]) {
    setPendingRemovalEffect(null)
    if (ids.length === 0) return

    const nextSelected = Array.from(new Set([...selected, ...ids]))
    if (nextSelected.length === selected.length) return

    setScrollToItemId(getScrollTargetItemIdAfterAdd(selected, nextSelected))
    setSelected(nextSelected)
  }

  function createRemovalEffect(itemId: string): RemovalEffect | null {
    const targetItem = ITEM_BY_ID.get(itemId)
    if (!targetItem) return null

    const hasInputLoss = hasCardData(itemId, cardInputMap)

    return {
      itemId,
      preview: {
        itemId,
        itemTitle: targetItem.title,
        hasInputLoss,
      },
      requiresConfirm: hasInputLoss,
    }
  }

  function applyRemovalEffect(effect: RemovalEffect) {
    const targetItem = ITEM_BY_ID.get(effect.itemId)
    if (!targetItem) return
    const removedSituationIds = new Set(targetItem.situations)
    const nextSelected = selected.filter((situationId) => !removedSituationIds.has(situationId))
    setSelected(nextSelected)
    setCardInputMap((prev) => omitIdsFromCardInputMap(prev, [effect.itemId]))
    if (nextSelected.length === 0) {
      setScrollToItemId(null)
      setAppState('selecting')
      saveChecklistViewState('selecting')
      window.scrollTo(0, 0)
    }
  }

  function handleRemoveItem(itemId: string) {
    if (NON_REMOVABLE_ITEM_IDS.has(itemId)) return
    const effect = createRemovalEffect(itemId)
    if (!effect) return
    if (!effect.requiresConfirm) {
      applyRemovalEffect(effect)
      setPendingRemovalEffect(null)
      return
    }
    setPendingRemovalEffect(effect)
  }

  function handleCancelRemoveItem() {
    setPendingRemovalEffect(null)
  }

  function handleConfirmRemoveItem() {
    if (!pendingRemovalEffect) return
    applyRemovalEffect(pendingRemovalEffect)
    setPendingRemovalEffect(null)
  }

  const handleCardInputChange = useCallback((itemId: string, fieldId: string, value: string) => {
    setCardInputMap((prev) => ({
      ...prev,
      [itemId]: { ...(prev[itemId] ?? {}), [fieldId]: value },
    }))
  }, [])

  const content = (() => {
    const effectiveItems = filterBySituations(CHECKLIST_ITEMS, selected)
    const groups = groupByCategory(effectiveItems)
    const addableSituationGroups = getAddableSituationGroups(
      SITUATION_GROUPS,
      SITUATIONS,
      selected,
    )
    const itemSourceSituationLabelsById = getItemSourceSituationLabelsById(selected, effectiveItems)

    if (appState === 'intro') {
      return <IntroPage onStart={() => setAppState('selecting')} />
    }

    if (appState === 'results') {
      return (
        <ChecklistResult
          groups={groups}
          totalSelected={selected.length}
          selectedSituations={selected}
          itemSourceSituationLabelsById={itemSourceSituationLabelsById}
          addableSituationGroups={addableSituationGroups}
          cardInputMap={cardInputMap}
          pendingRemovalImpact={pendingRemovalEffect?.preview ?? null}
          onCardInputChange={handleCardInputChange}
          onAddSituations={handleAddSituations}
          onRemoveItem={handleRemoveItem}
          onCancelRemoveItem={handleCancelRemoveItem}
          onConfirmRemoveItem={handleConfirmRemoveItem}
          scrollToItemId={scrollToItemId}
          onScrollHandled={() => setScrollToItemId(null)}
          onReset={handleResetCalculation}
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
      <SiteHeader
        currentFeatureId="tax-checklist"
        onHome={() => setAppState('intro')}
        onNavClick={() => setAppState('selecting')}
      />
      <main className="flex-1">
        {content}
      </main>
      <SiteFooter />
      <BackToTopButton />
    </div>
  )
}

export default App
