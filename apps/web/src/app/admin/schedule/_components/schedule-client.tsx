'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { InputField } from '@/components/ui/form-field'
import { createExtraSchedule, deleteExtraSchedule } from '@/lib/actions/schedule'
import { EmptyState } from '@/components/ui/empty-state'

// ── 상수
const START_HOUR = 9
const END_HOUR   = 22
const PX_PER_MIN = 0.7
const TOTAL_H    = (END_HOUR - START_HOUR) * 60 * PX_PER_MIN

const DAY_LABELS = ['월', '화', '수', '목', '금']
const DOW_LIST   = [1, 2, 3, 4, 5] // Mon~Fri

// ── 헬퍼
function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToTop(min: number) {
  return (min - START_HOUR * 60) * PX_PER_MIN
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
  return DOW_LIST.map((_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d
  })
}

// ── 타입
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

// ── 분반 카드
function ClassCard({
  cls,
  color,
  isActive,
}: {
  cls: ClassRow
  color: ReturnType<typeof getClassColor>
  isActive: boolean
}) {
  const startMin = timeToMin(cls.start_time!)
  const endMin   = timeToMin(cls.end_time!)
  const top    = minToTop(startMin)
  const height = Math.max((endMin - startMin) * PX_PER_MIN, 20)

  return (
    <div
      className="absolute inset-x-1 rounded-md px-1.5 py-0.5 overflow-hidden transition-shadow"
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

// ── 메인 컴포넌트
export function ScheduleClient({ classes, extraSchedules }: Props) {
  const router = useRouter()
  const [now, setNow] = useState(new Date())
  const [addOpen, setAddOpen]   = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

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

  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

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

  const dateRange = `${weekDates[0].getMonth() + 1}/${weekDates[0].getDate()} – ${weekDates[4].getMonth() + 1}/${weekDates[4].getDate()}`

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
              <div className="min-w-[420px]">

                {/* 요일 헤더 */}
                <div
                  className="border-b border-zinc-100 bg-zinc-50"
                  style={{ display: 'grid', gridTemplateColumns: '44px repeat(5, 1fr)' }}
                >
                  <div className="py-2" />
                  {weekDates.map((d, i) => {
                    const isToday = d.toDateString() === now.toDateString()
                    return (
                      <div key={i} className={`py-2 text-center text-xs font-semibold ${isToday ? 'text-zinc-950' : 'text-zinc-400'}`}>
                        <div>{DAY_LABELS[i]}</div>
                        <div className={`mt-0.5 text-[10px] ${isToday ? 'font-bold text-zinc-700' : 'text-zinc-300'}`}>
                          {d.getMonth() + 1}/{d.getDate()}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 그리드 본문 */}
                <div style={{ display: 'grid', gridTemplateColumns: '44px repeat(5, 1fr)' }}>
                  {/* 시간 컬럼 */}
                  <div className="relative border-r border-zinc-100" style={{ height: TOTAL_H }}>
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
                    const colDate = weekDates[colIdx]
                    const isToday = colDate.toDateString() === now.toDateString()
                    const dayClasses = classes.filter(
                      (c) => c.day_of_week?.includes(dow) && c.start_time && c.end_time,
                    )

                    return (
                      <div
                        key={dow}
                        className={`relative border-l border-zinc-100 ${isToday ? 'bg-zinc-50/60' : ''}`}
                        style={{ height: TOTAL_H }}
                      >
                        {hours.map((h) => (
                          <div
                            key={h}
                            className="absolute inset-x-0 border-t border-zinc-100"
                            style={{ top: minToTop(h * 60) }}
                          />
                        ))}

                        {isToday && nowMin >= START_HOUR * 60 && nowMin < END_HOUR * 60 && (
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
