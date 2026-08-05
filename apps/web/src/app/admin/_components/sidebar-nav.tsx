'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavItem } from '../layout'
import { NavIcon } from './nav-icons'

function isItemActive(href: string, pathname: string, allHrefs: readonly string[]): boolean {
  if (href === '/admin/dashboard') return pathname === href
  const matches = pathname === href || pathname.startsWith(href + '/')
  if (!matches) return false
  // 더 구체적인 다른 항목이 현재 경로에 매칭되면 이 항목은 비활성
  const moreSpecific = allHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(href) &&
      (pathname === other || pathname.startsWith(other + '/')),
  )
  return !moreSpecific
}

export function SidebarNav({ items, badges }: { items: readonly NavItem[]; badges?: Record<string, number> }) {
  const pathname = usePathname()
  const allHrefs = items.map((i) => i.href)

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
      {items.map(({ href, label, icon }) => {
        const active = isItemActive(href, pathname, allHrefs)
        const badge = badges?.[href] ?? 0
        return (
          <Link
            key={href}
            href={href}
            className={[
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-900'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100',
            ].join(' ')}
          >
            <NavIcon type={icon} />
            <span className="flex-1">{label}</span>
            {badge > 0 && (
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${active ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50' : 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'}`}>
                {badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
