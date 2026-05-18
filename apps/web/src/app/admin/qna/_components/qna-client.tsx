'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EmptyState } from '@/components/ui/empty-state'

type ClassOption = { id: string; name: string }
type TextbookOption = { id: string; name: string }
type TaOption = { id: string; name: string; role: string }
type Question = {
  id: string
  title: string
  content: string
  status: 'open' | 'in_progress' | 'answered'
  created_at: string
  assigned_ta_id: string | null
  textbook_id: string | null
  problem_number: string | null
  studentName: string
  className: string | null
  assignedTaName: string | null
  textbookName: string | null
  isDuplicate: boolean
}
type MyStats = {
  total: number
  monthly: number
  low: number
  mid: number
  high: number
  unset: number
}

const STATUS_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'open', label: '미답변' },
  { value: 'in_progress', label: '답변중' },
  { value: 'answered', label: '답변완료' },
] as const

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-red-50 text-red-600',
  in_progress: 'bg-zinc-900 text-white',
  answered: 'bg-zinc-100 text-zinc-500',
}

const STATUS_LABEL: Record<string, string> = {
  open: '미답변',
  in_progress: '답변중',
  answered: '답변완료',
}

function roleLabel(role: string) {
  if (role === 'teacher') return '선생님'
  if (role === 'ta_admin') return '사무'
  if (role === 'ta_assistant') return '첨삭'
  return role
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  classOptions: ClassOption[]
  textbookOptions: TextbookOption[]
  taOptions: TaOption[]
  selectedStatus: string
  selectedClassId: string | null
  selectedTextbookId: string | null
  selectedProblemNumber: string
  selectedTaId: string | null
  questions: Question[]
  myStats: MyStats | null
  currentUserId: string | null
}

