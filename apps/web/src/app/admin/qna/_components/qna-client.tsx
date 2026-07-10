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
  avgRating: number | null
  ratedCount: number
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
  if (role === 'ta_desk') return '사무'
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

const EXAMPLE_QUESTION = {
  title: '수능 수학 - f\'(x) = 0에서 극대·극소 판단하는 법을 모르겠어요',
  content: '안녕하세요. 교재 p.87의 12번에서 f(x) = x³ − 3x + 2의 극값을 구하는 과정이 이해가 안 됩니다. f\'(x) = 0이 되는 x를 구하고 나서 극대·극소를 어떻게 판단하는 건가요?',
}

const EXAMPLE_ANSWER_ADMIN = `### 칭찬
도함수를 이용해 극값을 구하려는 방향은 완벽히 맞습니다! 좋은 질문이에요.

### 핵심 포인트
f'(x) = 0인 점에서 f'(x)의 **부호 변화**로 극대/극소를 판단합니다.
 - f'(x): 양 → 음 ⟹ **극대**
 - f'(x): 음 → 양 ⟹ **극소**

### 풀이
f'(x) = 3x² − 3 = 3(x+1)(x−1) = 0 이므로 x = −1 또는 x = 1

증감표를 그리면
 - x = −1 좌우: f'(x) 양 → 음 → **극대**, f(−1) = 4
 - x = 1  좌우: f'(x) 음 → 양 → **극소**, f(1) = 0`

// 학생에게 보이는 형식 (buildStudentContent 로직과 동일)
const EXAMPLE_ANSWER_STUDENT = `안녕하세요 홍길동 학생, 김조교 조교입니다.

도함수를 이용해 극값을 구하려는 방향은 완벽히 맞습니다! 좋은 질문이에요.

f'(x) = 0인 점에서 f'(x)의 부호 변화로 극대/극소를 판단합니다.
 - f'(x): 양 → 음 ⟹ 극대
 - f'(x): 음 → 양 ⟹ 극소

f'(x) = 3x² − 3 = 3(x+1)(x−1) = 0 이므로 x = −1 또는 x = 1

증감표를 그리면
 - x = −1 좌우: f'(x) 양 → 음 → 극대, f(−1) = 4
 - x = 1  좌우: f'(x) 음 → 양 → 극소, f(1) = 0

──────────────────
감사합니다. 더 궁금하신 내용이 있다면 언제든 질문해주시기 바랍니다.

AI가 초안을 생성 후 조교가 검수·수정을 거쳐 답변됩니다.`

function PinnedGuide() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'format' | 'preview'>('format')

  return (
    <div className="mb-6 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">조교 답변 가이드</span>
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-400">예시 고정</span>
        </div>
        <svg
          className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-zinc-100">
          {/* 2-column on lg+, stacked on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* LEFT: 학생 질문 */}
            <div className="p-5 lg:border-r border-zinc-100 border-b lg:border-b-0">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400">학생 질문</p>
              <p className="mb-2 text-sm font-bold text-zinc-900">{EXAMPLE_QUESTION.title}</p>
              <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">{EXAMPLE_QUESTION.content}</p>
            </div>

            {/* RIGHT: 조교 입력 형식 + 학생 화면 미리보기 */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">답변 작성법</p>
                <div className="flex gap-1 bg-zinc-100 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setTab('format')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${tab === 'format' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
                  >
                    조교 입력
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('preview')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${tab === 'preview' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}
                  >
                    학생 화면
                  </button>
                </div>
              </div>

              {tab === 'format' ? (
                <div className="rounded-xl bg-zinc-950 p-4">
                  <pre className="text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                    {EXAMPLE_ANSWER_ADMIN}
                  </pre>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-[11px] font-bold text-zinc-400 mb-2 uppercase tracking-wider">학생에게 보이는 모습</p>
                  <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-wrap">{EXAMPLE_ANSWER_STUDENT}</p>
                </div>
              )}

              <p className="mt-3 text-[11px] text-zinc-400 leading-relaxed">
                <span className="font-bold text-zinc-500">팁:</span> AI 초안 버튼으로 초안을 생성한 후 수정해 제출하세요. 반드시 내용을 검수해야 합니다.
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  )
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
    let timeout: ReturnType<typeof setTimeout>
    const channel = supabase
      .channel('admin_qna_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'qna_questions' }, () => {
        clearTimeout(timeout)
        timeout = setTimeout(() => router.refresh(), 600)
      })
      .subscribe()

    return () => { clearTimeout(timeout); supabase.removeChannel(channel) }
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

      {/* 고정 조교 가이드 */}
      <PinnedGuide />

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
            <span className={`self-center h-4 w-px ${isMyFilter ? 'bg-zinc-700' : 'bg-zinc-200'}`} />
            {myStats.avgRating != null ? (
              <span className="text-sm flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                <span className={`font-bold text-lg ${isMyFilter ? 'text-white' : 'text-zinc-950'}`}>
                  {myStats.avgRating.toFixed(1)}
                </span>
                <span className={`${isMyFilter ? 'text-zinc-400' : 'text-zinc-400'}`}>
                  ({myStats.ratedCount}건)
                </span>
              </span>
            ) : (
              <span className={`text-sm ${isMyFilter ? 'text-zinc-500' : 'text-zinc-300'}`}>아직 평가 없음</span>
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
                  onClick={(e) => {
                    // 행 내부의 버튼/링크(담당 조교 필터, 답변하기) 클릭은 제외
                    if ((e.target as HTMLElement).closest('a, button')) return
                    router.push(`/admin/qna/${q.id}`)
                  }}
                  className={[
                    'cursor-pointer transition-colors',
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
