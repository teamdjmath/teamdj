'use client'

import { useState } from 'react'

export interface ExamResultItem {
  id: string
  examName: string
  examType: string
  examDate: string
  score: number
  maxScore: number
  grade: string | null
  rankInExam: number | null
  totalInExam: number | null
  studySuggestion: string | null
}

export function ExamResultsList({ items }: { items: ExamResultItem[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <ul className="divide-y divide-zinc-100">
      {items.map((e) => {
        const hasSuggestion = !!e.studySuggestion?.trim()
        const isOpen = openId === e.id && hasSuggestion

        return (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => hasSuggestion && setOpenId(isOpen ? null : e.id)}
              className={`w-full py-3 text-left ${hasSuggestion ? 'cursor-pointer' : 'cursor-default'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-sm font-medium text-zinc-900">
                    <span className="truncate">{e.examName}</span>
                    {hasSuggestion && (
                      <svg
                        className={`h-3 w-3 shrink-0 text-zinc-300 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                        fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                      </svg>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {e.examType} · {e.examDate}
                    {hasSuggestion && !isOpen && <span className="ml-1.5 text-zinc-900">· 선생님 분석 보기</span>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-zinc-900">{e.score} / {e.maxScore}점</p>
                  <div className="flex gap-1.5 justify-end mt-0.5">
                    {e.grade && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600">{e.grade}</span>
                    )}
                    {e.rankInExam != null && (
                      <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[11px] text-white">
                        {e.rankInExam}/{e.totalInExam ?? '?'}등
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>

            {isOpen && (
              <div className="pb-4 -mt-1">
                <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3">
                  <p className="mb-1.5 text-xs font-semibold text-zinc-500">선생님 분석 · 학습 제안</p>
                  <p className="text-xs leading-relaxed text-zinc-700 whitespace-pre-wrap">{e.studySuggestion}</p>
                </div>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
