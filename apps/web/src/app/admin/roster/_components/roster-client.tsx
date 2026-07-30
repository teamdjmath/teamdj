'use client'

import { useMemo, useState, useTransition } from 'react'
import { requestStudentContact, viewStudentContact } from '@/lib/actions/student-contact'
import { formatPhone } from '@/lib/phone'

export type ClassGroup = {
  id: string
  name: string
  students: Array<{ id: string; name: string; school: string; grade: string }>
}

type MyStatus = { status: string; expiresAt: string | null }

interface Props {
  role: string
  classGroups: ClassGroup[]
  myStatusByStudent: Record<string, MyStatus>
}

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null
  const ms = new Date(expiresAt).getTime() - Date.now()
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0
}

type RevealState = { phone: string; parentPhones: string[] } | 'loading' | 'error' | undefined

// 학생 한 명의 연락처 영역 — 카드 하단에 붙는 상태별 버튼/뱃지
function ContactAction({
  studentId, needsApproval, myStatus, reveal, pending,
  onReveal, onRequest,
}: {
  studentId: string
  needsApproval: boolean
  myStatus: MyStatus | undefined
  reveal: RevealState
  pending: boolean
  onReveal: (id: string) => void
  onRequest: (id: string) => void
}) {
  if (reveal === 'loading') {
    return <span className="text-xs text-zinc-400 dark:text-zinc-600">확인 중…</span>
  }
  if (reveal === 'error') {
    return <span className="text-xs text-red-500">열람 권한이 없습니다</span>
  }
  if (reveal) {
    const parents = reveal.parentPhones.length > 0 ? reveal.parentPhones : [null]
    return (
      <div className="space-y-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="w-11 shrink-0 text-[11px] font-semibold text-zinc-400 dark:text-zinc-600">학생</span>
          <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
            {reveal.phone ? formatPhone(reveal.phone) : '—'}
          </span>
        </div>
        {parents.map((p, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span className="w-11 shrink-0 text-[11px] font-semibold text-zinc-400 dark:text-zinc-600">학부모</span>
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {p ? formatPhone(p) : '—'}
            </span>
          </div>
        ))}
      </div>
    )
  }

  if (!needsApproval) {
    return (
      <button
        type="button"
        onClick={() => onReveal(studentId)}
        className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
      >
        연락처 보기
      </button>
    )
  }

  const dLeft = myStatus?.status === 'approved' ? daysLeft(myStatus.expiresAt) : null
  const isExpired = myStatus?.status === 'approved' && dLeft === 0

  if (myStatus?.status === 'pending') {
    return (
      <span className="block w-full rounded-lg bg-zinc-100 dark:bg-zinc-900 py-1.5 text-center text-xs text-zinc-500 dark:text-zinc-500">
        승인 대기 중
      </span>
    )
  }
  if (myStatus?.status === 'approved' && !isExpired) {
    return (
      <button
        type="button"
        onClick={() => onReveal(studentId)}
        className="w-full rounded-lg bg-amber-50 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
      >
        연락처 보기 (D-{dLeft})
      </button>
    )
  }
  const isRejected = myStatus?.status === 'rejected'
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => onRequest(studentId)}
      className={`w-full rounded-lg border py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        isRejected
          ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
          : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100'
      }`}
    >
      {isRejected ? '거절됨 · 재요청' : isExpired ? '만료됨 · 재요청' : '연락처 요청'}
    </button>
  )
}

export function RosterClient({ role, classGroups, myStatusByStudent }: Props) {
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [revealed, setRevealed] = useState<Record<string, RevealState>>({})
  const [requested, setRequested] = useState<Record<string, boolean>>({})
  // 서버에서 받은 초기값을 로컬 상태로 — 요청 성공 시 새로고침 없이 즉시 갱신
  const [statusMap, setStatusMap] = useState(myStatusByStudent)
  // 특별시험 목록과 동일한 아코디언 UX — 기본 전부 접힘
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const needsApproval = role === 'ta_assistant'

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return classGroups
    return classGroups
      .map((c) => ({
        ...c,
        students: c.students.filter(
          (s) => s.name.toLowerCase().includes(q) || s.school.toLowerCase().includes(q),
        ),
      }))
      .filter((c) => c.students.length > 0)
  }, [classGroups, query])

  // 검색 중에는 결과가 바로 보이도록 검색어가 있는 그룹은 강제로 펼친 것처럼 취급
  const isForcedOpen = query.trim().length > 0

  function handleReveal(studentId: string) {
    setRevealed((m) => ({ ...m, [studentId]: 'loading' }))
    startTransition(async () => {
      const res = await viewStudentContact(studentId)
      setRevealed((m) => ({ ...m, [studentId]: res.success ? res.data! : 'error' }))
    })
  }

  function handleRequest(studentId: string) {
    setRequested((m) => ({ ...m, [studentId]: true }))
    startTransition(async () => {
      await requestStudentContact(studentId)
      setStatusMap((m) => ({ ...m, [studentId]: { status: 'pending', expiresAt: null } }))
      setRequested((m) => ({ ...m, [studentId]: false }))
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">학생 조회</h1>
        <p className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-600">
          분반별 전체 학생 목록입니다. 추가·삭제는 할 수 없습니다.
          {needsApproval && ' 연락처는 선생님 승인 후 7일간 열람할 수 있습니다.'}
        </p>
      </div>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="학생 이름 또는 학교로 검색"
        className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
      />

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-16 text-center text-sm text-zinc-400 dark:text-zinc-600">
          {query ? '검색 결과가 없습니다.' : '등록된 학생이 없습니다.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((cls) => {
            const isOpen = isForcedOpen || (expanded[cls.id] ?? false)
            return (
              <div key={cls.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
                {/* 헤더 — 클릭으로 접기/펼치기 (특별시험 목록과 동일한 패턴) */}
                <button
                  type="button"
                  onClick={() => setExpanded((m) => ({ ...m, [cls.id]: !isOpen }))}
                  className={`flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-zinc-50/60 dark:hover:bg-zinc-950/60 transition-colors ${isOpen ? 'border-b border-zinc-100 dark:border-zinc-900' : ''}`}
                >
                  <svg
                    className={`w-4 h-4 shrink-0 text-zinc-400 dark:text-zinc-600 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                    fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{cls.name}</p>
                  <span className="text-xs text-zinc-400 dark:text-zinc-600">{cls.students.length}명</span>
                </button>

                {isOpen && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
                    {cls.students.map((s) => (
                      <div
                        key={s.id}
                        className="flex flex-col gap-3 rounded-xl border border-zinc-100 dark:border-zinc-900 bg-zinc-50/50 dark:bg-zinc-950/50 p-4"
                      >
                        <div>
                          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 leading-tight">{s.name}</p>
                          <div className="mt-1 flex items-center gap-1.5">
                            {s.school && <span className="text-xs text-zinc-500 dark:text-zinc-500">{s.school}</span>}
                            {s.grade && (
                              <span className="rounded-full bg-zinc-100 dark:bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-500 dark:text-zinc-500">
                                {s.grade}
                              </span>
                            )}
                          </div>
                        </div>
                        <ContactAction
                          studentId={s.id}
                          needsApproval={needsApproval}
                          myStatus={statusMap[s.id]}
                          reveal={revealed[s.id]}
                          pending={pending || requested[s.id]}
                          onReveal={handleReveal}
                          onRequest={handleRequest}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
