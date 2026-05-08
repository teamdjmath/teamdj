'use client'

import { useState, useEffect, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { InputField } from '@/components/ui/form-field'
import { createExtraSchedule, deleteExtraSchedule } from '@/lib/actions/schedule'
import { EmptyState } from '@/components/ui/empty-state'

const PX_PER_MIN = 0.55

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const DOW_LIST   = [1, 2, 3, 4, 5, 6, 0] // Mon~Sun

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function getClassColor(idx: number) {
  const hue = (idx * 137.508) % 360
  return {
    bg:     `hsl(${hue}, 62%, 88%)`,
    text:   `hsl(${hue}, 60%, 20%)`,
    border: `hsl(${hue}, 62%, 68%)`,
    ring:   `hsl(${hue}, 62%, 55%)`,
  }
}

function getWeekDates() {
  const today = new Date()
  const day   = today.getDay()
  const diff  = day === 0 ? -6 : 1 - day
  const mon   = new Date(today)
  mon.setDate(today.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d
  })
}

type ClassRow = {
  id: string
  name: string
  subject: string
  grade: string
  start_time: string | null
  end_time: string | null
  day_of_week: number[] | null
}

type ExtraSchedule = {
  id: string
  title: string
  scheduled_date: string
  start_time: string
  end_time: string
  note: string | null
}

interface Props {
  classes: ClassRow[]
  extraSchedules: ExtraSchedule[]
}

function ClassCard({
  cls,
  color,
  isActive,
  startHour,
  onClick,
}: {
  cls: ClassRow
  color: ReturnType<typeof getClassColor>
  isActive: boolean
  startHour: number
  onClick: () => void
}) {
  const startMin = timeToMin(cls.start_time!)
  const endMin   = timeToMin(cls.end_time!)
  const top    = (startMin - startHour * 60) * PX_PER_MIN
  const height = Math.max((endMin - startMin) * PX_PER_MIN, 20)

  return (
    <div
      className="absolute inset-x-1 rounded-md px-1.5 py-0.5 overflow-hidden cursor-pointer transition-all hover:brightness-95 active:scale-95"
      onClick={onClick}
      style={{
        top,
        height,
        backgroundColor: color.bg,
        color:           color.text,
        borderLeft:      `3px solid ${color.border}`,
        boxShadow: isActive ? `0 0 0 2px ${color.ring}` : undefined,
        zIndex: isActive ? 10 : 1,
      }}
    >
      <p className="text-[9px] font-bold leading-tight truncate">{cls.name}</p>
      {height >= 32 && (
        <p className="text-[8px] opacity-65 mt-0.5 truncate">
          {cls.start_time!.slice(0, 5)}–{cls.end_time!.slice(0, 5)}
        </p>
      )}
    </div>
  )
}

