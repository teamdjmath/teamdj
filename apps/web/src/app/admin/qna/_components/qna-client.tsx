'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EmptyState } from '@/components/ui/empty-state'
import { QNA_STATUS_LABEL } from '@/lib/qna-status'

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
  additionalRequestedAt: string | null
  hasAiDraft: boolean
  answeredByNames: string[]
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
  { value: 'ai_draft', label: 'AI 초안 대기' },
] as const

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-red-50 text-red-600',
  in_progress: 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900',
  answered: 'bg-zinc-100 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-500',
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
  statusCounts?: { all: number; open: number; in_progress: number; answered: number; ai_draft: number }
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
    <div className="mb-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-500">조교 답변 가이드</span>
          <span className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-[10px] font-bold text-zinc-400 dark:text-zinc-600">예시 고정</span>
        </div>
        <svg
          className={`w-4 h-4 text-zinc-400 dark:text-zinc-600 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-zinc-100 dark:border-zinc-900">
          {/* 2-column on lg+, stacked on mobile */}
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* LEFT: 학생 질문 */}
            <div className="p-5 lg:border-r border-zinc-100 dark:border-zinc-900 border-b lg:border-b-0">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">학생 질문</p>
              <p className="mb-2 text-sm font-bold text-zinc-900 dark:text-zinc-100">{EXAMPLE_QUESTION.title}</p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed whitespace-pre-wrap">{EXAMPLE_QUESTION.content}</p>
            </div>

            {/* RIGHT: 조교 입력 형식 + 학생 화면 미리보기 */}
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">답변 작성법</p>
                <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setTab('format')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${tab === 'format' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-500'}`}
                  >
                    조교 입력
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab('preview')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${tab === 'preview' ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 dark:text-zinc-500'}`}
                  >
                    학생 화면
                  </button>
                </div>
              </div>

              {tab === 'format' ? (
                <div className="rounded-xl bg-zinc-950 dark:bg-zinc-50 p-4">
                  <pre className="text-xs text-zinc-300 dark:text-zinc-700 leading-relaxed whitespace-pre-wrap font-mono overflow-x-auto">
                    {EXAMPLE_ANSWER_ADMIN}
                  </pre>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 p-4">
                  <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-600 mb-2 uppercase tracking-wider">학생에게 보이는 모습</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">{EXAMPLE_ANSWER_STUDENT}</p>
                </div>
              )}

              <p className="mt-3 text-[11px] text-zinc-400 dark:text-zinc-600 leading-relaxed">
                <span className="font-bold text-zinc-500 dark:text-zinc-500">팁:</span> AI 초안 버튼으로 초안을 생성한 후 수정해 제출하세요. 반드시 내용을 검수해야 합니다.
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
  statusCounts,
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

  // 서버 집계(status 필터 무관)를 우선 사용 — 미답변 토글 중에도 다른 탭 개수 유지
  const counts = statusCounts ?? {
    all: questions.length,
    open: questions.filter((q) => q.status === 'open').length,
    in_progress: questions.filter((q) => q.status === 'in_progress').length,
    answered: questions.filter((q) => q.status === 'answered').length,
    ai_draft: questions.filter((q) => q.hasAiDraft && q.status !== 'answered').length,
  }

  const isMyFilter = !!selectedTaId && selectedTaId === currentUserId
  const hasActiveFilter = selectedTaId || selectedTextbookId || selectedProblemNumber

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">질의응답</h1>
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
              ? 'border-zinc-950 dark:border-zinc-50 bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-900'
              : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-950',
          ].join(' ')}
        >
          <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${isMyFilter ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-400 dark:text-zinc-600'}`}>
            내 답변 현황 {isMyFilter && '· 필터 적용 중'}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            <span className="text-sm">
              <span className={`font-bold text-lg ${isMyFilter ? 'text-white' : 'text-zinc-950 dark:text-zinc-50'}`}>{myStats.total}</span>
              <span className={`ml-1 ${isMyFilter ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-400 dark:text-zinc-600'}`}>전체</span>
            </span>
            <span className="text-sm">
              <span className={`font-bold text-lg ${isMyFilter ? 'text-white' : 'text-zinc-950 dark:text-zinc-50'}`}>{myStats.monthly}</span>
              <span className={`ml-1 ${isMyFilter ? 'text-zinc-300 dark:text-zinc-700' : 'text-zinc-400 dark:text-zinc-600'}`}>이번 달</span>
            </span>
            <span className={`self-center h-4 w-px ${isMyFilter ? 'bg-zinc-700 dark:bg-zinc-300' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
            <span className="text-sm">
              <span className={`font-semibold ${isMyFilter ? 'text-zinc-200 dark:text-zinc-800' : 'text-zinc-600 dark:text-zinc-400'}`}>하 {myStats.low}</span>
            </span>
            <span className="text-sm">
              <span className={`font-semibold ${isMyFilter ? 'text-zinc-200 dark:text-zinc-800' : 'text-zinc-600 dark:text-zinc-400'}`}>중 {myStats.mid}</span>
            </span>
            <span className="text-sm">
              <span className={`font-semibold ${isMyFilter ? 'text-zinc-200 dark:text-zinc-800' : 'text-zinc-600 dark:text-zinc-400'}`}>상 {myStats.high}</span>
            </span>
            {myStats.unset > 0 && (
              <span className="text-sm">
                <span className={`${isMyFilter ? 'text-zinc-500 dark:text-zinc-500' : 'text-zinc-300 dark:text-zinc-700'}`}>미설정 {myStats.unset}</span>
              </span>
            )}
            <span className={`self-center h-4 w-px ${isMyFilter ? 'bg-zinc-700 dark:bg-zinc-300' : 'bg-zinc-200 dark:bg-zinc-800'}`} />
            {myStats.avgRating != null ? (
              <span className="text-sm flex items-center gap-1">
                <span className="text-yellow-400">★</span>
                <span className={`font-bold text-lg ${isMyFilter ? 'text-white' : 'text-zinc-950 dark:text-zinc-50'}`}>
                  {myStats.avgRating.toFixed(1)}
                </span>
                <span className={`${isMyFilter ? 'text-zinc-400 dark:text-zinc-600' : 'text-zinc-400 dark:text-zinc-600'}`}>
                  ({myStats.ratedCount}건)
                </span>
              </span>
            ) : (
              <span className={`text-sm ${isMyFilter ? 'text-zinc-500 dark:text-zinc-500' : 'text-zinc-300 dark:text-zinc-700'}`}>아직 평가 없음</span>
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
                ? 'bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-900'
                : 'bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800',
            ].join(' ')}
          >
            {s.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${selectedStatus === s.value ? 'bg-white/20 dark:bg-zinc-900/20 text-white dark:text-zinc-900' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
              {counts[s.value as keyof typeof counts] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* 검색·필터 패널 — 라벨이 붙은 큼직한 입력으로 한눈에 파악 */}
      <div className="mb-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">검색 · 필터</p>
          {hasActiveFilter && (
            <button
              onClick={() => { setProblemInput(''); applyFilter({ textbookId: '', problemNumber: '', taId: '' }) }}
              className="rounded-lg border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-500 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
            >
              ✕ 필터 초기화
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-500">분반</label>
            <select
              value={selectedClassId ?? ''}
              onChange={(e) => applyFilter({ classId: e.target.value })}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none ${
                selectedClassId ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <option value="">전체 분반</option>
              {classOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-500">교재</label>
            <select
              value={selectedTextbookId ?? ''}
              onChange={(e) => applyFilter({ textbookId: e.target.value })}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none ${
                selectedTextbookId ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <option value="">교재 전체</option>
              {textbookOptions.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-500">문항번호</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={problemInput}
                onChange={(e) => setProblemInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilter({ problemNumber: problemInput })}
                placeholder="예: 21"
                className="min-w-0 flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3.5 py-2.5 text-sm font-medium text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-zinc-900 dark:focus:border-zinc-100 focus:bg-white dark:focus:bg-zinc-900 focus:outline-none"
              />
              <button
                onClick={() => applyFilter({ problemNumber: problemInput })}
                className="shrink-0 rounded-xl bg-zinc-950 dark:bg-zinc-50 px-4 py-2.5 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                검색
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-500">담당 조교</label>
            <select
              value={selectedTaId ?? ''}
              onChange={(e) => applyFilter({ taId: e.target.value })}
              className={`w-full rounded-xl border px-3.5 py-2.5 text-sm font-medium focus:border-zinc-900 dark:focus:border-zinc-100 focus:outline-none ${
                selectedTaId ? 'border-zinc-900 dark:border-zinc-100 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100' : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400'
              }`}
            >
              <option value="">담당 조교 전체</option>
              {taOptions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({roleLabel(t.role)})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 질문 목록 — 제목 중심 카드형. 분반·교재·문항 등 상세 정보는 클릭해서 들어가면 표시 */}
      {questions.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <EmptyState message="질문이 없습니다." description="학생들이 질문을 등록하면 여기에 나타납니다." />
        </div>
      ) : (
        <div className="space-y-2.5">
          {questions.map((q) => (
            <div
              key={q.id}
              onClick={(e) => {
                // 카드 내부 버튼(담당 조교 필터) 클릭은 제외
                if ((e.target as HTMLElement).closest('a, button')) return
                // "AI 초안 대기" 탭에서 들어가면 확인/제출 시 다음 미검토 건으로 자동 이동(순차 검토)
                router.push(selectedStatus === 'ai_draft' ? `/admin/qna/${q.id}?queue=1` : `/admin/qna/${q.id}`)
              }}
              className={[
                'group cursor-pointer rounded-2xl border bg-white dark:bg-zinc-900 px-5 py-4 transition-all',
                q.isDuplicate
                  ? 'border-amber-300 bg-amber-50/60 hover:border-amber-400 hover:shadow-sm'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 hover:shadow-sm',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_BADGE[q.status]}`}>
                      {QNA_STATUS_LABEL[q.status]}
                    </span>
                    {q.hasAiDraft && q.status !== 'answered' && (
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                        AI
                      </span>
                    )}
                    {q.additionalRequestedAt && q.status !== 'answered' && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        추가 요청
                      </span>
                    )}
                    {q.isDuplicate && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        중복 질문
                      </span>
                    )}
                  </div>
                  <p className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-zinc-950 dark:group-hover:text-zinc-50">
                    {q.title || '(제목 없음)'}
                  </p>
                  <p className="text-sm text-zinc-400 dark:text-zinc-600 truncate mt-0.5">{q.content}</p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-2.5">
                    <span className="font-medium text-zinc-500 dark:text-zinc-500">{q.studentName}</span>
                    <span className="mx-1.5 text-zinc-300 dark:text-zinc-700">·</span>
                    {formatDate(q.created_at)}
                  </p>
                </div>

                <div className="shrink-0 flex flex-col items-end gap-2 pt-0.5">
                  {q.answeredByNames.length > 0 || q.assignedTaName ? (
                    <button
                      type="button"
                      onClick={() => applyFilter({ taId: q.assigned_ta_id ?? '' })}
                      title="이 조교의 질문만 보기"
                      className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {/* 추가 답변 요청으로 다른 조교가 다시 답변하면 실제 답변한 순서대로 전부 보여준다 —
                          아직 아무도 안 답변했고 자기담당만 한 경우엔 담당자 한 명만 표시 */}
                      {q.answeredByNames.length > 0 ? q.answeredByNames.join(' | ') : q.assignedTaName}
                    </button>
                  ) : q.status === 'answered' && q.hasAiDraft ? (
                    // 조교 배정 없이 학생이 AI 초안을 직접 확정한 경우 — "담당 없음"으로 보이면
                    // 조교 미개입 정상 케이스인지 방치된 건지 구분이 안 돼서 헷갈릴 수 있다.
                    <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-medium text-violet-700">
                      AI
                    </span>
                  ) : (
                    <span className="rounded-full border border-dashed border-zinc-200 dark:border-zinc-800 px-2.5 py-1 text-xs text-zinc-300 dark:text-zinc-700">
                      담당 없음
                    </span>
                  )}
                  <svg
                    className="w-4 h-4 text-zinc-200 dark:text-zinc-800 group-hover:text-zinc-400 dark:group-hover:text-zinc-600 transition-colors"
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
