'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'

interface DdayCardProps {
  defaultDate: string // YYYY-MM-DD
}

export function DdayCard({ defaultDate }: DdayCardProps) {
  const [targetDate, setTargetDate] = useState(defaultDate)
  const [editing, setEditing] = useState(false)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const label =
    diff > 0 ? `D-${diff}` : diff === 0 ? 'D-DAY' : `D+${Math.abs(diff)}`

  const targetStr = target.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <Card className="relative overflow-hidden">
      {/* 배경 장식 */}
      <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-zinc-100 opacity-60" />
      <div className="absolute -right-2 -top-2 h-16 w-16 rounded-full bg-zinc-200 opacity-40" />

      <div className="relative px-5 py-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-zinc-400">수능까지</p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-zinc-950">{label}</p>
            <p className="mt-1 text-xs text-zinc-500">{targetStr}</p>
          </div>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-zinc-400 hover:text-zinc-800"
          >
            {editing ? '닫기' : '날짜 변경'}
          </button>
        </div>

        {editing && (
          <div className="mt-4">
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none w-full"
            />
          </div>
        )}
      </div>
    </Card>
  )
}
