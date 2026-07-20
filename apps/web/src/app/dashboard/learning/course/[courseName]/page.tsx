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

  // 분반 단위 기본 지급 여부
  let hasClassAccess = false
  if (classIds.length > 0) {
    const { data: accessRows } = await admin
      .from('lecture_class_access')
      .select('id')
      .eq('course_name', decodedCourseName)
      .or(`class_id.in.(${classIds.join(',')}),class_id.is.null`)
      .limit(1)
    if (accessRows && accessRows.length > 0) hasClassAccess = true
  } else {
    const { data: accessRows } = await admin
      .from('lecture_class_access')
      .select('id')
      .eq('course_name', decodedCourseName)
      .is('class_id', null)
      .limit(1)
    if (accessRows && accessRows.length > 0) hasClassAccess = true
  }

  // 2. Fetch lectures + 학생 개별 지급(강의 단위) 적용
  const { data: lectureRows } = await admin
    .from('lectures')
    .select('id, title, youtube_video_id, order_num')
    .eq('course_name', decodedCourseName)
    .order('order_num', { ascending: true })

  const allLectures = (lectureRows ?? []).map((row) => ({
    id: row.id as string,
    title: row.title as string,
    videoId: (row.youtube_video_id ?? '') as string,
    orderNum: (row.order_num ?? 0) as number,
  }))

  const lectureIds = allLectures.map((l) => l.id)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: overrideRows } = lectureIds.length > 0
    ? await (admin as any)
        .from('lecture_student_access')
        .select('lecture_id, mode')
        .eq('student_id', user.id)
        .in('lecture_id', lectureIds)
    : { data: [] }

  const modeByLecture: Record<string, 'grant' | 'block'> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (overrideRows ?? []) as any[]) modeByLecture[r.lecture_id as string] = r.mode

  // 강의별 시청 가능: 개별 지급이면 무조건 허용, 차단이면 제외, 그 외엔 분반 지급 따름
  const lectures = allLectures.filter((l) => {
    const m = modeByLecture[l.id]
    if (m === 'grant') return true
    if (m === 'block') return false
    return hasClassAccess
  })

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
