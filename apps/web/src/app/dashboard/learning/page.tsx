import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { unstable_cache } from 'next/cache'
import { LearningClient } from './_components/learning-client'

type Lecture = { id: string; title: string; videoId: string; orderNum: number }
type Course  = { courseName: string; lectures: Lecture[] }

// 강좌/강의 목록은 분반 조합 단위로 캐시 (선생님이 강의 추가 시 revalidateTag('lectures'))
const getCachedCourses = unstable_cache(
  async (classIds: string[]): Promise<Course[]> => {
    const admin = createAdminClient()

    const { data: accessRows } = classIds.length > 0
      ? await admin
          .from('lecture_class_access')
          .select('course_name')
          .or(`class_id.in.(${classIds.join(',')}),class_id.is.null`)
      : await admin
          .from('lecture_class_access')
          .select('course_name')
          .is('class_id', null)

    const courseNames = [...new Set((accessRows ?? []).map((r) => r.course_name as string))].sort()
    if (!courseNames.length) return []

    const { data: lectureRows } = await admin
      .from('lectures')
      .select('id, title, youtube_video_id, order_num, course_name')
      .in('course_name', courseNames)
      .order('course_name')
      .order('order_num', { ascending: true })

    const courseMap: Record<string, Lecture[]> = {}
    for (const row of lectureRows ?? []) {
      const cn = row.course_name as string
      if (!courseMap[cn]) courseMap[cn] = []
      courseMap[cn].push({
        id:       row.id as string,
        title:    row.title as string,
        videoId:  (row.youtube_video_id ?? '') as string,
        orderNum: (row.order_num ?? 0) as number,
      })
    }
    return courseNames.map((cn) => ({ courseName: cn, lectures: courseMap[cn] ?? [] }))
  },
  ['lectures'],
  { revalidate: 300, tags: ['lectures'] },
)

export default async function LearningPage() {
  const user = await getVerifiedUser()
  const userId = user!.id

  const admin = createAdminClient()

  const { data: memberships } = await admin
    .from('class_members')
    .select('class_id')
    .eq('student_id', userId)
    .eq('is_active', true)

  const classIds = (memberships ?? []).map((m) => m.class_id as string).sort()

  const today = new Date().toISOString().split('T')[0]

  type AssignmentRow = { id: unknown; title: unknown; due_date: unknown; category: unknown; week_num: unknown }

  // 강좌(캐시) / 학생 개별 지급(강의 단위) / 과제 / 투두 — 서로 독립이라 병렬 실행
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accessPromise = (admin as any)
    .from('lecture_student_access')
    .select('lecture_id, mode')
    .eq('student_id', userId) as Promise<{ data: Array<{ lecture_id: string; mode: 'grant' | 'block' }> | null }>

  const [classCourses, { data: overrides }, assignmentsResult, { data: todos }] = await Promise.all([
    getCachedCourses(classIds),
    accessPromise,
    classIds.length > 0
      ? admin
          .from('assignments')
          .select('id, title, due_date, category, week_num')
          .in('class_id', classIds)
          .order('week_num', { ascending: false })
          .order('due_date', { ascending: true })
      : Promise.resolve({ data: [] as AssignmentRow[] }),
    admin
      .from('student_todos')
      .select('*')
      .eq('student_id', userId)
      .order('created_at', { ascending: false }),
  ])

  // 학생 개별 지급 적용 (강의 단위) — block(차감)된 강의 제거, grant(개별 지급)된 강의 추가
  const blockedLecs = new Set((overrides ?? []).filter((o) => o.mode === 'block').map((o) => o.lecture_id))
  const grantedLecs = (overrides ?? []).filter((o) => o.mode === 'grant').map((o) => o.lecture_id)

  // 1) 분반 지급 강좌에서 차단된 강의 제거 (강의가 하나도 안 남으면 강좌 자체 숨김)
  const filteredClassCourses = classCourses
    .map((c) => ({ ...c, lectures: c.lectures.filter((l) => !blockedLecs.has(l.id)) }))
    .filter((c) => c.lectures.length > 0)

  // 2) 분반 지급 밖에서 개별 지급된 강의를 강좌 단위로 묶어 추가
  const visibleLecIds = new Set(filteredClassCourses.flatMap((c) => c.lectures.map((l) => l.id)))
  const extraGrantIds = grantedLecs.filter((id) => !visibleLecIds.has(id))

  let grantCourses: Course[] = []
  if (extraGrantIds.length > 0) {
    const { data: grantLectures } = await admin
      .from('lectures')
      .select('id, title, youtube_video_id, order_num, course_name')
      .in('id', extraGrantIds)
      .order('order_num', { ascending: true })
    const byCourse: Record<string, Lecture[]> = {}
    for (const row of grantLectures ?? []) {
      const cn = (row.course_name ?? '기타') as string
      ;(byCourse[cn] ??= []).push({
        id: row.id as string,
        title: row.title as string,
        videoId: (row.youtube_video_id ?? '') as string,
        orderNum: (row.order_num ?? 0) as number,
      })
    }
    const classCourseNames = new Set(filteredClassCourses.map((c) => c.courseName))
    for (const [cn, lecs] of Object.entries(byCourse)) {
      const existing = filteredClassCourses.find((c) => c.courseName === cn)
      if (existing) {
        // 같은 강좌가 이미 보이면 개별 지급 강의를 합쳐서 순서대로
        existing.lectures = [...existing.lectures, ...lecs].sort((a, b) => a.orderNum - b.orderNum)
      } else if (!classCourseNames.has(cn)) {
        grantCourses.push({ courseName: cn, lectures: lecs })
      }
    }
  }

  const courses = [...filteredClassCourses, ...grantCourses]
    .sort((a, b) => a.courseName.localeCompare(b.courseName, 'ko'))

  const assignments = (assignmentsResult.data ?? []) as AssignmentRow[]
  const assignmentIds = assignments.map((a) => a.id as string)

  const { data: progressRows } = assignmentIds.length > 0
    ? await admin
        .from('assignment_progress')
        .select('assignment_id, completion_pct')
        .eq('student_id', userId)
        .in('assignment_id', assignmentIds)
    : { data: [] as { assignment_id: string; completion_pct: number }[] }

  const progressMap: Record<string, number> = {}
  for (const p of progressRows ?? []) {
    progressMap[p.assignment_id as string] = (p.completion_pct ?? 0) as number
  }

  const weekGroups: Record<number, AssignmentRow[]> = {}
  for (const a of assignments) {
    const wk = (a.week_num as number) ?? 0
    if (!weekGroups[wk]) weekGroups[wk] = []
    weekGroups[wk].push(a)
  }
  const sortedWeeks = Object.keys(weekGroups).map(Number).sort((a, b) => b - a)

  return (
    <LearningClient
      courses={courses}
      weekGroups={weekGroups}
      sortedWeeks={sortedWeeks}
      progressMap={progressMap}
      today={today}
      initialTodos={todos ?? []}
    />
  )
}
