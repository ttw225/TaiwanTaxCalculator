import type { ReactNode } from 'react'

interface PageHeadingProps {
  title: string
  description: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageHeading({ title, description, actions, className }: PageHeadingProps) {
  const hasActions = Boolean(actions)

  return (
    <div className={[className, hasActions ? 'relative' : ''].filter(Boolean).join(' ')}>
      <h1 className={['mb-1 text-2xl font-semibold text-gray-900', hasActions ? 'sm:pr-56' : ''].filter(Boolean).join(' ')}>
        {title}
      </h1>
      <p className={['mb-6 text-base text-gray-500', hasActions ? 'sm:pr-56' : ''].filter(Boolean).join(' ')}>
        {description}
      </p>
      {actions ? (
        <div className="no-print mt-3 flex items-center gap-2 sm:absolute sm:right-0 sm:top-0 sm:mt-0">
          {actions}
        </div>
      ) : null}
    </div>
  )
}
