export interface ExcludeFilterValue {
  newCustomer: boolean
  specialMember: boolean
}

const ITEMS: Array<{ key: keyof ExcludeFilterValue; label: string }> = [
  { key: 'newCustomer', label: '排除新戶活動' },
  { key: 'specialMember', label: '排除銀行財管及 VIP 優惠' },
]

interface ExcludeFilterProps {
  value: ExcludeFilterValue
  onChange: (next: ExcludeFilterValue) => void
}

export function ExcludeFilter({ value, onChange }: ExcludeFilterProps) {
  return (
    <div className="flex flex-wrap gap-4">
      {ITEMS.map(({ key, label }) => {
        return (
          <label
            key={key}
            className="inline-flex items-center gap-2 text-base text-gray-700"
          >
            <input
              type="checkbox"
              checked={value[key]}
              onChange={(event) => onChange({ ...value, [key]: event.target.checked })}
              className="h-4 w-4"
            />
            <span>{label}</span>
          </label>
        )
      })}
    </div>
  )
}
