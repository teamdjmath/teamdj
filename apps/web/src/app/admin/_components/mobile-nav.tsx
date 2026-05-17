'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { NavItem } from '../layout'

export function MobileNav({ items, badges }: { items: readonly NavItem[]; badges?: Record<string, number> }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* 햄버거 버튼 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
        aria-label="메뉴 열기"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 오버레이 */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 드로어 */}
      <div
        className={[
          'fixed inset-y-0 right-0 z-50 w-64 bg-white shadow-xl transition-transform duration-300',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-14 items-center justify-between border-b border-zinc-100 px-5">
          <span className="text-sm font-semibold text-zinc-900">메뉴</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100"
            aria-label="메뉴 닫기"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="px-3 py-4 space-y-0.5">
          {items.map(({ href, label, icon }) => {
            const badge = badges?.[href] ?? 0
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
              >
                {icon}
                <span className="flex-1">{label}</span>
                {badge > 0 && (
                  <span className="rounded-full bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                    {badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}
