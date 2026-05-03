'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveProgress } from '@/lib/actions/assignments'

type Student = { id: string; name: string }

interface Props {
  assignmentId: string
  dueDate: string | null
  students: Student[]
  existingProgress: Record<string, number>
}

const TODAY = new Date().toISOString().split('T')[0]

export function ProgressClient({ assignmentId, dueDate, students, existingProgress }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [resultMsg, setResultMsg] = useState('')
  const [isError, setIsError] = useState(false)

  const [pctMap, setPctMap] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {}
    for (const s of students) {
      init[s.id] = existingProgress[s.id] ?? 0
    }
    return init
  })

  const isOverdueDate = dueDate ? dueDate < TODAY : false

  function setPct(studentId: string, value: number) {
    const clamped = Math.min(100, Math.max(0, value))
    setPctMap((m) => ({ ...m, [studentId]: clamped }))
  }

  function setAll100() {
    setPctMap((m) => {
      const updated = { ...m }
      for (const s of students) updated[s.id] = 100
      return updated
    })
  }

  function setAll0() {
    setPctMap((m) => {
      const updated = { ...m }
      for (const s of students) updated[s.id] = 0
      return updated
    })
  }

  function handleSave() {
    setResultMsg('')
    const entries = students.map((s) => ({
      studentId: s.id,
      completionPct: pctMap[s.id] ?? 0,
    }))
    startTransition(async () => {
      const result = await saveProgress(assignmentId, dueDate, entries)
      if (result.error) {
        setIsError(true)
        setResultMsg(result.error)
      } else {
        setIsError(false)
        setResultMsg(`${result.savedCount}명 저장 완료`)
        router.refresh()
      }
    })
  }

  const incomplete = students.filter((s) => (pctMap[s.id] ?? 0) < 100).length
  const complete = students.length - incomplete

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
      <div className="mb-4 flex items-center gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">
        <span className="text-zinc-500">전체 <span className="font-semibold text-zinc-900">{students.length}</span>명</span>
        <span className="text-zinc-300">|</span>
        <span className="text-zinc-500">완료 <span className="font-semibold text-zinc-900">{complete}</span>명</span>
        <span className="text-zinc-300">|</span>
        <span className="text-zinc-500">미완료 <span className="font-semibold text-red-500">{incomplete}</span>명</span>
        {isOverdueDate && (
          <>
            <span className="text-zinc-300">|</span>
            <span className="text-xs font-medium text-red-500">마감 지남</span>
          </>
        )}
      </div>

      {/* 테이블 */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
              <th className="px-4 py-3 font-medium">학생</th>
              <th className="px-4 py-3 font-medium">완료율 (%)</th>
              <th className="px-4 py-3 font-medium text-center hidden sm:table-cell">상태</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {students.map((s) => {
              const pct = pctMap[s.id] ?? 0
              const incomplete = pct < 100
              return (
                <tr
                  key={s.id}
                  className={incomplete ? 'bg-red-50' : ''}
                >
                  <td className="px-4 py-3 font-medium text-zinc-900">{s.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={pct}
                        onChange={(e) => setPct(s.id, parseInt(e.target.value) || 0)}
                        className="w-20 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm text-center focus:border-zinc-400 focus:outline-none focus:ring-0"
                      />
                      <span className="text-zinc-400 text-xs">/ 100</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    {incomplete ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">미완료</span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600">완료</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 하단 액션 바 */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={setAll100}
            className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
          >
            전원 100%
          </button>
          <button
            onClick={setAll0}
            className="rounded-lg bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
          >
            전원 0%
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
