'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  {
    href: '/dashboard',
    label: '홈',
    exact: true,
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline strokeLinecap="round" strokeLinejoin="round" points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: '/dashboard/learning',
    label: '학습',
    exact: false,
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    href: '/dashboard/report',
    label: '리포트',
    exact: false,
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
      </svg>
    ),
  },
  {
    href: '/dashboard/more',
    label: '더보기',
    exact: false,
    icon: (active: boolean) => (
      <svg className="w-5 h-5" fill="currentColor" stroke="none" viewBox="0 0 24 24">
        <circle cx="12" cy="5"  r={active ? 1.5 : 1} />
        <circle cx="12" cy="12" r={active ? 1.5 : 1} />
        <circle cx="12" cy="19" r={active ? 1.5 : 1} />
      </svg>
    ),
  },
] as const

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white">
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map(({ href, label, exact, icon }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={[
                'flex flex-1 flex-col items-center gap-1 py-3 transition-colors',
                active ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-700',
              ].join(' ')}
            >
              {icon(active)}
              <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
