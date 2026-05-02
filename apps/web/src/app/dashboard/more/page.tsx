'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { LogoutButton } from '@/components/ui/logout-button'
import Link from 'next/link'

export default function MorePage() {
  const [notifications, setNotifications] = useState(true)
  const [marketing, setMarketing] = useState(false)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-zinc-950">더보기</h1>

      {/* 지원 메뉴 */}
      <Card>
        <ul className="divide-y divide-zinc-100">
          <MenuItem href="#">1:1 문의</MenuItem>
          <MenuItem href="#">자주 묻는 질문</MenuItem>
          <MenuItem href="#">약관 및 이용동의</MenuItem>
        </ul>
      </Card>

      {/* 알림 설정 */}
      <Card>
        <div className="px-5 py-3">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">알림 설정</p>
        </div>
        <ul className="divide-y divide-zinc-100">
          <ToggleItem
            label="알림 허용"
            description="수업, 과제, 공지 알림"
            value={notifications}
            onChange={setNotifications}
          />
          <ToggleItem
            label="마케팅 알림"
            description="이벤트 및 혜택 정보"
            value={marketing}
            onChange={setMarketing}
          />
        </ul>
      </Card>

      {/* 로그아웃 */}
      <Card>
        <div className="px-5 py-4">
          <LogoutButton />
        </div>
      </Card>
    </div>
  )
}

function MenuItem({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between px-5 py-4 text-sm text-zinc-800 hover:bg-zinc-50 transition-colors"
      >
        {children}
        <svg className="h-4 w-4 text-zinc-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
        </svg>
      </Link>
    </li>
  )
}

function ToggleItem({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <li className="flex items-center justify-between px-5 py-4">
      <div>
        <p className="text-sm text-zinc-800">{label}</p>
        <p className="text-xs text-zinc-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
          value ? 'bg-zinc-900' : 'bg-zinc-200',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200',
            value ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </li>
  )
}
