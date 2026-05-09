'use client'

import { useState, useEffect, useTransition, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/modal'
import { InputField } from '@/components/ui/form-field'
import { createExtraSchedule, deleteExtraSchedule } from '@/lib/actions/schedule'
import { updateStaffStatus, type StaffStatus } from '@/lib/actions/staff'

// ── 상수
const PX_PER_MIN = 0.55
const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const DOW_LIST   = [1, 2, 3, 4, 5, 6, 0]

const STATUS_CONFIG: Record<StaffStatus, { label: string; dot: string; badge: string }> = {
  online:  { label: '온라인',   dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700' },
  busy:    { label: '바쁨',     dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700'   },
  offline: { label: '오프라인', dot: 'bg-zinc-300',    badge: 'bg-zinc-100 text-zinc-400'    },
}

// ── 헬퍼
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

function statusOf(s: string | null | undefined): StaffStatus {
  if (s === 'online' || s === 'busy' || s === 'offline') return s
  return 'offline'
}

// KST 등 로컬 타임존 기준 날짜 문자열 — toISOString()은 UTC 변환으로 날짜가 틀림
function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function countWeekdayInMonth(dow: number, year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month, d).getDay() === dow) count++
  }
  return count
}

// ── 타입
type ClassRow = {
  id: string; name: string; subject: string; grade: string
  start_time: string | null; end_time: string | null; day_of_week: number[] | null
}
type ExtraSchedule = {
  id: string; title: string; scheduled_date: string
  start_time: string; end_time: string; note: string | null
}
type StaffMember = {
  userId: string; name: string; role: string
  status: StaffStatus; updatedAt: string | null
}
type PopupData =
  | { kind: 'class'; cls: ClassRow; color: ReturnType<typeof getClassColor> }
  | { kind: 'extra'; es: ExtraSchedule }

interface Props {
  classes: ClassRow[]
  extraSchedules: ExtraSchedule[]
  initialStaff: StaffMember[]
  currentUserId: string
  myInitialStatus: StaffStatus
}

// ── 분반 카드
function ClassCard({
  cls, color, isActive, startHour, onClick,
}: {
  cls: ClassRow; color: ReturnType<typeof getClassColor>
  isActive: boolean; startHour: number; onClick: () => void
}) {
  const top    = (timeToMin(cls.start_time!) - startHour * 60) * PX_PER_MIN
  const height = Math.max((timeToMin(cls.end_time!) - timeToMin(cls.start_time!)) * PX_PER_MIN, 20)
  return (
    <div
      className="absolute inset-x-0.5 rounded-md px-1.5 py-0.5 overflow-hidden cursor-pointer transition-all hover:brightness-95 active:scale-95"
      onClick={onClick}
      style={{
        top, height,
        backgroundColor: color.bg, color: color.text,
        borderLeft: `3px solid ${color.border}`,
        boxShadow: isActive ? `0 0 0 2px ${color.ring}` : undefined,
        zIndex: isActive ? 10 : 1,
      }}
    >
      <p className="text-[9px] font-bold leading-tight truncate">{cls.name}</p>
      {height >= 30 && (
        <p className="text-[8px] opacity-65 mt-0.5 truncate">
          {cls.start_time!.slice(0, 5)}–{cls.end_time!.slice(0, 5)}
        </p>
      )}
    </div>
  )
}

// ── 추가 근무 카드 (시간표 내)
function ExtraCard({
  es, startHour, onClick,
}: {
  es: ExtraSchedule; startHour: number; onClick: () => void
}) {
  const top    = (timeToMin(es.start_time) - startHour * 60) * PX_PER_MIN
  const height = Math.max((timeToMin(es.end_time) - timeToMin(es.start_time)) * PX_PER_MIN, 20)
  return (
    <div
      className="absolute inset-x-0.5 rounded-md px-1.5 py-0.5 overflow-hidden cursor-pointer transition-all hover:brightness-95 active:scale-95"
      onClick={onClick}
      style={{
        top, height,
        backgroundColor: '#fef3c7',
        borderLeft: '3px dashed #fbbf24',
        zIndex: 2,
      }}
    >
      <p className="text-[9px] font-bold leading-tight truncate text-amber-800">{es.title}</p>
      {height >= 30 && (
        <p className="text-[8px] text-amber-700 opacity-65 mt-0.5 truncate">
          {es.start_time.slice(0, 5)}–{es.end_time.slice(0, 5)}
        </p>
      )}
    </div>
  )
}

