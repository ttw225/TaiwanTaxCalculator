import type { HTMLAttributes, ReactNode } from 'react'

export type CardVariant = 'default' | 'summary'

type DivProps = Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'className'>

export interface CardProps extends DivProps {
  variant?: CardVariant
  className?: string
  children: ReactNode
}

export interface CardSectionProps {
  variant?: CardVariant
  className?: string
  children: ReactNode
}

const CARD_ROOT_CLASS: Record<CardVariant, string> = {
  default: 'rounded-xl border border-gray-200 bg-white',
  summary: 'rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden',
}

const CARD_HEADER_CLASS: Record<CardVariant, string> = {
  default: 'border-b border-gray-100 px-4 py-3',
  summary: 'border-b border-gray-100 px-4 py-3',
}

const CARD_BODY_CLASS: Record<CardVariant, string> = {
  default: 'px-4 py-3',
  summary: 'px-4 py-3',
}

const CARD_FOOTER_CLASS: Record<CardVariant, string> = {
  default: 'px-4 py-3 border-t border-gray-100',
  summary: 'px-4 py-3 border-t border-gray-100',
}

function joinClass(...tokens: Array<string | undefined>) {
  return tokens.filter(Boolean).join(' ')
}

export function Card({ variant = 'default', className, children, ...rest }: CardProps) {
  return (
    <div className={joinClass(CARD_ROOT_CLASS[variant], className)} {...rest}>
      {children}
    </div>
  )
}

export function CardHeader({ variant = 'default', className, children, ...rest }: CardSectionProps & DivProps) {
  return (
    <div className={joinClass(CARD_HEADER_CLASS[variant], className)} {...rest}>
      {children}
    </div>
  )
}

export function CardBody({ variant = 'default', className, children, ...rest }: CardSectionProps & DivProps) {
  return (
    <div className={joinClass(CARD_BODY_CLASS[variant], className)} {...rest}>
      {children}
    </div>
  )
}

export function CardFooter({ variant = 'default', className, children, ...rest }: CardSectionProps & DivProps) {
  return (
    <div className={joinClass(CARD_FOOTER_CLASS[variant], className)} {...rest}>
      {children}
    </div>
  )
}
