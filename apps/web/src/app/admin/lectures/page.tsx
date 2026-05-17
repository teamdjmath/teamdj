import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { LecturesClient } from './_components/lectures-client'

export default async function LecturesPage() {
  const admin = createAdminClient()
  const supabase = await createClient()

  const { data: classes } = await admin
    .from('class_groups')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  // 강좌별 접근 분반
  const { data: accessRows } = await admin
    .from('lecture_class_access')
    .select('course_name, class_id')
    .order('course_name')

  // 모든 강의 (강좌명 기준)
  const { data: lectureRows } = await admin
    .from('lectures')
    .select('id, title, youtube_video_id, order_num, synced_at, course_name, material_url')
    .not('course_name', 'is', null)
    .order('course_name')
    .order('order_num', { ascending: true })

  // 교재 목록 (textbooks table - types generated after migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: textbookRows } = await (supabase as any)
    .from('textbooks')
    .select('id, name')
    .order('name')

  // 강좌명 목록 수집 (lecture_class_access + lectures 합집합)
  const courseNameSet = new Set<string>()
  for (const row of accessRows ?? []) courseNameSet.add(row.course_name as string)
  for (const row of lectureRows ?? []) {
    if (row.course_name) courseNameSet.add(row.course_name as string)
  }

  // 강좌별 접근 분반 맵
  const accessMap: Record<string, string[]> = {}
  for (const row of accessRows ?? []) {
    const cn = row.course_name as string
    if (!accessMap[cn]) accessMap[cn] = []
    if (row.class_id) accessMap[cn].push(row.class_id as string)
  }

  // 강좌별 강의 맵
  const lectureMap: Record<string, Array<{
    id: string; title: string; videoId: string; orderNum: number; syncedAt: string | null; materialUrl: string | null
  }>> = {}
  for (const row of lectureRows ?? []) {
    const cn = row.course_name as string
    if (!lectureMap[cn]) lectureMap[cn] = []
    lectureMap[cn].push({
      id:       row.id as string,
      title:    row.title as string,
      videoId:  (row.youtube_video_id ?? '') as string,
      orderNum: (row.order_num ?? 0) as number,
      syncedAt: (row.synced_at ?? null) as string | null,
      materialUrl: (row.material_url ?? null) as string | null,
    })
  }

  const courses = Array.from(courseNameSet).sort().map((cn) => ({
    courseName:     cn,
    allowedClassIds: accessMap[cn] ?? [],
    lectures:       lectureMap[cn] ?? [],
  }))

  return (
    <LecturesClient
      classOptions={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
      courses={courses}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      textbooks={(textbookRows ?? []).map((t: any) => ({ id: t.id as string, name: t.name as string }))}
    />
  )
}
