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
import { SiteHeader } from './components/SiteHeader'
import { SiteFooter } from './components/SiteFooter'
import { BackToTopButton } from './components/BackToTopButton'

const SITUATION_IDS = SITUATIONS.map((s) => s.id)
const ITEM_BY_ID = new Map(CHECKLIST_ITEMS.map((item) => [item.id, item]))
const SITUATION_LABEL_BY_ID = new Map(SITUATIONS.map((s) => [s.id, s.label]))
const LEGACY_MANUAL_OVERRIDES_STORAGE_KEY = 'tax.checklist.manualOverrides.v1'

type AppState = 'selecting' | 'results'

interface EffectiveState {
  effectiveItemIds: Set<string>
  effectiveItems: ChecklistItem[]
}

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

function getEffectiveState(
  selected: SituationId[],
): EffectiveState {
  const filteredBySituations = filterBySituations(CHECKLIST_ITEMS, selected)
  const effectiveItemIds = new Set(filteredBySituations.map((item) => item.id))

  return {
    effectiveItemIds,
    effectiveItems: CHECKLIST_ITEMS.filter((item) => effectiveItemIds.has(item.id)),
  }
}

function getActiveItemIdsFromSelectedSituations(selected: SituationId[]): Set<string> {
  return getEffectiveState(selected).effectiveItemIds
}

function getActiveItems(activeItemIds: Set<string>): ChecklistItem[] {
  return CHECKLIST_ITEMS.filter((item) => activeItemIds.has(item.id))
}

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
  activeItemIds: Set<string>,
): AddableSituationGroup[] {
  const selectedSet = new Set(selected)
  const situationMap = new Map(situations.map((s) => [s.id, s]))
  return groups
    .map((group) => {
      const addable = group.situationIds
        .filter((id) => {
          const nextSelected = selectedSet.has(id) ? selected : [...selected, id]
          const nextActiveItemIds = getActiveItemIdsFromSelectedSituations(nextSelected)
          const hasMissingItem = Array.from(nextActiveItemIds).some((itemId) => !activeItemIds.has(itemId))
          return hasMissingItem && !selectedSet.has(id)
        })
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

function getGroupedItemsByActiveItemIds(activeItemIds: Set<string>): CategoryGroup[] {
  return groupByCategory(getActiveItems(activeItemIds))
}

function getScrollTargetItemIdAfterAdd(
  currentActiveItemIds: Set<string>,
  nextActiveItemIds: Set<string>,
): string | null {
  const currentGroups = getGroupedItemsByActiveItemIds(currentActiveItemIds)
  const nextGroups = getGroupedItemsByActiveItemIds(nextActiveItemIds)

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
  const [activeItemIds, setActiveItemIds] = useState<Set<string>>(() => getActiveItemIdsFromSelectedSituations(loadSavedSituationSelection(SITUATION_IDS)))
  const [appState, setAppState] = useState<AppState>(() => {
    const savedViewState = loadSavedChecklistViewState()
    const savedSelection = loadSavedSituationSelection(SITUATION_IDS)
    return savedViewState === 'results' && savedSelection.length > 0 ? 'results' : 'selecting'
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
        setActiveItemIds(getActiveItemIdsFromSelectedSituations(syncedSelection))
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
    setSelected((prev) => {
      const nextSelected = prev.includes(id)
        ? prev.filter((s) => s !== id)
        : [...prev, id]
      if (appState === 'selecting') {
        setActiveItemIds(getActiveItemIdsFromSelectedSituations(nextSelected))
      }
      return nextSelected
    })
  }

  function handleGenerate() {
    if (selected.length > 0) {
      setActiveItemIds(getActiveItemIdsFromSelectedSituations(selected))
      setScrollToItemId(null)
      setAppState('results')
      saveChecklistViewState('results')
      window.scrollTo(0, 0)
    }
  }

  function resetChecklistState() {
    setSelected([])
    setActiveItemIds(new Set())
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
    const nextActiveItemIds = getActiveItemIdsFromSelectedSituations(nextSelected)
    const hasAddedItems = Array.from(nextActiveItemIds).some((itemId) => !activeItemIds.has(itemId))
    if (!hasAddedItems) return

    setScrollToItemId(getScrollTargetItemIdAfterAdd(activeItemIds, nextActiveItemIds))
    setSelected(nextSelected)
    setActiveItemIds(nextActiveItemIds)
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
    setActiveItemIds((prev) => {
      const next = new Set(prev)
      next.delete(effect.itemId)
      setSelected((currentSelected) =>
        currentSelected.filter((situationId) =>
          CHECKLIST_ITEMS.some((item) => next.has(item.id) && item.situations.includes(situationId)),
        ),
      )
      return next
    })
    setCardInputMap((prev) => omitIdsFromCardInputMap(prev, [effect.itemId]))
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
    const effectiveItems = getActiveItems(activeItemIds)
    const groups = groupByCategory(effectiveItems)
    const addableSituationGroups = getAddableSituationGroups(
      SITUATION_GROUPS,
      SITUATIONS,
      selected,
      activeItemIds,
    )
    const itemSourceSituationLabelsById = getItemSourceSituationLabelsById(selected, effectiveItems)

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
      <SiteHeader currentFeatureId="tax-checklist" />
      <main className="flex-1">
        {content}
      </main>
      <SiteFooter />
      <BackToTopButton />
    </div>
  )
}

export default App
