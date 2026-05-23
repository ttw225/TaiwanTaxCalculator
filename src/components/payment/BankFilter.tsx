import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import type { BankListItem } from '../../types/paymentOffers'

interface BankFilterProps {
  value: Set<string>
  onChange: (next: Set<string>) => void
  allBanks: BankListItem[]
}

function setEqual(a: Set<string>, b: Set<string>) {
  if (a.size !== b.size) return false
  for (const x of a) if (!b.has(x)) return false
  return true
}

export function BankFilter({ value, onChange, allBanks }: BankFilterProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Set<string>>(value)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => searchRef.current?.focus(), 30)
    return () => window.clearTimeout(id)
  }, [open])

  function openPopover() {
    setDraft(value)
    setQuery('')
    setOpen(true)
  }

  function closeAndCommit() {
    setOpen(false)
    if (draft.size > 0 && !setEqual(draft, value)) onChange(draft)
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) closeAndCommit()
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, draft, value])

  function toggle(key: string) {
    const next = new Set(draft)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    setDraft(next)
  }
  function selectAll() {
    setDraft(new Set(allBanks.map((b) => b.code)))
  }
  function deselectAll() {
    setDraft(new Set())
  }

  const filtered = useMemo(() => {
    if (!query.trim()) return allBanks
    const q = query.toLowerCase().trim()
    return allBanks.filter(
      (b) => b.name.toLowerCase().includes(q) || b.code.includes(q),
    )
  }, [allBanks, query])

  const allDraftSelected = draft.size === allBanks.length
  const summary =
    value.size === allBanks.length
      ? `全部 ${allBanks.length} 家銀行`
      : `${value.size} 家銀行`

  return (
    <div ref={ref} className="relative">
      <p className="text-base font-medium text-gray-700 mb-2">發卡銀行</p>
      <button
        type="button"
        onClick={() => (open ? closeAndCommit() : openPopover())}
        className="w-full flex items-center justify-between gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-700 hover:border-gray-300 transition-colors"
      >
        <span className="truncate text-left">{summary}</span>
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
      </button>

      {open && (
        <div className="absolute z-30 left-0 right-0 mt-2 max-h-96 bg-white rounded-xl border border-gray-200 shadow-lg flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
            {draft.size === 0 ? (
              <span className="text-base text-amber-700 font-medium">至少要勾選一個銀行</span>
            ) : (
              <span className="text-base text-gray-400 tabular-nums">
                {draft.size}／{allBanks.length} 已選
              </span>
            )}
            <button
              type="button"
              onClick={allDraftSelected ? deselectAll : selectAll}
              className="text-base text-gray-600 hover:text-gray-900 transition-colors"
            >
              {allDraftSelected ? '取消全選' : '全選'}
            </button>
          </div>

          <div className="px-2 pt-2 pb-1">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400">
                <Search size={12} />
              </span>
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋銀行"
                className="w-full pl-7 pr-7 py-1.5 text-base border border-gray-200 rounded-md bg-white focus:border-gray-400 focus:outline-none placeholder:text-gray-400"
              />
              {query && (
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setQuery('')
                    searchRef.current?.focus()
                  }}
                  aria-label="清除搜尋"
                  data-padding="custom"
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto px-2 pb-2 pt-1">
            {filtered.length === 0 && (
              <p className="text-base text-gray-400 py-6 text-center">查無符合銀行，試試其他關鍵字</p>
            )}
            {filtered.map((b) => {
              const on = draft.has(b.code)
              return (
                <label
                  key={b.code}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer"
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      on
                        ? 'bg-gray-900 border-gray-900 text-white'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    {on && <Check size={10} />}
                  </span>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(b.code)}
                    className="sr-only"
                  />
                  <span className="text-base text-gray-700 flex-1 truncate">{b.name}</span>
                </label>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
