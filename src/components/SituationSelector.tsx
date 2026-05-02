import type { Situation, SituationGroup, SituationId } from '../types/content'

interface Props {
  groups: SituationGroup[]
  situations: Situation[]
  selected: SituationId[]
  onToggle: (id: SituationId) => void
  onClear: () => void
  onGenerate: () => void
}

export function SituationSelector({ groups, situations, selected, onToggle, onClear, onGenerate }: Props) {
  const hasSelection = selected.length > 0
  const situationMap = new Map(situations.map((s) => [s.id, s]))

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">台灣所得稅節稅助理</h1>
      <p className="text-gray-500 mb-6 text-sm">
        選擇符合您今年度情況的項目，系統將列出值得確認的扣除清單。不需要登入或填寫任何個人資料。
      </p>

      <div className="mb-8">
        {groups.map((group) => (
          <div key={group.id} className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
              {group.title}
            </p>
            <p className="text-xs text-gray-400 mb-2">{group.description}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.situationIds.map((id) => {
                const s = situationMap.get(id)
                if (!s) return null
                const isSelected = selected.includes(id)
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onToggle(id)}
                    aria-pressed={isSelected}
                    className={[
                      'text-left px-4 py-3 rounded-lg border transition-colors',
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                        : 'border-gray-200 bg-white text-gray-800 hover:border-gray-400',
                    ].join(' ')}
                  >
                    <span className="font-medium text-sm block">{s.label}</span>
                    <span className="text-xs text-gray-500 mt-0.5 block">{s.description}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!hasSelection}
          className={[
            'px-5 py-2.5 rounded-lg text-sm font-medium transition-colors',
            hasSelection
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          ].join(' ')}
        >
          產生節稅清單
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={!hasSelection}
          aria-label="清空選項並刪除瀏覽器儲存"
          data-testid="clear-situation-selection"
          className={[
            'px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors',
            hasSelection
              ? 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed',
          ].join(' ')}
        >
          清空
        </button>
        {hasSelection && (
          <span className="text-sm text-gray-500">已選 {selected.length} 項</span>
        )}
        {!hasSelection && (
          <span className="text-sm text-gray-400">請先選擇至少一項情況</span>
        )}
      </div>
    </div>
  )
}
