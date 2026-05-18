import type { NavItem } from '../lib/siteConfig'

interface Props {
  item: NavItem
  /** Render as a block-level element for the mobile menu */
  block?: boolean
}

export function ComingSoonNavItem({ item, block = false }: Props) {
  return (
    <span
      aria-disabled="true"
      tabIndex={-1}
      className={`${block ? 'flex' : 'inline-flex'} items-center gap-1.5 text-gray-400 cursor-not-allowed select-none`}
    >
      <span className="text-base">{item.label}</span>
      <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full leading-tight whitespace-nowrap">
        即將推出
      </span>
    </span>
  )
}
