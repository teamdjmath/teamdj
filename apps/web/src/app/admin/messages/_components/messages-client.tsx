'use client'

import { useState, useTransition } from 'react'
import { sendMessage } from '@/lib/actions/messages'

interface ClassOption {
  id: string
  name: string
}

interface StudentOption {
  id: string
  name: string
  classId: string
}

interface MessageRecord {
  id: string
  content: string
  createdAt: string
  targetLabel: string
}

type TargetType = 'class' | 'student'

export function MessagesClient({
  classes,
  students,
  messages,
  initialStudentId = null,
}: {
  classes: ClassOption[]
  students: StudentOption[]
  messages: MessageRecord[]
  initialStudentId?: string | null
}) {
  // 1:1 문의의 "쪽지 보내기"로 진입한 경우 해당 학생이 선택된 상태로 시작
  const preselected = initialStudentId ? students.find((s) => s.id === initialStudentId) : undefined
  const [targetType, setTargetType] = useState<TargetType>(preselected ? 'student' : 'class')
  const [classId, setClassId] = useState(classes[0]?.id ?? '')
  const [studentId, setStudentId] = useState(preselected?.id ?? students[0]?.id ?? '')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  // 분반 필터용
  const [filterClassId, setFilterClassId] = useState<string>('')
  const filteredStudents = filterClassId
    ? students.filter((s) => s.classId === filterClassId)
    : students

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const res = await sendMessage({
        classId: targetType === 'class' ? classId : null,
        studentId: targetType === 'student' ? studentId : null,
        content,
      })
      if (!res.success) { setError(res.error); return }
      setContent('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    })
  }

  return (
    <div className="space-y-4">
      {/* 발송 폼 */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <h2 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100">쪽지 발송</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 대상 유형 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">발송 대상</label>
            <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              {(['class', 'student'] as TargetType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTargetType(t)}
                  className={[
                    'flex-1 py-2 text-sm font-medium transition-colors',
                    targetType === t
                      ? 'bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-900'
                      : 'bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-950',
                  ].join(' ')}
                >
                  {t === 'class' ? '분반 전체' : '특정 학생'}
                </button>
              ))}
            </div>
          </div>

          {/* 대상 선택 */}
          {targetType === 'class' ? (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">분반 선택</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">분반 필터</label>
                <select
                  value={filterClassId}
                  onChange={(e) => {
                    setFilterClassId(e.target.value)
                    setStudentId('')
                  }}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
                >
                  <option value="">전체 분반</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">학생 선택</label>
                <select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
                >
                  {filteredStudents.length === 0 && (
                    <option value="">학생 없음</option>
                  )}
                  {filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* 메시지 내용 */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">메시지 내용</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="전달할 내용을 입력하세요."
              rows={4}
              className="w-full resize-none rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
          {success && <p className="text-xs text-emerald-600">쪽지가 발송되었습니다.</p>}

          <button
            type="submit"
            disabled={isPending || !content.trim()}
            className="w-full rounded-xl bg-zinc-950 dark:bg-zinc-50 py-3 text-sm font-medium text-white dark:text-zinc-900 transition-colors hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-600"
          >
            {isPending ? '발송 중…' : '쪽지 발송'}
          </button>
        </form>
      </div>

      {/* 발송 내역 */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">발송 내역</h2>
        </div>
        {messages.length === 0 ? (
          <p className="px-5 pb-6 text-center text-sm text-zinc-400 dark:text-zinc-600">발송 내역이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-900">
            {messages.map((m) => (
              <li key={m.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-500 dark:text-zinc-500 mb-1">{m.targetLabel}</p>
                    <p className="text-sm text-zinc-800 dark:text-zinc-200 line-clamp-2">{m.content}</p>
                  </div>
                  <span className="shrink-0 text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">
                    {new Date(m.createdAt).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' '}
                    {new Date(m.createdAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
