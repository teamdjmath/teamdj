import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ScheduleClient } from './_components/schedule-client'
import type { StaffStatus } from '@/lib/actions/staff'

function getMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]
  return { start, end }
}

function toStatus(s?: string | null): StaffStatus {
  if (s === 'online' || s === 'busy' || s === 'offline') return s
  return 'offline'
}

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') redirect('/dashboard')

  const admin = createAdminClient()

  // ── 담당 분반 ──
  let classes: {
    id: string; name: string; subject: string; grade: string
    start_time: string | null; end_time: string | null; day_of_week: number[] | null
  }[] = []

  if (role === 'teacher') {
    const { data } = await admin
      .from('class_groups')
      .select('id, name, subject, grade, start_time, end_time, day_of_week')
      .eq('is_active', true).not('day_of_week', 'is', null).order('name')
    classes = data ?? []
  } else {
    const { data: allAccess } = await admin
      .from('ta_class_access').select('is_all_classes')
      .eq('ta_id', user.id).eq('is_all_classes', true).limit(1)

    if (allAccess && allAccess.length > 0) {
      const { data } = await admin
        .from('class_groups')
        .select('id, name, subject, grade, start_time, end_time, day_of_week')
        .eq('is_active', true).not('day_of_week', 'is', null).order('name')
      classes = data ?? []
    } else {
      const { data: access } = await admin
        .from('ta_class_access').select('class_id')
        .eq('ta_id', user.id).not('class_id', 'is', null)
      const ids = (access ?? []).map((a) => a.class_id as string)
      if (ids.length > 0) {
        const { data } = await admin
          .from('class_groups')
          .select('id, name, subject, grade, start_time, end_time, day_of_week')
          .in('id', ids).eq('is_active', true).not('day_of_week', 'is', null).order('name')
        classes = data ?? []
      }
    }
  }

  // ── 이번 달 추가 근무 ──
  const { start, end } = getMonthRange()
  const { data: extraSchedules } = await admin
    .from('extra_schedules')
    .select('id, title, scheduled_date, start_time, end_time, note')
    .eq('user_id', user.id)
    .gte('scheduled_date', start)
    .lte('scheduled_date', end)
    .order('scheduled_date').order('start_time')

  // ── 스태프 목록 ──
  const { data: staffUsers } = await supabase
    .from('users')
    .select('id, name, role')
    .in('role', ['teacher', 'ta'])
    .eq('is_active', true)
    .order('role').order('name')

  const staffIds = (staffUsers ?? []).map((u) => u.id as string)
  const { data: statusRows } = staffIds.length > 0
    ? await admin
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
    userId:    u.id as string,
    name:      u.name as string,
    role:      u.role as string,
    status:    toStatus(statusMap[u.id as string]?.status),
    updatedAt: statusMap[u.id as string]?.updatedAt ?? null,
  }))

  return (
    <ScheduleClient
      classes={classes}
      extraSchedules={extraSchedules ?? []}
      initialStaff={initialStaff}
      currentUserId={user.id}
      myInitialStatus={toStatus(statusMap[user.id]?.status)}
    />
  )
}
