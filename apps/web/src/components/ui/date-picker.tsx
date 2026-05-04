'use client'

import { useState, useRef, useEffect } from 'react'
import { Calendar } from './calendar'

interface DatePickerProps {
  value?: string
  onChange: (date: string) => void
  placeholder?: string
}

export function DatePicker({ value, onChange, placeholder = '날짜 선택' }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-2xl bg-zinc-50 border border-zinc-100 px-5 py-3.5 text-sm text-zinc-900 focus:ring-2 focus:ring-zinc-900 transition-all outline-none"
      >
        <span className={value ? 'font-bold' : 'text-zinc-400'}>
          {value ? new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }) : placeholder}
        </span>
        <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 w-[320px] shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
          <Calendar
            value={value}
            onChange={(d) => {
              onChange(d)
              setOpen(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
