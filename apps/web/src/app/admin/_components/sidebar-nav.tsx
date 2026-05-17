'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavItem } from '../layout'

export function SidebarNav({ items, badges }: { items: readonly NavItem[]; badges?: Record<string, number> }) {
  const pathname = usePathname()

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
      {items.map(({ href, label, icon }) => {
        const active =
          href === '/admin/dashboard'
            ? pathname === href
            : pathname.startsWith(href)
        const badge = badges?.[href] ?? 0
        return (
          <Link
            key={href}
            href={href}
            className={[
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-zinc-950 text-white'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
            ].join(' ')}
          >
            {icon}
            <span className="flex-1">{label}</span>
            {badge > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${active ? 'bg-white text-zinc-950' : 'bg-zinc-900 text-white'}`}>
                {badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