export function QnaClient({
  classOptions,
  textbookOptions,
  taOptions,
  selectedStatus,
  selectedClassId,
  selectedTextbookId,
  selectedProblemNumber,
  selectedTaId,
  questions,
  myStats,
  currentUserId,
}: Props) {
  const router = useRouter()
  const [problemInput, setProblemInput] = useState(selectedProblemNumber)

  function applyFilter(params: {
    status?: string
    classId?: string
    textbookId?: string
    problemNumber?: string
    taId?: string
  }) {
    const p = new URLSearchParams()
    const status = params.status ?? selectedStatus
    const classId = 'classId' in params ? (params.classId ?? '') : (selectedClassId ?? '')
    const textbookId = 'textbookId' in params ? (params.textbookId ?? '') : (selectedTextbookId ?? '')
    const problemNumber = 'problemNumber' in params ? (params.problemNumber ?? '') : problemInput
    const taId = 'taId' in params ? (params.taId ?? '') : (selectedTaId ?? '')

    if (status && status !== 'all') p.set('status', status)
    if (classId) p.set('classId', classId)
    if (textbookId) p.set('textbookId', textbookId)
    if (problemNumber) p.set('problemNumber', problemNumber)
    if (taId) p.set('taId', taId)
    router.push(`/admin/qna?${p.toString()}`)
  }

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('admin_qna_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qna_questions' }, () => {
        router.refresh()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [router])

  const counts = {
    all: questions.length,
    open: questions.filter((q) => q.status === 'open').length,
    in_progress: questions.filter((q) => q.status === 'in_progress').length,
    answered: questions.filter((q) => q.status === 'answered').length,
  }

  const isMyFilter = !!selectedTaId && selectedTaId === currentUserId
  const hasActiveFilter = selectedTaId || selectedTextbookId || selectedProblemNumber

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-950">질의응답</h1>
      </div>

      {/* 내 답변 현황 카드 */}
      {myStats && myStats.total > 0 && (
        <button
          type="button"
          onClick={() => currentUserId && applyFilter({ taId: isMyFilter ? '' : currentUserId })}
          className={[
            'mb-5 w-full text-left rounded-2xl border px-5 py-4 transition-colors',
            isMyFilter
              ? 'border-zinc-950 bg-zinc-950 text-white'
              : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50',
          ].join(' ')}
        >
          <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${isMyFilter ? 'text-zinc-400' : 'text-zinc-400'}`}>
            내 답변 현황 {isMyFilter && '· 필터 적용 중'}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            <span className="text-sm">
              <span className={`font-bold text-lg ${isMyFilter ? 'text-white' : 'text-zinc-950'}`}>{myStats.total}</span>
              <span className={`ml-1 ${isMyFilter ? 'text-zinc-300' : 'text-zinc-400'}`}>전체</span>
            </span>
            <span className="text-sm">
              <span className={`font-bold text-lg ${isMyFilter ? 'text-white' : 'text-zinc-950'}`}>{myStats.monthly}</span>
              <span className={`ml-1 ${isMyFilter ? 'text-zinc-300' : 'text-zinc-400'}`}>이번 달</span>
            </span>
            <span className={`self-center h-4 w-px ${isMyFilter ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
            <span className="text-sm">
              <span className={`font-semibold ${isMyFilter ? 'text-zinc-200' : 'text-zinc-600'}`}>하 {myStats.low}</span>
            </span>
            <span className="text-sm">
              <span className={`font-semibold ${isMyFilter ? 'text-zinc-200' : 'text-zinc-600'}`}>중 {myStats.mid}</span>
            </span>
            <span className="text-sm">
              <span className={`font-semibold ${isMyFilter ? 'text-zinc-200' : 'text-zinc-600'}`}>상 {myStats.high}</span>
            </span>
            {myStats.unset > 0 && (
              <span className="text-sm">
                <span className={`${isMyFilter ? 'text-zinc-500' : 'text-zinc-300'}`}>미설정 {myStats.unset}</span>
              </span>
            )}
          </div>
        </button>
      )}

      {/* 상태 필터 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => applyFilter({ status: s.value })}
            className={[
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              selectedStatus === s.value
                ? 'bg-zinc-950 text-white'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
            ].join(' ')}
          >
            {s.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedStatus === s.value ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
              {counts[s.value as keyof typeof counts] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* 분반 필터 */}
      <div className="mb-4">
        <select
          value={selectedClassId ?? ''}
          onChange={(e) => applyFilter({ classId: e.target.value })}
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 focus:border-zinc-900 focus:outline-none"
        >
          <option value="">전체 분반</option>
          {classOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* 교재 + 문항번호 + 담당 조교 필터 */}
      <div className="mb-6 flex flex-wrap gap-2 items-center">
        <select
          value={selectedTextbookId ?? ''}
          onChange={(e) => applyFilter({ textbookId: e.target.value })}
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 focus:border-zinc-900 focus:outline-none"
        >
          <option value="">교재 전체</option>
          {textbookOptions.map((t) => (
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
            className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none w-36"
          />
          <button
            onClick={() => applyFilter({ problemNumber: problemInput })}
            className="rounded-xl bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
          >
            검색
          </button>
        </div>

        {/* 담당 조교 필터 */}
        <select
          value={selectedTaId ?? ''}
          onChange={(e) => applyFilter({ taId: e.target.value })}
          className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 focus:border-zinc-900 focus:outline-none"
        >
          <option value="">담당 조교 전체</option>
          {taOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} ({roleLabel(t.role)})
            </option>
          ))}
        </select>

        {hasActiveFilter && (
          <button
            onClick={() => { setProblemInput(''); applyFilter({ textbookId: '', problemNumber: '', taId: '' }) }}
            className="rounded-xl px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-700 transition-colors"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* 질문 목록 */}
      {questions.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white">
          <EmptyState message="질문이 없습니다." description="학생들이 질문을 등록하면 여기에 나타납니다." />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full min-w-[780px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[80px]">학생</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[120px] hidden sm:table-cell">분반</th>
                <th className="px-4 py-3 font-medium min-w-[100px] hidden md:table-cell">교재</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[60px] hidden md:table-cell">문항</th>
                <th className="px-4 py-3 font-medium">질문 내용</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[80px]">상태</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[90px] hidden md:table-cell">담당 조교</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[100px] hidden lg:table-cell">등록일</th>
                <th className="px-4 py-3 font-medium whitespace-nowrap min-w-[80px] text-right">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {questions.map((q) => (
                <tr
                  key={q.id}
                  className={[
                    'transition-colors',
                    q.isDuplicate ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-zinc-50',
                  ].join(' ')}
                >
                  <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">{q.studentName}</td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap hidden sm:table-cell">
                    {q.className ?? <span className="text-zinc-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 max-w-[140px] hidden md:table-cell">
                    <span className="block truncate">{q.textbookName ?? <span className="text-zinc-300">-</span>}</span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap hidden md:table-cell">
                    {q.problem_number ?? <span className="text-zinc-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 w-full max-w-0">
                    <p className="font-medium text-zinc-800 truncate">{q.title}</p>
                    <span className="block truncate text-xs text-zinc-400">{q.content}</span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[q.status]}`}>
                      {STATUS_LABEL[q.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap hidden md:table-cell">
                    {q.assignedTaName ? (
                      <button
                        type="button"
                        onClick={() => applyFilter({ taId: q.assigned_ta_id ?? '' })}
                        className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-200 transition-colors"
                      >
                        {q.assignedTaName}
                      </button>
                    ) : (
                      <span className="text-zinc-300">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 whitespace-nowrap hidden lg:table-cell">{formatDate(q.created_at)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <Link
                      href={`/admin/qna/${q.id}`}
                      className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
                    >
                      답변하기
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
