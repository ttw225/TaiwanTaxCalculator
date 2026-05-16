import type { HTMLAttributes, ReactNode } from 'react'
import { useModalDismiss } from './useModalDismiss'

export interface ModalOverlayProps extends HTMLAttributes<HTMLDivElement> {
  onDismiss: () => void
  dismissEnabled?: boolean
  children: ReactNode
}

export function ModalOverlay({
  onDismiss,
  dismissEnabled = true,
  children,
  onClick,
  ...props
}: ModalOverlayProps) {
  useModalDismiss(onDismiss, dismissEnabled)

  return (
    <div
      {...props}
      onClick={(e) => {
        onClick?.(e)
        if (e.target === e.currentTarget) onDismiss()
      }}
    >
      {children}
    </div>
  )
}
