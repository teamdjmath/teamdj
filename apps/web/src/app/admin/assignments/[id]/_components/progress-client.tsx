'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveProgress } from '@/lib/actions/assignments'

type Student = { id: string; name: string }

interface Props {
  assignmentId: string
  dueDate: string | null
  students: Student[]
  existingProgress: Record<string, number | null>
  existingSubmitDates?: Record<string, string>
  existingBeforeEnrollment?: Record<string, boolean>
}

const TODAY = new Date().toISOString().split('T')[0]

const PROGRESS_OPTIONS: { label: string; value: number | null }[] = [
  { label: '미지참', value: null },
  { label: '0%',    value: 0 },
  { label: '20%',   value: 20 },
  { label: '40%',   value: 40 },
  { label: '60%',   value: 60 },
  { label: '80%',   value: 80 },
  { label: '100%',  value: 100 },
]

export function ProgressClient({ assignmentId, dueDate, students, existingProgress, existingSubmitDates = {}, existingBeforeEnrollment = {} }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [resultMsg, setResultMsg] = useState('')
  const [isError, setIsError] = useState(false)

  const [pctMap, setPctMap] = useState<Record<string, number | null>>(() => {
    const init: Record<string, number | null> = {}
    for (const s of students) {
      init[s.id] = s.id in existingProgress ? existingProgress[s.id] : null
    }
    return init
  })

  const [submitDateMap, setSubmitDateMap] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const s of students) {
      if (existingSubmitDates[s.id]) init[s.id] = existingSubmitDates[s.id]
    }
    return init
  })

  // 중간 참여 학생 — 과제 부여 시점에 아직 등원하지 않아 미지참과 구분해야 하는 경우
  const [beforeMap, setBeforeMap] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    for (const s of students) {
      if (existingBeforeEnrollment[s.id]) init[s.id] = true
    }
    return init
  })

  const isOverdueDate = dueDate ? dueDate < TODAY : false

  function setPct(studentId: string, value: number | null) {
    setPctMap((m) => ({ ...m, [studentId]: value }))
    setBeforeMap((m) => ({ ...m, [studentId]: false }))
    setResultMsg('')
  }

  function setBeforeEnrollment(studentId: string) {
    setPctMap((m) => ({ ...m, [studentId]: null }))
    setBeforeMap((m) => ({ ...m, [studentId]: true }))
    // 등원 전이므로 제출일도 의미가 없다
    setSubmitDateMap((m) => {
      const next = { ...m }
      delete next[studentId]
      return next
    })
    setResultMsg('')
  }

  function setSubmitDate(studentId: string, value: string) {
    setSubmitDateMap((m) => ({ ...m, [studentId]: value }))
  }

  // 제출일 오늘로 일괄 설정 — 이미 100%(제출 완료)이고 제출일이 기록된 학생은
  // 실제 제출일을 보존해야 하므로 덮어쓰지 않는다
  function setAllSubmitDatesToday() {
    setSubmitDateMap((m) => {
      const next: Record<string, string> = {}
      for (const s of students) {
        if (beforeMap[s.id]) continue // 등원 전 학생은 제출일 대상이 아님
        const done = pctMap[s.id] === 100 && !!m[s.id]
        next[s.id] = done ? m[s.id] : TODAY
      }
      return next
    })
    setResultMsg('')
  }

  function setAll(value: number | null) {
    const updated: Record<string, number | null> = {}
    for (const s of students) updated[s.id] = value
    setPctMap(updated)
    setBeforeMap({})
    if (value === 100) {
      setSubmitDateMap((m) => {
        const next = { ...m }
        for (const s of students) {
          if (!next[s.id]) next[s.id] = TODAY
        }
        return next
      })
    }
    setResultMsg('')
  }

  function handleSave() {
    setResultMsg('')
    const entries = students.map((s) => ({
      studentId:        s.id,
      completionPct:    pctMap[s.id] ?? null,
      submitDate:       submitDateMap[s.id] || undefined,
      beforeEnrollment: beforeMap[s.id] ?? false,
    }))
    startTransition(async () => {
      const result = await saveProgress(assignmentId, dueDate, entries)
      if (!result.success) {
        setIsError(true)
        setResultMsg(result.error)
      } else {
        setIsError(false)
        setResultMsg(`${result.data?.savedCount ?? 0}명 저장 완료`)
        router.refresh()
      }
    })
  }

  const beforeEnrollmentCount = students.filter((s) => beforeMap[s.id]).length
  const notSubmitted = students.filter((s) => pctMap[s.id] === null && !beforeMap[s.id]).length
  const complete     = students.filter((s) => pctMap[s.id] === 100).length
  const incomplete   = students.length - notSubmitted - complete - beforeEnrollmentCount

  if (students.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center text-sm text-zinc-400">
        이 분반에 등록된 학생이 없습니다.
      </div>
    )
  }

  return (
    <div>
      {/* 통계 바 */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">
        <span className="text-zinc-500">전체 <span className="font-semibold text-zinc-900">{students.length}</span>명</span>
        <span className="text-zinc-300">|</span>
        <span className="text-zinc-500">완료 <span className="font-semibold text-zinc-900">{complete}</span>명</span>
        <span className="text-zinc-300">|</span>
        <span className="text-zinc-500">미완료 <span className="font-semibold text-red-500">{incomplete}</span>명</span>
        <span className="text-zinc-300">|</span>
        <span className="text-zinc-500">미지참 <span className="font-semibold text-amber-500">{notSubmitted}</span>명</span>
        <span className="text-zinc-300">|</span>
        <span className="text-zinc-500">첫 등원 이전 <span className="font-semibold text-blue-500">{beforeEnrollmentCount}</span>명</span>
        {isOverdueDate && (
          <>
            <span className="text-zinc-300">|</span>
            <span className="text-xs font-medium text-red-500">마감 지남</span>
          </>
        )}
      </div>

      {/* 테이블 */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                <th className="px-4 py-3 font-medium whitespace-nowrap">학생</th>
                <th className="px-4 py-3 font-medium">과제 진행도</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    제출일
                    <button
                      type="button"
                      onClick={setAllSubmitDatesToday}
                      title="이미 100%이고 제출일이 있는 학생은 유지됩니다"
                      className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 transition-colors normal-case"
                    >
                      전원 오늘로
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {students.map((s) => {
                const pct = pctMap[s.id]
                const before = beforeMap[s.id] ?? false
                const rowBg =
                  before         ? 'bg-blue-50/60' :
                  pct === null   ? 'bg-amber-50/60' :
                  pct === 100    ? '' :
                  'bg-red-50/50'
                return (
                  <tr key={s.id} className={rowBg}>
                    <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {PROGRESS_OPTIONS.map((opt) => {
                          const isActive = !before && pct === opt.value
                          let activeClass = 'bg-zinc-900 text-white'
                          if (opt.value === null)  activeClass = 'bg-amber-100 text-amber-800'
                          if (opt.value === 100)   activeClass = 'bg-zinc-900 text-white'
                          return (
                            <button
                              key={String(opt.value)}
                              type="button"
                              onClick={() => setPct(s.id, opt.value)}
                              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                                isActive
                                  ? activeClass
                                  : 'border border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-700'
                              }`}
                            >
                              {opt.label}
                            </button>
                          )
                        })}
                        <button
                          type="button"
                          onClick={() => setBeforeEnrollment(s.id)}
                          title="이 과제가 나가기 전에 아직 등원하지 않은 학생"
                          className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                            before
                              ? 'bg-blue-100 text-blue-800'
                              : 'border border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-700'
                          }`}
                        >
                          첫 등원 이전
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {before ? (
                        <span className="text-xs text-blue-500">해당 없음</span>
                      ) : (
                        <input
                          type="date"
                          value={submitDateMap[s.id] ?? ''}
                          onChange={(e) => setSubmitDate(s.id, e.target.value)}
                          className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-zinc-950 focus:outline-none focus:ring-0 transition-all"
                        />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 하단 액션 바 */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <span className="self-center text-xs text-zinc-400 mr-1">일괄:</span>
          <button
            onClick={() => setAll(null)}
            className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            전원 미지참
          </button>
          <button
            onClick={() => setAll(0)}
            className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
          >
            전원 0%
          </button>
          <button
            onClick={() => setAll(100)}
            className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
          >
            전원 100%
          </button>
        </div>

        <div className="flex items-center gap-3">
          {resultMsg && (
            <span className={`text-sm ${isError ? 'text-red-500' : 'text-zinc-500'}`}>{resultMsg}</span>
          )}
          <button
            onClick={handleSave}
            disabled={pending}
            className="rounded-lg bg-zinc-950 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {pending ? '저장 중...' : '일괄 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
