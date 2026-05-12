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
  CHECKLIST_VIEW_STATE_STORAGE_KEY,
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
import { INCOME_CARD_IDS, INCOME_PARTICIPANTS_ITEM_ID } from './lib/grossIncome'
import { SituationSelector } from './components/SituationSelector'
import { ChecklistResult } from './components/ChecklistResult'
import type { RemovalImpactPreview } from './components/ChecklistResult'
import { IntroPage } from './components/IntroPage'
import { SiteHeader } from './components/SiteHeader'
import { SiteFooter } from './components/SiteFooter'
import { BackToTopButton } from './components/BackToTopButton'

const SITUATION_IDS = SITUATIONS.map((s) => s.id)
const VISIBLE_SITUATION_ID_SET = new Set<SituationId>(SITUATION_IDS)
const ITEM_BY_ID = new Map(CHECKLIST_ITEMS.map((item) => [item.id, item]))
const SITUATION_LABEL_BY_ID = new Map(SITUATIONS.map((s) => [s.id, s.label]))
const LEGACY_MANUAL_OVERRIDES_STORAGE_KEY = 'tax.checklist.manualOverrides.v1'
const CHECKLIST_GENERATED_STORAGE_KEY = 'tax.checklist.generated.v1'

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
  'savings-investment-deduction',
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

function normalizeLinkedSituations(selected: SituationId[]): SituationId[] {
  const next = new Set(selected)
  if (next.has('interest_income')) {
    next.add('savings_investment')
  } else {
    next.delete('savings_investment')
  }
  return Array.from(next)
}

function countVisibleSelectedSituations(selected: SituationId[]): number {
  return selected.filter((id) => VISIBLE_SITUATION_ID_SET.has(id)).length
}

function getGroupedItemsBySelection(selected: SituationId[]): CategoryGroup[] {
  return groupByCategory(filterBySituations(CHECKLIST_ITEMS, selected))
}

function getScrollTargetAfterAdd(
  currentSelected: SituationId[],
  nextSelected: SituationId[],
): string | null {
  const currentGroups = getGroupedItemsBySelection(currentSelected)
  const nextGroups = getGroupedItemsBySelection(nextSelected)

  const currentItemIdSet = new Set(currentGroups.flatMap((group) => group.items.map((item) => item.id)))
  const nextItemsInRenderOrder = nextGroups.flatMap((group) => group.items)
  const firstAddedItem = nextItemsInRenderOrder.find((item) => !currentItemIdSet.has(item.id))
  const addedSituationSet = new Set(nextSelected.filter((id) => !currentSelected.includes(id)))
  const hasGrossIncomeSituations = nextSelected.some((id) => (
    id === 'salary_income' ||
    id === 'dividends' ||
    id === 'interest_income' ||
    id === 'other_income' ||
    id === 'overseas_income'
  ))

  if (firstAddedItem) return firstAddedItem.id

  if (addedSituationSet.has('married')) {
    return hasGrossIncomeSituations ? 'section:gross_income' : 'section:general_deductions'
  }

  return null
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

function loadSavedChecklistGeneratedFlag(): boolean {
  try {
    const raw = localStorage.getItem(CHECKLIST_GENERATED_STORAGE_KEY)
    if (raw === null) return false
    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed === 'boolean') return parsed
    if (typeof parsed === 'object' && parsed !== null && 'generated' in parsed) {
      return Boolean((parsed as { generated?: unknown }).generated)
    }
    return false
  } catch {
    return false
  }
}

function saveChecklistGeneratedFlag(generated: boolean): void {
  try {
    if (generated) {
      localStorage.setItem(CHECKLIST_GENERATED_STORAGE_KEY, JSON.stringify(true))
      return
    }
    localStorage.removeItem(CHECKLIST_GENERATED_STORAGE_KEY)
  } catch {
    // localStorage unavailable (private browsing, iframe restrictions)
  }
}

