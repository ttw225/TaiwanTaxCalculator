import type { SourceRef } from '../../types/content'

export function CardSourceRefsDetails({ sourceRefs }: { sourceRefs: SourceRef[] }) {
  return (
    <details className="group">
      <summary className="cursor-pointer select-none text-xs font-medium text-gray-500 hover:text-gray-700">
        來源與官方參考
      </summary>
      <ul className="mt-2 space-y-1">
        {sourceRefs.map((ref) => (
          <li key={ref.source_id} className="text-xs text-gray-500">
            {ref.url ? (
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-600 underline underline-offset-2 hover:text-gray-800"
              >
                {ref.label}
              </a>
            ) : (
              <span className="text-gray-600">{ref.label}</span>
            )}
            {ref.authority && <span className="text-gray-400"> · {ref.authority}</span>}
          </li>
        ))}
      </ul>
    </details>
  )
}
