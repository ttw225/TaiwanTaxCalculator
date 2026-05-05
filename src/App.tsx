import { useCallback, useEffect, useState } from 'react'
import type {
  CardInputMap,
  ChecklistItem,
  Situation,
  SituationId,
  SituationGroup,
} from './types/content'
import { CHECKLIST_ITEMS, SITUATIONS, SITUATION_GROUPS } from './content/deductions'
import { applyPublicationGate, filterBySituations, groupByCategory } from './lib/checklist'
import type { CategoryGroup } from './lib/checklist'
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

const PUBLISHED_ITEMS = applyPublicationGate(CHECKLIST_ITEMS)
const SITUATION_IDS = SITUATIONS.map((s) => s.id)
const ITEM_BY_ID = new Map(PUBLISHED_ITEMS.map((item) => [item.id, item]))
const SITUATION_LABEL_BY_ID = new Map(SITUATIONS.map((s) => [s.id, s.label]))
const LEGACY_MANUAL_OVERRIDES_STORAGE_KEY = 'tax.checklist.manualOverrides.v1'

type AppState = 'selecting' | 'results'

interface EffectiveState {
  effectiveItemIds: Set<string>
  effectiveItems: ChecklistItem[]
}

interface RemovalEffect {
  nextSelected: SituationId[]
  removedItemIds: string[]
  preview: RemovalImpactPreview
  requiresConfirm: boolean
}

function getEffectiveState(
  selected: SituationId[],
): EffectiveState {
  const filteredBySituations = filterBySituations(PUBLISHED_ITEMS, selected)
  const effectiveItemIds = new Set(filteredBySituations.map((item) => item.id))

  return {
    effectiveItemIds,
    effectiveItems: PUBLISHED_ITEMS.filter((item) => effectiveItemIds.has(item.id)),
  }
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
  const { effectiveItems } = getEffectiveState(selected)
  return groupByCategory(effectiveItems)
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
  const [appState, setAppState] = useState<AppState>('selecting')
  const [selected, setSelected] = useState<SituationId[]>(() => loadSavedSituationSelection(SITUATION_IDS))
  const [cardInputMap, setCardInputMap] = useState<CardInputMap>({})

  const [pendingRemovalEffect, setPendingRemovalEffect] = useState<RemovalEffect | null>(null)
  const [scrollToItemId, setScrollToItemId] = useState<string | null>(null)

  useEffect(() => {
    saveSituationSelection(selected)
  }, [selected])

  useEffect(() => {
    // Clean up deprecated pre-v2 checklist overrides data to keep refresh behavior deterministic.
    localStorage.removeItem(LEGACY_MANUAL_OVERRIDES_STORAGE_KEY)
  }, [])

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === SITUATION_SELECTION_STORAGE_KEY) {
        const syncedSelection = parseSavedSituationSelection(event.newValue, SITUATION_IDS)
        setSelected(syncedSelection)
        if (syncedSelection.length === 0) setAppState('selecting')
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
      window.scrollTo(0, 0)
    }
  }

  function handleClearSelections() {
    setSelected([])
    setAppState('selecting')
    setCardInputMap({})
    setPendingRemovalEffect(null)
    setScrollToItemId(null)
    clearSavedSituationSelection()
    localStorage.removeItem(LEGACY_MANUAL_OVERRIDES_STORAGE_KEY)
  }

  function handleAddSituations(ids: SituationId[]) {
    setPendingRemovalEffect(null)
    if (ids.length === 0) return

    const uniqueAddedIds = ids.filter((id) => !selected.includes(id))
    if (uniqueAddedIds.length === 0) return

    const nextSelected = [...selected, ...uniqueAddedIds]
    setScrollToItemId(getScrollTargetItemIdAfterAdd(selected, nextSelected))
    setSelected(nextSelected)
  }

  function createRemovalEffect(itemId: string): RemovalEffect | null {
    const targetItem = ITEM_BY_ID.get(itemId)
    if (!targetItem) return null

    const current = getEffectiveState(selected)
    const nextSelected = selected.filter((id) => !targetItem.situations.includes(id))
    const next = getEffectiveState(nextSelected)

    const removedItemIds = Array.from(current.effectiveItemIds).filter((id) => !next.effectiveItemIds.has(id))
    const affectedSituationIds = selected.filter((id) => targetItem.situations.includes(id))
    const affectedSituationLabels = affectedSituationIds
      .map((id) => SITUATION_LABEL_BY_ID.get(id) ?? id)
    const removedItemTitles = removedItemIds
      .map((id) => ITEM_BY_ID.get(id)?.title ?? id)
    const hasInputLoss = removedItemIds.some((id) => hasCardData(id, cardInputMap))

    return {
      nextSelected,
      removedItemIds,
      preview: {
        itemId,
        itemTitle: targetItem.title,
        affectedSituationLabels,
        removedItemTitles,
        hasInputLoss,
      },
      requiresConfirm: removedItemIds.length > 1 || hasInputLoss,
    }
  }

  function applyRemovalEffect(effect: RemovalEffect) {
    setSelected(effect.nextSelected)
    setCardInputMap((prev) => omitIdsFromCardInputMap(prev, effect.removedItemIds))
    if (effect.nextSelected.length === 0) {
      // Keep this behavior as the canonical UX: empty checklist returns to page one.
      setScrollToItemId(null)
      setAppState('selecting')
      window.scrollTo(0, 0)
    }
  }

  function handleRemoveItem(itemId: string) {
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
    const { effectiveItems } = getEffectiveState(selected)
    const groups = groupByCategory(effectiveItems)
    const addableSituationGroups = getAddableSituationGroups(SITUATION_GROUPS, SITUATIONS, selected)
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
