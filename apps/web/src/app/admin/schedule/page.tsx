import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { ScheduleClient } from './_components/schedule-client'

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const diffToMon = day === 0 ? -6 : 1 - day
  const mon = new Date(now)
  mon.setDate(now.getDate() + diffToMon)
  mon.setHours(0, 0, 0, 0)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  sun.setHours(23, 59, 59, 999)
  return {
    start: mon.toISOString().split('T')[0],
    end:   sun.toISOString().split('T')[0],
  }
}

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') redirect('/dashboard')

  const admin = createAdminClient()

  let classes: {
    id: string
    name: string
    subject: string
    grade: string
    start_time: string | null
    end_time: string | null
    day_of_week: number[] | null
  }[] = []

  if (role === 'teacher') {
    const { data } = await admin
      .from('class_groups')
      .select('id, name, subject, grade, start_time, end_time, day_of_week')
      .eq('is_active', true)
      .not('day_of_week', 'is', null)
      .order('name')
    classes = data ?? []
  } else {
    // TA: is_all_classes 여부 확인
    const { data: allAccess } = await admin
      .from('ta_class_access')
      .select('is_all_classes')
      .eq('ta_id', user.id)
      .eq('is_all_classes', true)
      .limit(1)

    if (allAccess && allAccess.length > 0) {
      const { data } = await admin
        .from('class_groups')
        .select('id, name, subject, grade, start_time, end_time, day_of_week')
        .eq('is_active', true)
        .not('day_of_week', 'is', null)
        .order('name')
      classes = data ?? []
    } else {
      const { data: access } = await admin
        .from('ta_class_access')
        .select('class_id')
        .eq('ta_id', user.id)
        .not('class_id', 'is', null)

      const ids = (access ?? []).map((a) => a.class_id as string)
      if (ids.length > 0) {
        const { data } = await admin
          .from('class_groups')
          .select('id, name, subject, grade, start_time, end_time, day_of_week')
          .in('id', ids)
          .eq('is_active', true)
          .not('day_of_week', 'is', null)
          .order('name')
        classes = data ?? []
      }
    }
  }

  const { start, end } = getWeekRange()
  const { data: extraSchedules } = await admin
    .from('extra_schedules')
    .select('id, title, scheduled_date, start_time, end_time, note')
    .eq('user_id', user.id)
    .gte('scheduled_date', start)
    .lte('scheduled_date', end)
    .order('scheduled_date')
    .order('start_time')

  return (
    <ScheduleClient
      classes={classes}
      extraSchedules={extraSchedules ?? []}
    />
  )
}
