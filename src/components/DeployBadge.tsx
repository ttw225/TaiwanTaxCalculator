import type { DeployInfo } from '../lib/deployInfo'

interface Props {
  deployInfo: DeployInfo
}

export function DeployBadge({ deployInfo }: Props) {
  const tone =
    deployInfo.context === 'pr-preview'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : 'border-sky-200 bg-sky-50 text-sky-800'

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}
      title={deployInfo.detail ? `Commit ${deployInfo.detail}` : undefined}
    >
      <span>{deployInfo.label}</span>
      {deployInfo.detail && (
        <span className="hidden font-mono text-[11px] opacity-70 sm:inline">
          {deployInfo.detail}
        </span>
      )}
    </span>
  )
}
