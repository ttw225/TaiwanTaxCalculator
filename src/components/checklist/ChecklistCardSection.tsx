import type { ReactNode } from 'react'

export function ChecklistCardSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-2">
      <span className="text-sm font-medium text-gray-500">{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  )
}
