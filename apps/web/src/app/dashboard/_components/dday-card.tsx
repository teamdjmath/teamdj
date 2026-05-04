'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Calendar } from '@/components/ui/calendar'

const LS_KEY = 'teamdj_dday_target'
const LS_TITLE_KEY = 'teamdj_dday_title'

interface DdayCardProps {
  defaultDate: string
}

export function DdayCard({ defaultDate }: DdayCardProps) {
  const [mounted, setMounted] = useState(false)
  const [ddayState, setDdayState] = useState({ date: defaultDate, title: '수능까지' })
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    const savedTitle = localStorage.getItem(LS_TITLE_KEY)
    
    requestAnimationFrame(() => {
      if (saved || savedTitle) {
        setDdayState({
          date: saved || defaultDate,
          title: savedTitle || '수능까지'
        })
      }
      setMounted(true)
    })
  }, [defaultDate])

  const { date: targetDate, title } = ddayState

  function handleChange(date: string) {
    setDdayState(prev => ({ ...prev, date }))
    localStorage.setItem(LS_KEY, date)
  }

  function handleTitleChange(val: string) {
    setDdayState(prev => ({ ...prev, title: val }))
    localStorage.setItem(LS_TITLE_KEY, val)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(targetDate)
  target.setHours(0, 0, 0, 0)
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  const label = diff > 0 ? `D-${diff}` : diff === 0 ? 'D-DAY' : `D+${Math.abs(diff)}`
  const targetStr = target.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })

  if (!mounted) return (
    <div className="h-[120px] rounded-[32px] bg-white animate-pulse" />
  )

  return (
    <div className="space-y-4">
      <Card className="relative overflow-hidden">
        <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-zinc-50 opacity-60" />
        <div className="absolute -right-2 -top-2 h-20 w-20 rounded-full bg-zinc-100 opacity-40" />

        <div className="relative px-8 py-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {editing ? (
                <input
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  className="text-sm font-bold text-zinc-400 bg-transparent border-b border-zinc-200 focus:border-zinc-900 outline-none pb-1 mb-2 w-full max-w-[150px]"
                  autoFocus
                />
              ) : (
                <p className="text-sm font-semibold text-zinc-400">{title}</p>
              )}
              <p className="mt-1 text-5xl font-semibold tracking-normal text-zinc-950">{label}</p>
              <p className="mt-2 text-[13px] font-semibold text-zinc-400">{targetStr}</p>
            </div>
            <button
              type="button"
              onClick={() => setEditing((v) => !v)}
              className="rounded-2xl bg-zinc-50 px-5 py-2.5 text-sm font-bold text-zinc-600 transition-all hover:bg-zinc-100 active:scale-95"
            >
              {editing ? '닫기' : '설정'}
            </button>
          </div>
        </div>
      </Card>

      {editing && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <Calendar value={targetDate} onChange={handleChange} />
        </div>
      )}
    </div>
  )
}