// ── 메인 컴포넌트
export function ScheduleClient({
  classes, extraSchedules, initialStaff, currentUserId, myInitialStatus,
}: Props) {
  const [now, setNow]           = useState(new Date())
  const [staff, setStaff]       = useState(initialStaff)
  const [myStatus, setMyStatus] = useState(myInitialStatus)
  const [localExtras, setLocalExtras] = useState(extraSchedules)
  const [addOpen, setAddOpen]   = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [popup, setPopup]       = useState<PopupData | null>(null)
  const wasInClassRef           = useRef(false)

  // 서버에서 새 props가 오면 (router.refresh 후) 로컬 상태 동기화
  useEffect(() => { setLocalExtras(extraSchedules) }, [extraSchedules])

  // 30초마다 시계 업데이트
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  // 수업 시간 진입 시 자동 온라인 전환
  useEffect(() => {
    const dow = now.getDay()
    const min = now.getHours() * 60 + now.getMinutes()
    const inClass = classes.some((c) => {
      if (!c.day_of_week?.includes(dow)) return false
      if (!c.start_time || !c.end_time) return false
      return min >= timeToMin(c.start_time) && min < timeToMin(c.end_time)
    })
    if (inClass && !wasInClassRef.current) {
      setMyStatus('online')
      startTransition(async () => { await updateStaffStatus('online') })
    }
    wasInClassRef.current = inClass
  }, [now, classes])

  // 스태프 상태 실시간 구독
  useEffect(() => {
    const supabase = createClient()
    const ch = supabase
      .channel('schedule_staff_status')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_status' }, (payload) => {
        const row = payload.new as { user_id: string; status: string; updated_at: string } | undefined
        if (!row) return
        setStaff((prev) =>
          prev.map((s) =>
            s.userId === row.user_id
              ? { ...s, status: statusOf(row.status), updatedAt: row.updated_at }
              : s,
          ),
        )
        if (row.user_id === currentUserId) setMyStatus(statusOf(row.status))
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [currentUserId])

  // 이번 주 날짜 + weekDateSet (로컬 타임존 기준)
  const weekDates   = useMemo(() => getWeekDates(), [])
  const weekDateSet = useMemo(
    () => new Set(weekDates.map(localDateStr)),   // ← toISOString() 대신 로컬 날짜
    [weekDates],
  )
  const weekExtra = useMemo(
    () => localExtras.filter((es) => weekDateSet.has(es.scheduled_date)),
    [localExtras, weekDateSet],
  )

  // 시간표 동적 범위 (실제 수업/추가 근무 기준)
  const { dynStart, dynEnd } = useMemo(() => {
    const mins = [
      ...classes.filter((c) => c.start_time && c.end_time).flatMap((c) => [
        timeToMin(c.start_time!), timeToMin(c.end_time!),
      ]),
      ...weekExtra.flatMap((es) => [timeToMin(es.start_time), timeToMin(es.end_time)]),
    ]
    if (mins.length === 0) return { dynStart: 9, dynEnd: 21 }
    return {
      dynStart: Math.max(7,  Math.floor(Math.min(...mins) / 60) - 1),
      dynEnd:   Math.min(24, Math.ceil(Math.max(...mins)  / 60) + 1),
    }
  }, [classes, weekExtra])

  const totalH   = (dynEnd - dynStart) * 60 * PX_PER_MIN
  const minToTop = (min: number) => (min - dynStart * 60) * PX_PER_MIN
  const hours    = Array.from({ length: dynEnd - dynStart }, (_, i) => dynStart + i)

  // 이번 달 근무 시간 계산
  const { regularHours, extraHours } = useMemo(() => {
    const year  = now.getFullYear()
    const month = now.getMonth()

    const regularH = classes.reduce((total, cls) => {
      if (!cls.start_time || !cls.end_time || !cls.day_of_week?.length) return total
      const sessionH = (timeToMin(cls.end_time) - timeToMin(cls.start_time)) / 60
      const sessions = cls.day_of_week.reduce(
        (sum, dow) => sum + countWeekdayInMonth(dow, year, month), 0,
      )
      return total + sessionH * sessions
    }, 0)

    const extraH = localExtras.reduce((total, es) => {
      return total + (timeToMin(es.end_time) - timeToMin(es.start_time)) / 60
    }, 0)

    return { regularHours: regularH, extraHours: extraH }
  }, [classes, localExtras, now])

  const todayDow = now.getDay()
  const nowMin   = now.getHours() * 60 + now.getMinutes()
  const nowTop   = minToTop(nowMin)

  const sorted   = [...classes].sort((a, b) => a.name.localeCompare(b.name))
  const colorMap = Object.fromEntries(sorted.map((c, i) => [c.id, getClassColor(i)]))

  function isActive(cls: ClassRow) {
    if (!cls.day_of_week?.includes(todayDow)) return false
    if (!cls.start_time || !cls.end_time) return false
    return nowMin >= timeToMin(cls.start_time) && nowMin < timeToMin(cls.end_time)
  }

  function handleStatusChange(status: StaffStatus) {
    setMyStatus(status)
    startTransition(async () => { await updateStaffStatus(status) })
  }

  function handleAddExtra(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createExtraSchedule(fd)
      if (!res.success) { setFormError(res.error); return }
      // 서버에서 반환된 실제 레코드로 상태 업데이트 (router.refresh 불필요)
      setLocalExtras((prev) =>
        [...prev, res.data!].sort(
          (a, b) => a.scheduled_date.localeCompare(b.scheduled_date) || a.start_time.localeCompare(b.start_time),
        ),
      )
      setAddOpen(false)
    })
  }

  function handleDelete(id: string) {
    setLocalExtras((prev) => prev.filter((e) => e.id !== id)) // 낙관적 제거
    startTransition(async () => {
      await deleteExtraSchedule(id)
    })
  }

  const dateRange  = `${weekDates[0].getMonth() + 1}/${weekDates[0].getDate()} – ${weekDates[6].getMonth() + 1}/${weekDates[6].getDate()}`
  const monthLabel = now.toLocaleDateString('ko-KR', { month: 'long' })

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-zinc-950">근무</h1>
        <p className="mt-0.5 text-sm text-zinc-400">이번 주 {dateRange}</p>
      </div>

      {/* ── 시간표 + 추가 근무 ── */}
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
                    const colDate    = weekDates[colIdx]
                    const colDateStr = localDateStr(colDate) // ← 로컬 타임존 기준
                    const isToday    = colDate.toDateString() === now.toDateString()
                    const isWeekend  = colIdx >= 5
                    const dayClasses = classes.filter(
                      (c) => c.day_of_week?.includes(dow) && c.start_time && c.end_time,
                    )
                    const dayExtra = weekExtra.filter((es) => es.scheduled_date === colDateStr)

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
                            onClick={() => setPopup({ kind: 'class', cls, color: colorMap[cls.id] })}
                          />
                        ))}

                        {dayExtra.map((es) => (
                          <ExtraCard
                            key={es.id}
                            es={es}
                            startHour={dynStart}
                            onClick={() => setPopup({ kind: 'extra', es })}
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

        {/* 오른쪽: 추가 근무 목록 + 근무 시간 요약 */}
        <div className="w-72 shrink-0 space-y-4">

          {/* 추가 근무 목록 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-zinc-950">추가 근무</h2>
                <p className="text-xs text-zinc-400 mt-0.5">{monthLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => { setFormError(null); setAddOpen(true) }}
                className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                + 등록
              </button>
            </div>

            {localExtras.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-6 text-center text-sm text-zinc-400">
                이번 달 등록된 추가 근무가 없습니다.
              </div>
            ) : (
              <div className="space-y-2">
                {localExtras.map((es) => {
                  const d = new Date(es.scheduled_date + 'T00:00:00')
                  const dateLabel = d.toLocaleDateString('ko-KR', {
                    month: 'numeric', day: 'numeric', weekday: 'short',
                  })
                  const isThisWeek = weekDateSet.has(es.scheduled_date)
                  return (
                    <div
                      key={es.id}
                      className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-zinc-900">{es.title}</span>
                          {isThisWeek && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                              이번 주
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-zinc-400">
                          <span>{dateLabel}</span>
                          <span>·</span>
                          <span>{es.start_time.slice(0, 5)}–{es.end_time.slice(0, 5)}</span>
                        </div>
                        {es.note && (
                          <p className="text-xs text-zinc-400 truncate mt-0.5">{es.note}</p>
                        )}
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

          {/* 근무 시간 요약 */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-4">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              근무 시간 · {monthLabel}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500">정규 수업</span>
                <span className="text-sm font-medium text-zinc-700">{regularHours.toFixed(1)}h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500">추가 근무</span>
                <span className="text-sm font-medium text-zinc-700">{extraHours.toFixed(1)}h</span>
              </div>
              <div className="border-t border-zinc-100 pt-2 flex justify-between items-center">
                <span className="text-xs font-semibold text-zinc-700">이번 달 합계</span>
                <span className="text-sm font-bold text-zinc-900">
                  {(regularHours + extraHours).toFixed(1)}h
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ── 근무 상태 + 스태프 현황 ── */}
      <div className="mt-6 space-y-4">

        {/* 내 상태 */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">내 상태</p>
          <div className="flex flex-wrap gap-2">
            {(['online', 'busy', 'offline'] as StaffStatus[]).map((s) => {
              const cfg    = STATUS_CONFIG[s]
              const active = myStatus === s
              return (
                <button
                  key={s}
                  type="button"
                  disabled={isPending}
                  onClick={() => handleStatusChange(s)}
                  className={[
                    'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                    active
                      ? 'bg-zinc-950 text-white shadow-sm'
                      : 'border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900',
                    isPending ? 'opacity-50 cursor-not-allowed' : '',
                  ].join(' ')}
                >
                  <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                  {cfg.label}
                  {active && <span className="ml-1 text-[10px] text-zinc-400">현재</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* 스태프 현황 */}
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-900">스태프 현황</h2>
            <span className="text-xs text-zinc-400">실시간</span>
          </div>
          {staff.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-zinc-400">등록된 스태프가 없습니다.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {staff.map((member) => {
                const s   = statusOf(member.status)
                const cfg = STATUS_CONFIG[s]
                const isMe = member.userId === currentUserId
                return (
                  <li key={member.userId} className="flex items-center gap-3 px-5 py-3.5">
                    <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                        {member.name}
                        {isMe && <span className="text-[10px] font-normal text-zinc-400">(나)</span>}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {member.role === 'teacher' ? '선생님' : '조교'}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* ── 카드 팝업 ── */}
      {popup && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopup(null)} />
          <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center p-4">
            <div
              className="pointer-events-auto rounded-2xl bg-white shadow-2xl border border-zinc-100 p-5 min-w-[200px]"
              style={
                popup.kind === 'class'
                  ? { borderLeft: `4px solid ${popup.color.border}` }
                  : { borderLeft: '4px solid #fbbf24' }
              }
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  {popup.kind === 'class' ? (
                    <>
                      <p className="font-bold text-zinc-900">{popup.cls.name}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {popup.cls.subject}{popup.cls.grade ? ` · ${popup.cls.grade}` : ''}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-zinc-900">{popup.es.title}</p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {new Date(popup.es.scheduled_date + 'T00:00:00').toLocaleDateString('ko-KR', {
                          month: 'long', day: 'numeric', weekday: 'short',
                        })}
                      </p>
                    </>
                  )}
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
                {popup.kind === 'class'
                  ? `${popup.cls.start_time?.slice(0, 5)} – ${popup.cls.end_time?.slice(0, 5)}`
                  : `${popup.es.start_time.slice(0, 5)} – ${popup.es.end_time.slice(0, 5)}`}
              </p>
              {popup.kind === 'extra' && popup.es.note && (
                <p className="text-xs text-zinc-400 mt-1">{popup.es.note}</p>
              )}
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
              name="note" rows={2} placeholder="선택 사항"
              className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-3.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:border-zinc-900 focus:bg-white focus:outline-none transition-all resize-none"
            />
          </div>
          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{formError}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button" onClick={() => setAddOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >취소</button>
            <button
              type="submit" disabled={isPending}
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
