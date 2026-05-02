import type {
  AmountRange,
  PersonalizedReport,
  TaxProfile,
  TaxProfilePersistenceMode,
} from '../types/content'

interface Props {
  profile: TaxProfile
  report: PersonalizedReport
  persistenceMode: TaxProfilePersistenceMode
  defaultOpen?: boolean
  onProfileChange: (patch: Partial<TaxProfile>) => void
  onPersistenceChange: (mode: TaxProfilePersistenceMode) => void
  onClear: () => void
}

const RANGE_OPTIONS: Array<{ value: AmountRange; label: string }> = [
  { value: 'none', label: '未填' },
  { value: 'low', label: '少量' },
  { value: 'medium', label: '中等' },
  { value: 'high', label: '偏高' },
]

const BRACKET_OPTIONS = [
  { value: 0.05, label: '5%' },
  { value: 0.12, label: '12%' },
  { value: 0.20, label: '20%' },
  { value: 0.30, label: '30%' },
  { value: 0.40, label: '40%' },
]

function numberValue(value: number | undefined) {
  return value === undefined ? '' : String(value)
}

function parseOptionalNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : undefined
}

function fmt(n: number) {
  return n.toLocaleString('zh-TW')
}

export function PersonalizedWorksheetPanel({
  profile,
  report,
  persistenceMode,
  defaultOpen = false,
  onProfileChange,
  onPersistenceChange,
  onClear,
}: Props) {
  const hasRecommendations = report.recommendations.length > 0
  const answeredCount = Object.entries(profile).filter(([, value]) => {
    if (value === undefined || value === false) return false
    if (value === 'none') return false
    return true
  }).length

  return (
    <details
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm"
      data-testid="personalized-worksheet-panel"
      open={defaultOpen}
    >
      <summary className="cursor-pointer select-none font-medium text-gray-800">
        個人化工作表（選填）
        {answeredCount > 0 && (
          <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
            已填 {answeredCount} 項
          </span>
        )}
      </summary>

      <div className="mt-3 space-y-1 text-xs text-gray-600" data-testid="worksheet-privacy-notice">
        <p>資料僅在您的瀏覽器處理，不會上傳、不需登入，也不會送到伺服器。</p>
        <p>報告提供行動建議與初步判斷；實際申報請以財政部電子申報系統確認。</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="年所得概略金額">
          <input
            type="number"
            min={0}
            step={10000}
            value={numberValue(profile.incomeAmount)}
            onChange={(e) => onProfileChange({ incomeAmount: parseOptionalNumber(e.target.value) })}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
            data-testid="profile-income-amount"
          />
        </Field>

        <Field label="估算邊際稅率">
          <select
            value={profile.marginalRate ?? ''}
            onChange={(e) => onProfileChange({ marginalRate: parseOptionalNumber(e.target.value) })}
            className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
            data-testid="profile-marginal-rate"
          >
            <option value="">未填</option>
            {BRACKET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>

        <Field label="婚姻狀態">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={profile.isMarried === true}
              onChange={(e) => onProfileChange({ isMarried: e.target.checked })}
              className="accent-emerald-600"
              data-testid="profile-is-married"
            />
            配偶合併申報情境
          </label>
        </Field>

        <Field label="扶養親屬人數">
          <input
            type="number"
            min={0}
            step={1}
            value={numberValue(profile.dependentsCount)}
            onChange={(e) => onProfileChange({ dependentsCount: parseOptionalNumber(e.target.value) })}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </Field>

        <Field label="本人薪資（夫妻工具可預填）">
          <input
            type="number"
            min={0}
            step={10000}
            value={numberValue(profile.selfSalary)}
            onChange={(e) => onProfileChange({ selfSalary: parseOptionalNumber(e.target.value) })}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
            data-testid="profile-self-salary"
          />
        </Field>

        <Field label="配偶薪資（夫妻工具可預填）">
          <input
            type="number"
            min={0}
            step={10000}
            value={numberValue(profile.spouseSalary)}
            onChange={(e) => onProfileChange({ spouseSalary: parseOptionalNumber(e.target.value) })}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
            data-testid="profile-spouse-salary"
          />
        </Field>

        <Field label="住房類型">
          <select
            value={profile.housingType ?? 'none'}
            onChange={(e) => onProfileChange({ housingType: e.target.value as TaxProfile['housingType'] })}
            className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
            data-testid="profile-housing-type"
          >
            <option value="none">未填</option>
            <option value="rent">租屋</option>
            <option value="mortgage">自住房貸</option>
          </select>
        </Field>

        <Field label="全年租金">
          <input
            type="number"
            min={0}
            step={10000}
            value={numberValue(profile.rentAmount)}
            onChange={(e) => onProfileChange({ rentAmount: parseOptionalNumber(e.target.value) })}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
            data-testid="profile-rent-amount"
          />
        </Field>

        <Field label="全年房貸利息">
          <input
            type="number"
            min={0}
            step={10000}
            value={numberValue(profile.mortgageInterestAmount)}
            onChange={(e) => onProfileChange({ mortgageInterestAmount: parseOptionalNumber(e.target.value) })}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
          />
        </Field>

        <Field label="醫療支出規模">
          <select
            value={profile.medicalExpenseRange ?? 'none'}
            onChange={(e) => onProfileChange({ medicalExpenseRange: e.target.value as AmountRange })}
            className="w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
            data-testid="profile-medical-range"
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </Field>

        <AmountField label="保險費" value={profile.insuranceAmount} onChange={(value) => onProfileChange({ insuranceAmount: value })} />
        <AmountField label="捐贈金額" value={profile.donationAmount} onChange={(value) => onProfileChange({ donationAmount: value })} />
        <AmountField label="幼兒照顧支出" value={profile.childcareAmount} onChange={(value) => onProfileChange({ childcareAmount: value })} />
        <AmountField label="長照相關支出" value={profile.longTermCareAmount} onChange={(value) => onProfileChange({ longTermCareAmount: value })} />

        <Field label="股利金額">
          <input
            type="number"
            min={0}
            step={10000}
            value={numberValue(profile.dividendAmount)}
            onChange={(e) => onProfileChange({ dividendAmount: parseOptionalNumber(e.target.value) })}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
            data-testid="profile-dividend-amount"
          />
        </Field>

        <Field label="全年海外所得">
          <input
            type="number"
            min={0}
            step={100000}
            value={numberValue(profile.overseasIncome)}
            onChange={(e) => onProfileChange({ overseasIncome: parseOptionalNumber(e.target.value) })}
            className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
            data-testid="profile-overseas-income"
          />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-emerald-100 pt-3">
        <label className="flex items-center gap-2 text-xs text-gray-700">
          <input
            type="checkbox"
            checked={persistenceMode === 'local'}
            onChange={(e) => onPersistenceChange(e.target.checked ? 'local' : 'session')}
            className="accent-emerald-600"
            data-testid="profile-persist-toggle"
          />
          記住在此瀏覽器
        </label>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-gray-500 underline underline-offset-2 hover:text-gray-700"
          data-testid="profile-clear-btn"
        >
          清除工作表資料
        </button>
      </div>

      <div className="mt-5 rounded border border-emerald-100 bg-white/80 p-3" data-testid="personalized-report">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-gray-900">個人化行動報告</h2>
          {hasRecommendations && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
              {report.recommendations.length} 項建議
            </span>
          )}
        </div>

        {report.summary.length > 0 && (
          <ul className="mb-3 space-y-1 text-xs text-gray-600">
            {report.summary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}

        {!hasRecommendations ? (
          <p className="text-xs text-gray-500">填寫上方任一相關欄位後，這裡會產生個人化行動建議。</p>
        ) : (
          <div className="space-y-3">
            {report.recommendations.map((recommendation) => (
              <article key={recommendation.id} className="rounded border border-gray-200 bg-white p-3">
                <h3 className="text-sm font-medium text-gray-900">{recommendation.title}</h3>
                <p className="mt-1 text-xs text-gray-600">{recommendation.reason}</p>
                {recommendation.estimate && (
                  <p className="mt-2 rounded bg-blue-50 px-2 py-1 text-xs text-blue-800">
                    {recommendation.estimate}
                  </p>
                )}
                {recommendation.documents.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    文件：{recommendation.documents.join('、')}
                  </p>
                )}
                {recommendation.warning && (
                  <p className="mt-2 text-xs text-orange-700">{recommendation.warning}</p>
                )}
              </article>
            ))}
          </div>
        )}

        {report.missingDocuments.length > 0 && (
          <p className="mt-3 text-xs text-gray-600">
            建議先整理 {fmt(report.missingDocuments.length)} 類文件：{report.missingDocuments.slice(0, 6).join('、')}
          </p>
        )}
      </div>
    </details>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}

function AmountField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={0}
        step={10000}
        value={numberValue(value)}
        onChange={(e) => onChange(parseOptionalNumber(e.target.value))}
        className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
      />
    </Field>
  )
}