function App() {
  const [selected, setSelected] = useState<SituationId[]>(() =>
    normalizeLinkedSituations(loadSavedSituationSelection(SITUATION_IDS)),
  )
  const [hasGeneratedChecklist, setHasGeneratedChecklist] = useState<boolean>(() => {
    const savedSelection = normalizeLinkedSituations(loadSavedSituationSelection(SITUATION_IDS))
    if (savedSelection.length === 0) return false
    return loadSavedChecklistGeneratedFlag()
  })
  const [appState, setAppState] = useState<AppState>(() => {
    const savedViewState = loadSavedChecklistViewState()
    const savedSelection = normalizeLinkedSituations(loadSavedSituationSelection(SITUATION_IDS))
    const hasSavedViewState = localStorage.getItem(CHECKLIST_VIEW_STATE_STORAGE_KEY) !== null
    if (hasSavedViewState) {
      if (savedViewState === 'intro') return 'intro'
      if (savedViewState === 'selecting') return 'selecting'
      if (savedViewState === 'results' && savedSelection.length > 0) return 'results'
    }
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
    saveChecklistGeneratedFlag(hasGeneratedChecklist)
  }, [hasGeneratedChecklist])

  useEffect(() => {
    // Clean up deprecated pre-v2 checklist overrides data to keep refresh behavior deterministic.
    localStorage.removeItem(LEGACY_MANUAL_OVERRIDES_STORAGE_KEY)
  }, [])

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key === SITUATION_SELECTION_STORAGE_KEY) {
        const syncedSelection = normalizeLinkedSituations(parseSavedSituationSelection(event.newValue, SITUATION_IDS))
        setSelected(syncedSelection)
        if (syncedSelection.length === 0) {
          setHasGeneratedChecklist(false)
          setAppState('selecting')
        }
      }
    }

    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  function toggleSituation(id: SituationId) {
    setPendingRemovalEffect(null)
    if (id === 'savings_investment') return
    setSelected((prev) => {
      const toggled = prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
      return normalizeLinkedSituations(toggled)
    })
  }

  function handleGenerate() {
    if (selected.length > 0) {
      setScrollToItemId(null)
      setHasGeneratedChecklist(true)
      setAppState('results')
      window.scrollTo(0, 0)
    }
  }

  function navigateToChecklistFlow() {
    setScrollToItemId(null)
    if (hasGeneratedChecklist && selected.length > 0) {
      setAppState('results')
    } else {
      setAppState('selecting')
    }
    window.scrollTo(0, 0)
  }

  function navigateToIntro() {
    setScrollToItemId(null)
    setAppState('intro')
    window.scrollTo(0, 0)
  }

  function resetChecklistState() {
    setSelected([])
    setHasGeneratedChecklist(false)
    setAppState('selecting')
    setCardInputMap({})
    setPendingRemovalEffect(null)
    setScrollToItemId(null)
    clearSavedSituationSelection()
    clearSavedChecklistInputMap()
    clearSavedChecklistViewState()
    saveChecklistGeneratedFlag(false)
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

    const nextSelected = normalizeLinkedSituations(Array.from(new Set([...selected, ...ids])))
    if (nextSelected.length === selected.length) return

    setScrollToItemId(getScrollTargetAfterAdd(selected, nextSelected))
    setSelected(nextSelected)
  }

  function createRemovalEffect(itemId: string): RemovalEffect | null {
    const targetItem = ITEM_BY_ID.get(itemId)
    if (!targetItem) return null

    const linkedItemIds = itemId === 'interest-income'
      ? [itemId, 'savings-investment-deduction']
      : [itemId]
    const hasInputLoss = linkedItemIds.some((id) => hasCardData(id, cardInputMap))

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
    if (effect.itemId === 'interest-income') {
      removedSituationIds.add('savings_investment')
    }
    const nextSelected = normalizeLinkedSituations(
      selected.filter((situationId) => !removedSituationIds.has(situationId)),
    )
    setSelected(nextSelected)
    setCardInputMap((prev) => {
      const removedIds = effect.itemId === 'interest-income'
        ? [effect.itemId, 'savings-investment-deduction']
        : [effect.itemId]
      const next = omitIdsFromCardInputMap(prev, removedIds)
      if (!INCOME_CARD_IDS.some((id) => id in next)) {
        delete next[INCOME_PARTICIPANTS_ITEM_ID]
      }
      return next
    })
    if (nextSelected.length === 0) {
      setScrollToItemId(null)
      setHasGeneratedChecklist(false)
      setAppState('selecting')
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
      return <IntroPage onStart={navigateToChecklistFlow} />
    }

    if (appState === 'results') {
      return (
        <ChecklistResult
          groups={groups}
          totalSelected={countVisibleSelectedSituations(selected)}
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
        onHome={navigateToIntro}
        onNavClick={() => navigateToChecklistFlow()}
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
