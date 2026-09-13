'use client'

import { useEffect, useRef, useState } from 'react'

interface TimeInputProps {
  value?: string // "HH:MM"
  onChange: (time: string) => void
}

function clamp(n: number, max: number) {
  if (Number.isNaN(n)) return 0
  return Math.max(0, Math.min(max, n))
}

// 시/분 두 칸 입력 — 각 칸에 숫자 2자리를 입력하면 자동으로 다음 칸(시→분)으로 넘어간다.
// "1923" 한 번에 파싱하는 방식은 "930"이 9:30인지 09:30인지 모호해질 수 있어,
// 대신 칸을 나눠 빠른 타이핑 경험과 명확한 시/분 구분을 함께 만족시킨다.
export function TimeInput({ value, onChange }: TimeInputProps) {
  const [h, setH] = useState(() => value?.split(':')[0] ?? '')
  const [m, setM] = useState(() => value?.split(':')[1] ?? '')
  const lastEmitted = useRef(value ?? '')
  const minuteRef = useRef<HTMLInputElement>(null)
  // 시 칸에서 2자리 입력 완료 후 minuteRef.focus()를 호출하면 시 input에 blur가 동기적으로
  // 발생하는데, 이때 handleHourBlur는 이 이벤트를 만든 시점(2자리 입력 전)의 오래된 h 클로저를
  // 참조해 방금 완성한 값을 다시 1자리로 잘못 패딩해버린다. 이 플래그로 그 blur 한 번만 무시한다.
  // (분 칸은 완료 후 포커스를 옮기지 않으므로 같은 문제가 없다.)
  const suppressHourBlur = useRef(false)

  // 외부에서 value가 바뀌면(예: 다른 학생 선택) 동기화 — 우리가 emit한 값이면 무시해
  // 타이핑 중 되돌아온 echo와 사용자의 입력이 서로 충돌하지 않게 한다.
  useEffect(() => {
    if ((value ?? '') === lastEmitted.current) return
    lastEmitted.current = value ?? ''
    setH(value?.split(':')[0] ?? '')
    setM(value?.split(':')[1] ?? '')
  }, [value])

  function emit(nextH: string, nextM: string) {
    const combined = nextH === '' && nextM === '' ? '' : `${(nextH || '0').padStart(2, '0')}:${(nextM || '0').padStart(2, '0')}`
    lastEmitted.current = combined
    onChange(combined)
  }

  function handleHourChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2)
    setH(digits)
    if (digits.length === 2) {
      const clamped = String(clamp(parseInt(digits, 10), 23)).padStart(2, '0')
      setH(clamped)
      emit(clamped, m)
      suppressHourBlur.current = true
      minuteRef.current?.focus()
      minuteRef.current?.select()
    }
  }

  function handleMinuteChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 2)
    setM(digits)
    if (digits.length === 2) {
      const clamped = String(clamp(parseInt(digits, 10), 59)).padStart(2, '0')
      setM(clamped)
      emit(h, clamped)
    }
  }

  function handleHourBlur() {
    if (suppressHourBlur.current) { suppressHourBlur.current = false; return }
    if (h === '') { emit('', m); return }
    const clamped = String(clamp(parseInt(h, 10), 23)).padStart(2, '0')
    setH(clamped)
    emit(clamped, m)
  }

  function handleMinuteBlur() {
    if (m === '') { emit(h, ''); return }
    const clamped = String(clamp(parseInt(m, 10), 59)).padStart(2, '0')
    setM(clamped)
    emit(h, clamped)
  }

  return (
    <div className="flex items-center gap-1.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-900 px-4 py-3.5 focus-within:ring-2 focus-within:ring-zinc-900 dark:focus-within:ring-zinc-100 transition-all">
      <input
        type="text"
        inputMode="numeric"
        value={h}
        onChange={handleHourChange}
        onBlur={handleHourBlur}
        placeholder="시"
        aria-label="시"
        className="w-7 bg-transparent text-center text-sm font-bold text-zinc-900 dark:text-zinc-100 outline-none placeholder:font-normal placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
      />
      <span className="text-zinc-300 dark:text-zinc-700 font-bold">:</span>
      <input
        ref={minuteRef}
        type="text"
        inputMode="numeric"
        value={m}
        onChange={handleMinuteChange}
        onBlur={handleMinuteBlur}
        placeholder="분"
        aria-label="분"
        className="w-7 bg-transparent text-center text-sm font-bold text-zinc-900 dark:text-zinc-100 outline-none placeholder:font-normal placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
      />
    </div>
  )
}
