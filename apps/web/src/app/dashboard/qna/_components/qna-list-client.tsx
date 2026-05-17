'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Textbook = { id: string; name: string }

interface MyQuestion {
  id: string
  title: string
  status: string
  created_at: string
}

interface ClassQuestion {
  id: string
  title: string
  status: string
  created_at: string
  studentName: string
  textbookName: string | null
  problem_number: string | null
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  open:        { label: '미답변',   cls: 'bg-zinc-100 text-zinc-400' },
  in_progress: { label: '답변중',   cls: 'bg-zinc-950 text-white' },
  answered:    { label: '답변완료', cls: 'bg-zinc-100 text-zinc-900 font-bold' },
}

function StatusBadge({ status }: { status: string }) {
  const { label, cls } = STATUS_MAP[status] ?? { label: status, cls: 'bg-zinc-100 text-zinc-400' }
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>
      {label}
    </span>
  )
}

interface Props {
  tab: 'my' | 'class'
  myQuestions: MyQuestion[]
  classQuestions: ClassQuestion[]
  textbooks: Textbook[]
  selectedTextbookId: string
  selectedProblemNumber: string
}

export function QnaListClient({
  tab,
  myQuestions,
  classQuestions,
  textbooks,
  selectedTextbookId,
  selectedProblemNumber,
}: Props) {
  const router = useRouter()
  const [problemInput, setProblemInput] = useState(selectedProblemNumber)

  function applyFilter(params: { tab?: string; textbookId?: string; problemNumber?: string }) {
    const p = new URLSearchParams()
    const newTab = params.tab ?? tab
    const textbookId = params.textbookId ?? selectedTextbookId
    const problemNumber = params.problemNumber ?? problemInput

    if (newTab !== 'my') p.set('tab', newTab)
    if (textbookId) p.set('textbookId', textbookId)
    if (problemNumber) p.set('problemNumber', problemNumber)
    router.push(`/dashboard/qna?${p.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Q&A</h1>
        <Link
          href="/dashboard/qna/new"
          className="rounded-2xl bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-95 shadow-sm"
        >
          새 질문 등록
        </Link>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 border-b border-zinc-200">
        {([['my', '내 질문'], ['class', '분반 전체 질문']] as const).map(([t, label]) => (
          <button
            key={t}
            onClick={() => applyFilter({ tab: t, textbookId: '', problemNumber: '' })}
            className={[
              'px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px',
              tab === t
                ? 'border-zinc-900 text-zinc-900'
                : 'border-transparent text-zinc-400 hover:text-zinc-700',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 내 질문 탭 */}
      {tab === 'my' && (
        <div className="space-y-3">
          {myQuestions.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-400">등록된 질문이 없습니다.</p>
          ) : (
            myQuestions.map((q) => (
              <Link
                key={q.id}
                href={`/dashboard/qna/${q.id}`}
                className="flex flex-col gap-2 p-5 rounded-[24px] bg-zinc-50 transition-all hover:bg-zinc-100 group"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="flex-1 truncate text-[15px] font-bold text-zinc-800">
                    {q.title || '제목 없음'}
                  </span>
                  <StatusBadge status={q.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400">
                    {new Date(q.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  <svg className="w-4 h-4 text-zinc-200 group-hover:text-zinc-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* 분반 전체 질문 탭 */}
      {tab === 'class' && (
        <div className="space-y-4">
          {/* 교재 + 문항번호 필터 */}
          <div className="flex flex-wrap gap-2 items-center">
            <select
              value={selectedTextbookId}
              onChange={(e) => applyFilter({ textbookId: e.target.value })}
              className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 focus:border-zinc-900 focus:outline-none"
            >
              <option value="">교재 전체</option>
              {textbooks.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={problemInput}
                onChange={(e) => setProblemInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilter({ problemNumber: problemInput })}
                placeholder="문항번호 검색"
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none w-36"
              />
              <button
                onClick={() => applyFilter({ problemNumber: problemInput })}
                className="rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                검색
              </button>
              {(selectedTextbookId || selectedProblemNumber) && (
                <button
                  onClick={() => { setProblemInput(''); applyFilter({ textbookId: '', problemNumber: '' }) }}
                  className="text-sm text-zinc-400 hover:text-zinc-700 transition-colors px-2"
                >
                  초기화
                </button>
              )}
            </div>
          </div>

          {/* 질문 목록 */}
          {classQuestions.length === 0 ? (
            <p className="py-12 text-center text-sm text-zinc-400">표시할 질문이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {classQuestions.map((q) => (
                <Link
                  key={q.id}
                  href={`/dashboard/qna/${q.id}`}
                  className="flex flex-col gap-2 p-5 rounded-[24px] bg-zinc-50 transition-all hover:bg-zinc-100 group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex-1 truncate text-[15px] font-bold text-zinc-800">
                      {q.title || '제목 없음'}
                    </span>
                    <StatusBadge status={q.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-400">
                      <span>{q.studentName}</span>
                      {q.textbookName && (
                        <>
                          <span>·</span>
                          <span>{q.textbookName}</span>
                          {q.problem_number && <span>{q.problem_number}번</span>}
                        </>
                      )}
                      <span>·</span>
                      <span>
                        {new Date(q.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-zinc-200 group-hover:text-zinc-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
