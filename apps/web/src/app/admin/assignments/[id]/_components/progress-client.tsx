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

export function ProgressClient({ assignmentId, dueDate, students, existingProgress, existingSubmitDates = {} }: Props) {
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

  const isOverdueDate = dueDate ? dueDate < TODAY : false

  function setPct(studentId: string, value: number | null) {
    setPctMap((m) => ({ ...m, [studentId]: value }))
    setResultMsg('')
  }

  function setSubmitDate(studentId: string, value: string) {
    setSubmitDateMap((m) => ({ ...m, [studentId]: value }))
  }

  function setAll(value: number | null) {
    const updated: Record<string, number | null> = {}
    for (const s of students) updated[s.id] = value
    setPctMap(updated)
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
      studentId:     s.id,
      completionPct: pctMap[s.id] ?? null,
      submitDate:    submitDateMap[s.id] || undefined,
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

  const notSubmitted = students.filter((s) => pctMap[s.id] === null).length
  const complete     = students.filter((s) => pctMap[s.id] === 100).length
  const incomplete   = students.length - notSubmitted - complete

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
                <th className="px-4 py-3 font-medium whitespace-nowrap">제출일</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {students.map((s) => {
                const pct = pctMap[s.id]
                const rowBg =
                  pct === null   ? 'bg-amber-50/60' :
                  pct === 100    ? '' :
                  'bg-red-50/50'
                return (
                  <tr key={s.id} className={rowBg}>
                    <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">{s.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {PROGRESS_OPTIONS.map((opt) => {
                          const isActive = pct === opt.value
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
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={submitDateMap[s.id] ?? ''}
                        onChange={(e) => setSubmitDate(s.id, e.target.value)}
                        className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-zinc-950 focus:outline-none focus:ring-0 transition-all"
                      />
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
