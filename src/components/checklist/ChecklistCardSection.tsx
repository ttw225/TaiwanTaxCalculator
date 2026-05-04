import type { ReactNode } from 'react'

export function ChecklistCardSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-2">
      <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
      <div className="mt-1">{children}</div>
    </div>
  )
}