export function ScheduleClient({ classes, extraSchedules }: Props) {
  const router = useRouter()
  const [now, setNow] = useState(new Date())
  const [addOpen, setAddOpen]     = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [popup, setPopup] = useState<{
    cls: ClassRow
    color: ReturnType<typeof getClassColor>
  } | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  // 실제 수업 시간에 맞춰 범위를 동적으로 계산 (위아래 여백 최소화)
  const { dynStart, dynEnd } = useMemo(() => {
    const timed = classes.filter((c) => c.start_time && c.end_time)
    if (timed.length === 0) return { dynStart: 9, dynEnd: 21 }
    const starts = timed.map((c) => Math.floor(timeToMin(c.start_time!) / 60))
    const ends   = timed.map((c) => Math.ceil(timeToMin(c.end_time!) / 60))
    return {
      dynStart: Math.max(7,  Math.min(...starts) - 1),
      dynEnd:   Math.min(24, Math.max(...ends)   + 1),
    }
  }, [classes])

  const totalH    = (dynEnd - dynStart) * 60 * PX_PER_MIN
  const minToTop  = (min: number) => (min - dynStart * 60) * PX_PER_MIN
  const hours     = Array.from({ length: dynEnd - dynStart }, (_, i) => dynStart + i)

  const weekDates = getWeekDates()
  const todayDow  = now.getDay()
  const nowMin    = now.getHours() * 60 + now.getMinutes()
  const nowTop    = minToTop(nowMin)

  const sorted   = [...classes].sort((a, b) => a.name.localeCompare(b.name))
  const colorMap = Object.fromEntries(sorted.map((c, i) => [c.id, getClassColor(i)]))

  function isActive(cls: ClassRow) {
    if (!cls.day_of_week?.includes(todayDow)) return false
    if (!cls.start_time || !cls.end_time) return false
    return nowMin >= timeToMin(cls.start_time) && nowMin < timeToMin(cls.end_time)
  }

  function handleAddExtra(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createExtraSchedule(fd)
      if (!res.success) { setFormError(res.error); return }
      setAddOpen(false)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteExtraSchedule(id)
      router.refresh()
    })
  }

  const dateRange = `${weekDates[0].getMonth() + 1}/${weekDates[0].getDate()} – ${weekDates[6].getMonth() + 1}/${weekDates[6].getDate()}`

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-zinc-950">시간표</h1>
        <p className="mt-0.5 text-sm text-zinc-400">이번 주 {dateRange}</p>
      </div>

      {/* ── 두 컬럼 레이아웃 ── */}
      <div className="flex gap-5 items-start">

        {/* 왼쪽: 주간 시간표 */}
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[500px]">

                {/* 요일 헤더 */}
                <div
                  className="border-b border-zinc-100 bg-zinc-50"
                  style={{ display: 'grid', gridTemplateColumns: '40px repeat(7, 1fr)' }}
                >
                  <div className="py-2" />
                  {weekDates.map((d, i) => {
                    const isToday   = d.toDateString() === now.toDateString()
                    const isWeekend = i >= 5
                    return (
                      <div
                        key={i}
                        className={`py-2 text-center text-xs font-semibold ${
                          isToday ? 'text-zinc-950' : isWeekend ? 'text-zinc-300' : 'text-zinc-400'
                        }`}
                      >
                        <div>{DAY_LABELS[i]}</div>
                        <div className={`mt-0.5 text-[10px] ${isToday ? 'font-bold text-zinc-700' : 'text-zinc-300'}`}>
                          {d.getMonth() + 1}/{d.getDate()}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 그리드 본문 */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px repeat(7, 1fr)' }}>
                  {/* 시간 컬럼 */}
                  <div className="relative border-r border-zinc-100" style={{ height: totalH }}>
                    {hours.map((h) => (
                      <div
                        key={h}
                        className="absolute right-1.5 text-[9px] text-zinc-300 leading-none select-none"
                        style={{ top: minToTop(h * 60) - 4 }}
                      >
                        {h}
                      </div>
                    ))}
                  </div>

                  {/* 요일 컬럼 */}
                  {DOW_LIST.map((dow, colIdx) => {
                    const colDate   = weekDates[colIdx]
                    const isToday   = colDate.toDateString() === now.toDateString()
                    const isWeekend = colIdx >= 5
                    const dayClasses = classes.filter(
                      (c) => c.day_of_week?.includes(dow) && c.start_time && c.end_time,
                    )

                    return (
                      <div
                        key={dow}
                        className={`relative border-l border-zinc-100 ${
                          isToday ? 'bg-zinc-50/60' : isWeekend ? 'bg-zinc-50/40' : ''
                        }`}
                        style={{ height: totalH }}
                      >
                        {hours.map((h) => (
                          <div
                            key={h}
                            className="absolute inset-x-0 border-t border-zinc-100"
                            style={{ top: minToTop(h * 60) }}
                          />
                        ))}

                        {isToday && nowMin >= dynStart * 60 && nowMin < dynEnd * 60 && (
                          <div
                            className="absolute inset-x-0 z-20 flex items-center"
                            style={{ top: nowTop }}
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 -ml-0.5 shrink-0" />
                            <div className="flex-1 border-t-2 border-red-400" />
                          </div>
                        )}

                        {dayClasses.map((cls) => (
                          <ClassCard
                            key={cls.id}
                            cls={cls}
                            color={colorMap[cls.id]}
                            isActive={isActive(cls)}
                            startHour={dynStart}
                            onClick={() => setPopup({ cls, color: colorMap[cls.id] })}
                          />
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽: 추가 근무 */}
        <div className="w-72 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-950">추가 근무</h2>
              <p className="text-xs text-zinc-400 mt-0.5">이번 주</p>
            </div>
            <button
              type="button"
              onClick={() => { setFormError(null); setAddOpen(true) }}
              className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              + 등록
            </button>
          </div>

          {extraSchedules.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white">
              <EmptyState message="이번 주 등록된 추가 근무가 없습니다." />
            </div>
          ) : (
            <div className="space-y-2">
              {extraSchedules.map((es) => {
                const d = new Date(es.scheduled_date + 'T00:00:00')
                const dateLabel = d.toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric', weekday: 'short' })
                return (
                  <div
                    key={es.id}
                    className="rounded-2xl border border-zinc-200 bg-white px-4 py-3.5 flex items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-900">{es.title}</span>
                        <span className="text-xs text-zinc-400">{dateLabel}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-zinc-500">
                          {es.start_time.slice(0, 5)}–{es.end_time.slice(0, 5)}
                        </span>
                        {es.note && (
                          <span className="text-xs text-zinc-400 truncate">{es.note}</span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDelete(es.id)}
                      className="shrink-0 text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 수업 카드 팝업 ── */}
      {popup && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopup(null)} />
          <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
            <div
              className="pointer-events-auto rounded-2xl bg-white shadow-2xl border border-zinc-100 p-5 min-w-[200px]"
              style={{ borderLeft: `4px solid ${popup.color.border}` }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-bold text-zinc-900">{popup.cls.name}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {popup.cls.subject}{popup.cls.grade ? ` · ${popup.cls.grade}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPopup(null)}
                  className="text-zinc-300 hover:text-zinc-500 text-lg leading-none mt-0.5"
                >
                  ×
                </button>
              </div>
              <p className="text-sm font-semibold text-zinc-700 mt-3">
                {popup.cls.start_time?.slice(0, 5)} – {popup.cls.end_time?.slice(0, 5)}
              </p>
            </div>
          </div>
        </>
      )}

      {/* ── 추가 근무 등록 모달 ── */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="추가 근무 등록">
        <form onSubmit={handleAddExtra} className="space-y-4">
          <InputField label="제목" name="title" placeholder="예: 보충 수업" required />
          <InputField label="날짜" name="scheduled_date" type="date" required />
          <div className="grid grid-cols-2 gap-3">
            <InputField label="시작 시간" name="start_time" type="time" required />
            <InputField label="종료 시간" name="end_time"   type="time" required />
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-zinc-600">메모</label>
            <textarea
              name="note"
              rows={2}
              placeholder="선택 사항"
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-3.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:border-zinc-900 focus:bg-white focus:outline-none transition-all resize-none"
            />
          </div>
          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {isPending ? '등록 중…' : '등록'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
