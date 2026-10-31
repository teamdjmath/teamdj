import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { getVisibleLecturesForStudent } from '@/lib/actions/lectures'
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

  // 2. 학생에게 실제로 보이는(분반 지급 + 개별 override 적용) 강의만
  const lectures = await getVisibleLecturesForStudent(decodedCourseName, user.id, classIds)

  if (lectures.length === 0) redirect('/dashboard/learning')

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
    // 모바일에서는 페이지 자체 스크롤에 맡긴다 — 고정 100vh 패널은 화면 회전 시
    // 주소창 높이 변화로 100vh가 어긋나면서 스크롤이 먹통이 되는 문제가 있었다.
    // md 이상(데스크톱)에서만 내부 스크롤 패널 형태를 유지한다.
    <div className="md:h-[calc(100vh-120px)] bg-white rounded-xl border border-zinc-200 md:overflow-hidden">
      <div className="md:h-full">
        <CourseViewer courseName={decodedCourseName} lectures={lectures} materials={materials} />
      </div>
    </div>
  )
}
