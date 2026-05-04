'use client'

import { useState } from 'react'

interface CalendarProps {
  value?: string // YYYY-MM-DD
  onChange: (date: string) => void
}

export function Calendar({ value, onChange }: CalendarProps) {
  const initialDate = value ? new Date(value) : new Date()
  const [viewDate, setViewDate] = useState(initialDate)

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const firstDay = new Date(year, month, 1).getDay()
  const lastDate = new Date(year, month + 1, 0).getDate()

  const prevLastDate = new Date(year, month, 0).getDate()

  const days = []

  // Prev month days
  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ day: prevLastDate - i, current: false, date: new Date(year, month - 1, prevLastDate - i) })
  }

  // Current month days
  for (let i = 1; i <= lastDate; i++) {
    days.push({ day: i, current: true, date: new Date(year, month, i) })
  }

  // Next month days
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, current: false, date: new Date(year, month + 1, i) })
  }

  const isToday = (d: Date) => {
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }

  const isSelected = (d: Date) => {
    if (!value) return false
    const sel = new Date(value)
    return d.getFullYear() === sel.getFullYear() && d.getMonth() === sel.getMonth() && d.getDate() === sel.getDate()
  }

  const handlePrev = () => setViewDate(new Date(year, month - 1, 1))
  const handleNext = () => setViewDate(new Date(year, month + 1, 1))

  const handleSelect = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    onChange(`${y}-${m}-${day}`)
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="w-full bg-white rounded-[32px] p-6 shadow-sm border border-zinc-100">
      <div className="flex items-center justify-between mb-6">
        <button onClick={handlePrev} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-zinc-50 transition-colors">
          <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-xs font-medium text-zinc-400 mb-0.5">{year}년</p>
          <p className="text-xl font-extrabold text-zinc-900">{month + 1}월</p>
        </div>
        <button onClick={handleNext} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-zinc-50 transition-colors">
          <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {weekDays.map((wd, i) => (
          <div key={wd} className={`text-center text-[13px] font-bold py-2 ${i === 0 ? 'text-red-300' : i === 6 ? 'text-blue-300' : 'text-zinc-300'}`}>
            {wd}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((d, i) => {
          const selected = isSelected(d.date)
          const today = isToday(d.date)
          const isSun = d.date.getDay() === 0
          const isSat = d.date.getDay() === 6
          
          return (
            <button
              key={i}
              onClick={() => handleSelect(d.date)}
              className={`
                relative h-11 w-11 mx-auto flex items-center justify-center rounded-full text-[15px] font-bold transition-all
                ${!d.current ? 'text-zinc-200 font-medium' : selected ? 'bg-zinc-900 text-white shadow-lg' : today ? 'bg-blue-50 text-blue-600' : isSun ? 'text-red-400' : isSat ? 'text-blue-400' : 'text-zinc-800 hover:bg-zinc-50'}
              `}
            >
              {d.day}
              {today && !selected && <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-blue-600" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
