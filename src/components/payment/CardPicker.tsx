import { useEffect, useMemo, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import { X } from 'lucide-react'
import { getAllCards, getCard } from '../../lib/cardCatalog'
import type { CatalogCard } from '../../types/paymentOffers'

interface CardPickerProps {
  value: Set<string>
  onChange: (next: Set<string>) => void
}

const MAX_MENU_ITEMS = 30
const BANK_ALIASES_BY_NORMALIZED_NAME = new Map<string, string[]>([
  ['台灣銀行', ['台灣銀行', '台銀']],
  ['土地銀行', ['土銀']],
  ['合作金庫', ['合庫']],
])

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replaceAll('臺', '台')
}

function getBankAliases(bankName: string): string[] {
  return BANK_ALIASES_BY_NORMALIZED_NAME.get(normalizeSearchText(bankName)) ?? []
}

function formatCardDisplayName(displayName: string): string {
  if (!displayName.includes('DAWHO') || displayName.includes('大戶')) return displayName
  return displayName.replace('DAWHO', 'DAWHO 大戶')
}

export function CardPicker({ value, onChange }: CardPickerProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const tokenAreaRef = useRef<HTMLDivElement>(null)

  const allCards = useMemo(() => getAllCards(), [])

  const items = useMemo<CatalogCard[]>(() => {
    const q = normalizeSearchText(query.trim())
    if (!q) return []
    const out: CatalogCard[] = []
    for (const c of allCards) {
      if (value.has(c.card_id)) continue
      const displayName = formatCardDisplayName(c.display_name_zh)
      const bankAliases = getBankAliases(c.bank_name)
      const hay = normalizeSearchText(
        `${c.display_name_zh} ${displayName} ${c.bank_name} ${bankAliases.join(' ')}`,
      )
      if (hay.includes(q)) out.push(c)
      if (out.length >= MAX_MENU_ITEMS + 1) break
    }
    return out
  }, [query, allCards, value])

  const visibleItems = items.slice(0, MAX_MENU_ITEMS)
  // Clamp highlight in case items shrink (e.g. typing narrows list past current idx).
  const safeHighlightedIndex = Math.min(
    Math.max(highlightedIndex, 0),
    Math.max(visibleItems.length - 1, 0),
  )

  const selectedList = useMemo(() => {
    const out: CatalogCard[] = []
    for (const id of value) {
      const c = getCard(id)
      if (c) out.push(c)
    }
    return out
  }, [value])

  function addCard(cardId: string) {
    if (value.has(cardId)) return
    const next = new Set(value)
    next.add(cardId)
    onChange(next)
    setQuery('')
    setOpen(false)
    inputRef.current?.focus()
    // ensure newly added chip stays visible inside the scrollable token area
    requestAnimationFrame(() => {
      tokenAreaRef.current?.scrollTo({ top: tokenAreaRef.current.scrollHeight })
    })
  }

  function removeChip(cardId: string) {
    const next = new Set(value)
    next.delete(cardId)
    onChange(next)
    inputRef.current?.focus()
  }

  function clearAll() {
    onChange(new Set())
    inputRef.current?.focus()
  }

  function onInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const nativeEvent = e.nativeEvent as globalThis.KeyboardEvent
    if (nativeEvent.isComposing || nativeEvent.keyCode === 229) return

    if (e.key === 'Backspace' && query === '' && selectedList.length > 0) {
      e.preventDefault()
      removeChip(selectedList[selectedList.length - 1].card_id)
      return
    }
    if (!open || visibleItems.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(Math.min(safeHighlightedIndex + 1, visibleItems.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(Math.max(safeHighlightedIndex - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const picked = visibleItems[safeHighlightedIndex]
      if (picked) addCard(picked.card_id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  function onContainerMouseDown(e: MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      e.preventDefault()
      inputRef.current?.focus()
    }
  }

  useEffect(() => {
    function onMouse(e: globalThis.MouseEvent) {
      if (open && rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouse)
    return () => document.removeEventListener('mousedown', onMouse)
  }, [open])

  // Scroll highlighted menu item into view as user arrow-keys through the list.
  useEffect(() => {
    if (!open) return
    const target = visibleItems[safeHighlightedIndex]
    if (!target) return
    document
      .getElementById(`cardpicker-opt-${target.card_id}`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, safeHighlightedIndex, visibleItems])

  const hasValue = value.size > 0

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="text-base font-medium leading-6 text-gray-700">我的卡片</p>
        <button
          type="button"
          onClick={clearAll}
          aria-hidden={!hasValue}
          tabIndex={hasValue ? 0 : -1}
          data-padding="custom"
          className={`p-0 text-base leading-6 text-gray-400 transition-colors hover:text-gray-700 ${
            hasValue ? '' : 'invisible'
          }`}
        >
          清除全部
        </button>
      </div>

      {/* Token input container — max ~5 lines tall, scroll inside */}
      <div
        ref={tokenAreaRef}
        onMouseDown={onContainerMouseDown}
        className="flex flex-wrap items-center gap-1.5 min-h-[2.75rem] max-h-40 overflow-y-auto w-full px-2 py-1.5 border border-gray-200 rounded-xl bg-white focus-within:border-gray-400 cursor-text"
      >
        {selectedList.map((c) => {
          const displayName = formatCardDisplayName(c.display_name_zh)
          return (
            <span
              key={c.card_id}
              className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 pl-2.5 pr-1 py-0.5 text-base max-w-full"
            >
              <span className="truncate max-w-[16rem]">{displayName}</span>
              <button
                type="button"
                onClick={() => removeChip(c.card_id)}
                aria-label={`移除 ${displayName}`}
                data-padding="custom"
                className="inline-flex items-center justify-center w-5 h-5 text-blue-500 hover:text-blue-800 transition-colors"
              >
                <X size={16} />
              </button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlightedIndex(0)
            setOpen(true)
          }}
          onKeyDown={onInputKeyDown}
          placeholder={value.size === 0 ? '輸入卡片名稱' : ''}
          className="flex-1 min-w-[8rem] py-1 text-base bg-transparent focus:outline-none placeholder:text-gray-400"
          aria-autocomplete="list"
          aria-activedescendant={
            open && visibleItems[safeHighlightedIndex]
              ? `cardpicker-opt-${visibleItems[safeHighlightedIndex].card_id}`
              : undefined
          }
        />
      </div>

      {/* Menu */}
      {open && query.trim() && (
        <div
          role="listbox"
          className="absolute z-30 left-0 right-0 mt-2 max-h-96 overflow-auto bg-white rounded-xl border border-gray-200 shadow-lg"
        >
          {visibleItems.length === 0 && (
            <p className="text-base text-gray-400 py-6 text-center">
              查無符合的卡，試試其他關鍵字
            </p>
          )}
          {visibleItems.map((c, idx) => {
            const highlighted = idx === safeHighlightedIndex
            const displayName = formatCardDisplayName(c.display_name_zh)
            return (
              <button
                key={c.card_id}
                id={`cardpicker-opt-${c.card_id}`}
                role="option"
                aria-selected={false}
                type="button"
                onMouseEnter={() => setHighlightedIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  addCard(c.card_id)
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left ${
                  highlighted ? 'bg-blue-50 focus:outline-none' : 'hover:bg-gray-50'
                }`}
              >
                <span className="flex-1 min-w-0">
                  <span className="block truncate text-gray-900">{displayName}</span>
                  <span className="block text-base text-gray-400">{c.bank_name}</span>
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
