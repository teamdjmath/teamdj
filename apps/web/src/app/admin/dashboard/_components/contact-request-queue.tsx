'use client'

import { useState, useTransition } from 'react'
import { decideContactRequest } from '@/lib/actions/student-contact'

export type PendingRequest = {
  id: string
  studentId: string
  studentName: string
  requesterName: string
  requesterRole: string
  reason: string | null
  requestedAt: string
}

const ROLE_LABEL: Record<string, string> = { teacher: '선생님', ta_desk: '사무', ta_assistant: '첨삭' }

function formatDatetime(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 선생님 홈에서 바로 처리하는 학생 연락처 열람 승인 큐 (/admin/roster에서 클리닉 조교가 올린 요청)
export function ContactRequestQueue({ initial }: { initial: PendingRequest[] }) {
  const [requests, setRequests] = useState(initial)
  const [pending, startTransition] = useTransition()

  function handleDecide(requestId: string, approve: boolean) {
    startTransition(async () => {
      const res = await decideContactRequest(requestId, approve)
      if (!res.success) { alert(res.error); return }
      setRequests((rs) => rs.filter((r) => r.id !== requestId))
    })
  }

  if (requests.length === 0) return null

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <p className="mb-3 text-sm font-semibold text-amber-900">
        학생 연락처 열람 승인 대기 ({requests.length}건)
      </p>
      <ul className="space-y-2">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white dark:bg-zinc-900 border border-amber-100 px-3.5 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-zinc-800 dark:text-zinc-200">
                <span className="font-medium">{r.requesterName}</span>
                <span className="text-zinc-400 dark:text-zinc-600"> ({ROLE_LABEL[r.requesterRole] ?? r.requesterRole})</span>
                <span className="text-zinc-400 dark:text-zinc-600"> → </span>
                <span className="font-medium">{r.studentName}</span> 학생
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">{formatDatetime(r.requestedAt)}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                disabled={pending}
                onClick={() => handleDecide(r.id, true)}
                className="rounded-lg bg-zinc-950 dark:bg-zinc-50 px-3 py-1.5 text-xs font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 disabled:opacity-50 transition-colors"
              >
                승인
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleDecide(r.id, false)}
                className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-950 disabled:opacity-50 transition-colors"
              >
                거절
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
