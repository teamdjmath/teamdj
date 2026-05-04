import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { LearningClient } from './_components/learning-client'

export default async function LearningPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id

  const admin = createAdminClient()

  const { data: memberships } = await admin
    .from('class_members')
    .select('class_id')
    .eq('student_id', userId)
    .eq('is_active', true)

  const classIds = (memberships ?? []).map((m) => m.class_id as string)

  // Accessible courses: matches student's classes OR open to all (class_id IS NULL)
  let courseNames: string[] = []
  if (classIds.length > 0) {
    const { data: accessRows } = await admin
      .from('lecture_class_access')
      .select('course_name')
      .or(`class_id.in.(${classIds.join(',')}),class_id.is.null`)
    courseNames = [...new Set((accessRows ?? []).map((r) => r.course_name as string))].sort()
  } else {
    const { data: accessRows } = await admin
      .from('lecture_class_access')
      .select('course_name')
      .is('class_id', null)
    courseNames = [...new Set((accessRows ?? []).map((r) => r.course_name as string))].sort()
  }

  // Lectures grouped by course
  type Lecture = { id: string; title: string; videoId: string; orderNum: number }
  const courseMap: Record<string, Lecture[]> = {}

  if (courseNames.length > 0) {
    const { data: lectureRows } = await admin
      .from('lectures')
      .select('id, title, youtube_video_id, order_num, course_name')
      .in('course_name', courseNames)
      .order('course_name')
      .order('order_num', { ascending: true })

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
  }

  const courses = courseNames.map((cn) => ({
    courseName: cn,
    lectures:   courseMap[cn] ?? [],
  }))

  // Assignments
  const today = new Date().toISOString().split('T')[0]

  type AssignmentRow = { id: unknown; title: unknown; due_date: unknown; category: unknown; week_num: unknown }

  const assignmentsResult = classIds.length > 0
    ? await admin
        .from('assignments')
        .select('id, title, due_date, category, week_num')
        .in('class_id', classIds)
        .order('week_num', { ascending: false })
        .order('due_date', { ascending: true })
    : { data: [] as AssignmentRow[] }

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

  // Personal To-Dos
  const { data: todos } = await admin
    .from('student_todos')
    .select('*')
    .eq('student_id', userId)
    .order('created_at', { ascending: false })

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
