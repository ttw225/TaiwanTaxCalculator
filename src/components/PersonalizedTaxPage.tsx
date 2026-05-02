import type {
  PersonalizedReport,
  TaxProfile,
  TaxProfilePersistenceMode,
} from '../types/content'
import { PersonalizedWorksheetPanel } from './PersonalizedWorksheetPanel'

interface Props {
  taxProfile: TaxProfile
  personalizedReport: PersonalizedReport
  profilePersistence: TaxProfilePersistenceMode
  hasChecklist: boolean
  onTaxProfileChange: (patch: Partial<TaxProfile>) => void
  onProfilePersistenceChange: (mode: TaxProfilePersistenceMode) => void
  onTaxProfileClear: () => void
  onBackToChecklist: () => void
  onBackToSelection: () => void
}

export function PersonalizedTaxPage({
  taxProfile,
  personalizedReport,
  profilePersistence,
  hasChecklist,
  onTaxProfileChange,
  onProfilePersistenceChange,
  onTaxProfileClear,
  onBackToChecklist,
  onBackToSelection,
}: Props) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center gap-3 no-print">
        {hasChecklist && (
          <button
            type="button"
            onClick={onBackToChecklist}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← 回到節稅清單
          </button>
        )}
        <button
          type="button"
          onClick={onBackToSelection}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          重新選擇情境
        </button>
      </div>

      <h1 className="mb-1 text-xl font-semibold text-gray-900">個人化工作表</h1>
      <p className="mb-4 text-sm text-gray-500">
        填寫後會在同頁產生個人化行動報告；資料只在瀏覽器處理。
      </p>

      <PersonalizedWorksheetPanel
        profile={taxProfile}
        report={personalizedReport}
        persistenceMode={profilePersistence}
        defaultOpen
        onProfileChange={onTaxProfileChange}
        onPersistenceChange={onProfilePersistenceChange}
        onClear={onTaxProfileClear}
      />
    </div>
  )
}
