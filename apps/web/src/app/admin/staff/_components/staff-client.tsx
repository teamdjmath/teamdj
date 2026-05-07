'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { updateStaffStatus, type StaffStatus } from '@/lib/actions/staff'

interface StaffMember {
  userId: string
  name: string
  role: string
  status: StaffStatus | null
  updatedAt: string | null
}

const STATUS_CONFIG: Record<StaffStatus, { label: string; dot: string; badge: string }> = {
  online: { label: '온라인', dot: 'bg-emerald-400', badge: 'bg-emerald-50 text-emerald-700' },
  busy:   { label: '바쁨',   dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700'   },
  offline:{ label: '오프라인', dot: 'bg-zinc-300',  badge: 'bg-zinc-100 text-zinc-400'    },
}

function statusOf(s: string | null): StaffStatus {
  if (s === 'online' || s === 'busy' || s === 'offline') return s
  return 'offline'
}

export function StaffClient({
  initialStaff,
  currentUserId,
  myInitialStatus,
}: {
  initialStaff: StaffMember[]
  currentUserId: string
  myInitialStatus: StaffStatus
}) {
  const [staff, setStaff] = useState(initialStaff)
  const [myStatus, setMyStatus] = useState(myInitialStatus)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Supabase Realtime 구독
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`staff_status_${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_status' },
        (payload) => {
          const row = payload.new as { user_id: string; status: string; updated_at: string } | undefined
          if (!row) return
          setStaff((prev) =>
            prev.map((s) =>
              s.userId === row.user_id
                ? { ...s, status: statusOf(row.status), updatedAt: row.updated_at }
                : s,
            ),
          )
          if (row.user_id === currentUserId) {
            setMyStatus(statusOf(row.status))
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUserId])

  function handleStatusChange(status: StaffStatus) {
    setError(null)
    startTransition(async () => {
      const res = await updateStaffStatus(status)
      if (!res.success) { setError(res.error); return }
      setMyStatus(status)
    })
  }

  const STATUS_BUTTONS: StaffStatus[] = ['online', 'busy', 'offline']

  return (
    <div className="space-y-4">
      {/* 내 상태 */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">내 상태</p>
        <div className="flex flex-wrap gap-2">
          {STATUS_BUTTONS.map((s) => {
            const cfg = STATUS_CONFIG[s]
            const active = myStatus === s
            return (
              <button
                key={s}
                type="button"
                disabled={isPending}
                onClick={() => handleStatusChange(s)}
                className={[
                  'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                  active
                    ? 'bg-zinc-950 text-white shadow-sm'
                    : 'border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900',
                  isPending && 'opacity-50 cursor-not-allowed',
                ].join(' ')}
              >
                <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                {cfg.label}
                {active && <span className="ml-1 text-[10px] text-zinc-400">현재</span>}
              </button>
            )
          })}
        </div>
        {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
      </div>

      {/* 전체 스태프 목록 */}
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h2 className="text-sm font-semibold text-zinc-900">스태프 현황</h2>
          <span className="text-xs text-zinc-400">실시간 업데이트</span>
        </div>
        <ul className="divide-y divide-zinc-100">
          {staff.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-zinc-400">등록된 스태프가 없습니다.</li>
          )}
          {staff.map((member) => {
            const s = statusOf(member.status)
            const cfg = STATUS_CONFIG[s]
            const isMe = member.userId === currentUserId
            return (
              <li key={member.userId} className="flex items-center gap-3 px-5 py-4">
                {/* 상태 도트 */}
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${cfg.dot}`} />

                {/* 이름 + 역할 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 flex items-center gap-1.5">
                    {member.name}
                    {isMe && (
                      <span className="text-[10px] font-normal text-zinc-400">(나)</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {member.role === 'teacher' ? '선생님' : '조교'}
                  </p>
                </div>

                {/* 상태 뱃지 */}
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${cfg.badge}`}>
                  {cfg.label}
                </span>

                {/* 마지막 업데이트 */}
                {member.updatedAt && (
                  <span className="shrink-0 text-[10px] text-zinc-300 hidden sm:block">
                    {new Date(member.updatedAt).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
