'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EmptyState } from '@/components/ui/empty-state'

type ClassOption = { id: string; name: string }
type Question = {
  id: string
  content: string
  status: 'open' | 'in_progress' | 'answered'
  created_at: string
  assigned_ta_id: string | null
  studentName: string
  className: string | null
  assignedTaName: string | null
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

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

interface Props {
  classOptions: ClassOption[]
  selectedStatus: string
  selectedClassId: string | null
  questions: Question[]
}

export function QnaClient({ classOptions, selectedStatus, selectedClassId, questions }: Props) {
  const router = useRouter()

  function applyFilter(status: string, classId: string) {
    const p = new URLSearchParams()
    if (status && status !== 'all') p.set('status', status)
    if (classId) p.set('classId', classId)
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

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  const counts = {
    all: questions.length,
    open: questions.filter((q) => q.status === 'open').length,
    in_progress: questions.filter((q) => q.status === 'in_progress').length,
    answered: questions.filter((q) => q.status === 'answered').length,
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-950">질의응답</h1>
      </div>

      {/* 상태 필터 */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((s) => (
          <button
            key={s.value}
            onClick={() => applyFilter(s.value, selectedClassId ?? '')}
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
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => applyFilter(selectedStatus, '')}
          className={[
            'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
            !selectedClassId ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
          ].join(' ')}
        >
          전체 분반
        </button>
        {classOptions.map((c) => (
          <button
            key={c.id}
            onClick={() => applyFilter(selectedStatus, c.id)}
            className={[
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              selectedClassId === c.id ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
            ].join(' ')}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* 질문 목록 */}
      {questions.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white">
          <EmptyState message="질문이 없습니다." description="학생들이 질문을 등록하면 여기에 나타납니다." />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                <th className="px-4 py-3 font-medium">학생</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">분반</th>
                <th className="px-4 py-3 font-medium">질문 내용</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">담당 조교</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">등록일</th>
                <th className="px-4 py-3 font-medium text-right">상세</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {questions.map((q) => (
                <tr key={q.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900">{q.studentName}</td>
                  <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">
                    {q.className ?? <span className="text-zinc-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 max-w-xs">
                    <span className="line-clamp-2">{q.content}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[q.status]}`}>
                      {STATUS_LABEL[q.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">
                    {q.assignedTaName ?? <span className="text-zinc-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-400 hidden lg:table-cell">{formatDate(q.created_at)}</td>
                  <td className="px-4 py-3 text-right">
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
