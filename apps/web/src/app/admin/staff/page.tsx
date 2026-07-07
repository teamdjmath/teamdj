import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { StaffClient } from './_components/staff-client'
import type { StaffStatus } from '@/lib/actions/staff'

function statusOf(s: string | null | undefined): StaffStatus {
  if (s === 'online' || s === 'busy' || s === 'offline') return s
  return 'offline'
}

export default async function StaffPage() {
  const supabase = await createClient()
  const user = await getVerifiedUser()
  const currentUserId = user!.id

  // 모든 스태프(teacher + ta) 조회
  const { data: staffUsers } = await supabase
    .from('users')
    .select('id, name, role')
    .in('role', ['teacher', 'ta_desk', 'ta_assistant'])
    .eq('is_active', true)
    .order('role')
    .order('name')

  // 각 스태프의 현재 상태
  const staffIds = (staffUsers ?? []).map((u) => u.id as string)
  const { data: statusRows } = staffIds.length
    ? await supabase
        .from('staff_status')
        .select('user_id, status, updated_at')
        .in('user_id', staffIds)
    : { data: [] as { user_id: string; status: string; updated_at: string }[] }

  const statusMap: Record<string, { status: string; updatedAt: string }> = {}
  for (const row of statusRows ?? []) {
    statusMap[row.user_id as string] = {
      status: row.status as string,
      updatedAt: row.updated_at as string,
    }
  }

  const initialStaff = (staffUsers ?? []).map((u) => ({
    userId: u.id as string,
    name: u.name as string,
    role: u.role as string,
    status: statusOf(statusMap[u.id as string]?.status),
    updatedAt: statusMap[u.id as string]?.updatedAt ?? null,
  }))

  const myStatus = statusOf(statusMap[currentUserId]?.status)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-zinc-950">근무 상태</h1>
        <p className="mt-0.5 text-sm text-zinc-400">현재 온라인 상태를 확인하고 변경하세요.</p>
      </div>
      <StaffClient
        initialStaff={initialStaff}
        currentUserId={currentUserId}
        myInitialStatus={myStatus}
      />
    </div>
  )
}
