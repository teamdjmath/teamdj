'use client'

import { useEffect, useRef, useState } from 'react'

export interface ComboOption {
  value: string
  label: string
}

const triggerCls =
  'w-full flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 px-5 py-3.5 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none transition-all disabled:opacity-50'

export function ComboSelect({
  label,
  required,
  value,
  onChange,
  options,
  placeholder = '선택해주세요',
  disabled,
  className = 'space-y-1.5',
  triggerClassName,
}: {
  label?: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: ComboOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  triggerClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selected = options.find((o) => o.value === value)

  return (
    <div className={className}>
      {label && (
        <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div className="relative w-full" ref={ref}>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((o) => !o)}
          className={triggerClassName ?? triggerCls}
        >
          <span className={selected ? '' : 'text-zinc-400 dark:text-zinc-600 font-normal'}>
            {selected ? selected.label : placeholder}
          </span>
          <svg
            className={`w-4 h-4 shrink-0 text-zinc-400 dark:text-zinc-600 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-2 w-full max-h-64 overflow-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl p-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
            {options.length === 0 && (
              <p className="px-3 py-2 text-xs text-zinc-400 dark:text-zinc-600">선택할 항목이 없습니다</p>
            )}
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value)
                  setOpen(false)
                }}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                  o.value === value
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
