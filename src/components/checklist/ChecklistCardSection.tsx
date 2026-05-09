import type { ReactNode } from 'react'

export function ChecklistCardSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-2">
      <span className="text-base font-medium text-gray-500">{label}</span>
      <div className="mt-2">{children}</div>
    </div>
  )
}
