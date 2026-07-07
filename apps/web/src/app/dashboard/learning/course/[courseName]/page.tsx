import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { redirect } from 'next/navigation'
import { CourseViewer } from './_components/course-viewer'

export default async function CourseDetailPage({ params }: { params: Promise<{ courseName: string }> }) {
  const { courseName } = await params
  const decodedCourseName = decodeURIComponent(courseName)

  const user = await getVerifiedUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // 1. Verify access
  const { data: memberships } = await admin
    .from('class_members')
    .select('class_id')
    .eq('student_id', user.id)
    .eq('is_active', true)

  const classIds = (memberships ?? []).map((m) => m.class_id as string)

  let hasAccess = false
  if (classIds.length > 0) {
    const { data: accessRows } = await admin
      .from('lecture_class_access')
      .select('id')
      .eq('course_name', decodedCourseName)
      .or(`class_id.in.(${classIds.join(',')}),class_id.is.null`)
      .limit(1)
    if (accessRows && accessRows.length > 0) hasAccess = true
  } else {
    const { data: accessRows } = await admin
      .from('lecture_class_access')
      .select('id')
      .eq('course_name', decodedCourseName)
      .is('class_id', null)
      .limit(1)
    if (accessRows && accessRows.length > 0) hasAccess = true
  }

  if (!hasAccess) redirect('/dashboard/learning')

  // 2. Fetch lectures
  const { data: lectureRows } = await admin
    .from('lectures')
    .select('id, title, youtube_video_id, order_num')
    .eq('course_name', decodedCourseName)
    .order('order_num', { ascending: true })

  const lectures = (lectureRows ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    videoId: (row.youtube_video_id ?? '') as string,
    orderNum: (row.order_num ?? 0) as number,
  }))

  // 3. Fetch course materials
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: materialRows } = await (admin as any)
    .from('course_materials')
    .select('id, title, url')
    .eq('course_name', decodedCourseName)
    .order('created_at')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const materials = (materialRows as any[] ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    url: row.url as string,
  }))

  return (
    <div className="h-[calc(100vh-120px)] bg-white rounded-xl border border-zinc-200 overflow-hidden">
      <div className="h-full">
        <CourseViewer courseName={decodedCourseName} lectures={lectures} materials={materials} />
      </div>
    </div>
  )
}
