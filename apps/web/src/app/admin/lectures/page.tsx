import { createAdminClient } from '@/lib/supabase/admin'
import { LecturesClient } from './_components/lectures-client'

export default async function LecturesPage() {
  const admin = createAdminClient()

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
    .select('id, title, youtube_video_id, order_num, synced_at, course_name')
    .not('course_name', 'is', null)
    .order('course_name')
    .order('order_num', { ascending: true })

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
    id: string; title: string; videoId: string; orderNum: number; syncedAt: string | null
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
    />
  )
}
