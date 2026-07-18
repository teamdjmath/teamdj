import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { filterTestNamed } from '@/lib/test-data'
import { ClassesClient } from './_components/classes-client'

export const revalidate = 0

export default async function ClassesPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const [classesRes, tasRes, taAccessRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('class_groups')
      .select(`id, name, subject, grade, schedule, is_active, start_time, end_time, day_of_week, time_slots, class_members(count)`)
      // 소속 해제(is_active=false)된 학생은 인원 수에서 제외
      .eq('class_members.is_active', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, name, role')
      .in('role', ['ta_desk', 'ta_assistant'])
      .eq('is_active', true)
      .order('name'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any).from('ta_class_access').select('ta_id, class_id, days').eq('is_all_classes', false),
  ])

  const allTas = (tasRes.data ?? []).map((t) => ({
    id: t.id as string,
    name: t.name as string,
    role: t.role as string,
  }))

  const taAccessRows = (taAccessRes.data ?? []) as { ta_id: string; class_id: string; days: number[] | null }[]
  const taByClass = new Map<string, Array<(typeof allTas)[number] & { days: number[] | null }>>()
  for (const row of taAccessRows) {
    if (!row.class_id) continue
    const ta = allTas.find((t) => t.id === row.ta_id)
    if (!ta) continue
    if (!taByClass.has(row.class_id)) taByClass.set(row.class_id, [])
    taByClass.get(row.class_id)!.push({ ...ta, days: row.days ?? null })
  }

  // 테스트 이름 분반·조교는 관리자에게만 노출
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const visibleClasses: any[] = await filterTestNamed(classesRes.data ?? [])
  const visibleTas = await filterTestNamed(allTas)

  const rows = visibleClasses.map((c) => ({
    id:           c.id as string,
    name:         c.name as string,
    subject:      c.subject as string,
    grade:        c.grade as string,
    schedule:     c.schedule as string | null,
    start_time:   c.start_time as string | null,
    end_time:     c.end_time as string | null,
    day_of_week:  c.day_of_week as number[] | null,
    time_slots:   (c.time_slots ?? null) as { days: number[]; start: string; end: string }[] | null,
    is_active:    c.is_active as boolean,
    studentCount: (c.class_members as { count: number }[])[0]?.count ?? 0,
    tas:          taByClass.get(c.id) ?? [],
  }))

  return (
    <div>
      <ClassesClient classes={rows} allTas={visibleTas} />
    </div>
  )
}
