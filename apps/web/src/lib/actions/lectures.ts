'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath, revalidateTag } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'

async function getStaffUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function createCourse(courseName: string, classIds: string[]): Promise<ActionResult> {
  const user = await getStaffUser()

  return withAction('createCourse', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }
    if (!courseName.trim()) return { success: false, error: '강좌명을 입력하세요.' }

    const admin = createAdminClient()
    if (classIds.length > 0) {
      const { error } = await admin.from('lecture_class_access').insert(
        classIds.map((id) => ({ course_name: courseName.trim(), class_id: id })),
      )
      if (error) throw error
    }

    revalidatePath('/admin/lectures')
    revalidateTag('lectures', {})
    return { success: true }
  })
}

export async function updateCourseClasses(courseName: string, classIds: string[]): Promise<ActionResult> {
  const user = await getStaffUser()

  return withAction('updateCourseClasses', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const admin = createAdminClient()
    await admin.from('lecture_class_access').delete().eq('course_name', courseName)

    if (classIds.length > 0) {
      const { error } = await admin.from('lecture_class_access').insert(
        classIds.map((id) => ({ course_name: courseName, class_id: id })),
      )
      if (error) throw error
    }

    revalidatePath('/admin/lectures')
    revalidateTag('lectures', {})
    return { success: true }
  })
}

export async function renameCourse(oldName: string, newName: string): Promise<ActionResult> {
  const user = await getStaffUser()

  return withAction('renameCourse', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }
    if (!newName.trim()) return { success: false, error: '강좌명을 입력하세요.' }
    if (oldName.trim() === newName.trim()) return { success: true }

    const admin = createAdminClient()

    const { error: e1 } = await admin
      .from('lectures')
      .update({ course_name: newName.trim() })
      .eq('course_name', oldName)
    if (e1) throw e1

    const { error: e2 } = await admin
      .from('lecture_class_access')
      .update({ course_name: newName.trim() })
      .eq('course_name', oldName)
    if (e2) throw e2

    revalidatePath('/admin/lectures')
    revalidatePath('/dashboard/learning')
    revalidateTag('lectures', {})
    return { success: true }
  })
}

export async function deleteCourse(courseName: string): Promise<ActionResult> {
  const user = await getStaffUser()

  return withAction('deleteCourse', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const admin = createAdminClient()
    await admin.from('lectures').delete().eq('course_name', courseName)
    await admin.from('lecture_class_access').delete().eq('course_name', courseName)

    revalidatePath('/admin/lectures')
    revalidateTag('lectures', {})
    return { success: true }
  })
}

// ── 강의(영상) 단위 학생 개별 지급/차단 — 기본은 분반 지급, 차감 등 개별 케이스만 예외로 관리
export type StudentAccessMode = 'grant' | 'block'

// 강좌 내에서 예외가 등록된 학생 요약 (개별 지급 탭 상단 표시용)
export type CourseAccessSummary = {
  studentId: string
  studentName: string
  grantCount: number
  blockCount: number
}

export async function getCourseAccessSummary(
  courseName: string,
): Promise<{ error?: string; rows?: CourseAccessSummary[] }> {
  const user = await getStaffUser()
  if (!user) return { error: '인증이 필요합니다.' }
  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  const admin = createAdminClient()
  const { data: lecs } = await admin.from('lectures').select('id').eq('course_name', courseName)
  const lectureIds = (lecs ?? []).map((l) => l.id as string)
  if (lectureIds.length === 0) return { rows: [] }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('lecture_student_access')
    .select('student_id, mode, users!student_id(name)')
    .in('lecture_id', lectureIds)
  if (error) return { error: '개별 지급 목록 조회에 실패했습니다. (마이그레이션 적용 여부를 확인하세요)' }

  const byStudent: Record<string, CourseAccessSummary> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (data ?? []) as any[]) {
    const sid = r.student_id as string
    if (!byStudent[sid]) {
      byStudent[sid] = { studentId: sid, studentName: (r.users?.name ?? '') as string, grantCount: 0, blockCount: 0 }
    }
    if (r.mode === 'grant') byStudent[sid].grantCount++
    else byStudent[sid].blockCount++
  }
  return { rows: Object.values(byStudent).sort((a, b) => a.studentName.localeCompare(b.studentName, 'ko')) }
}

// 특정 학생의 강좌 내 강의별 예외 조회
export async function getStudentLectureAccess(
  courseName: string,
  studentId: string,
): Promise<{ error?: string; modes?: Record<string, StudentAccessMode> }> {
  const user = await getStaffUser()
  if (!user) return { error: '인증이 필요합니다.' }
  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  const admin = createAdminClient()
  const { data: lecs } = await admin.from('lectures').select('id').eq('course_name', courseName)
  const lectureIds = (lecs ?? []).map((l) => l.id as string)
  if (lectureIds.length === 0) return { modes: {} }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from('lecture_student_access')
    .select('lecture_id, mode')
    .eq('student_id', studentId)
    .in('lecture_id', lectureIds)
  if (error) return { error: '개별 지급 조회에 실패했습니다. (마이그레이션 적용 여부를 확인하세요)' }

  const modes: Record<string, StudentAccessMode> = {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const r of (data ?? []) as any[]) modes[r.lecture_id as string] = r.mode as StudentAccessMode
  return { modes }
}

// 특정 학생의 강의별 예외 일괄 저장 — entries에 없는 강의는 건드리지 않음, mode=null이면 기본값으로 복귀
export async function setStudentLectureAccess(
  studentId: string,
  entries: Array<{ lectureId: string; mode: StudentAccessMode | null }>,
): Promise<ActionResult> {
  const user = await getStaffUser()

  return withAction('setStudentLectureAccess', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }
    if (entries.length === 0) return { success: true }

    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = () => (admin as any).from('lecture_student_access')

    const toDelete = entries.filter((e) => e.mode === null).map((e) => e.lectureId)
    const toUpsert = entries
      .filter((e): e is { lectureId: string; mode: StudentAccessMode } => e.mode !== null)
      .map((e) => ({ lecture_id: e.lectureId, student_id: studentId, mode: e.mode }))

    if (toDelete.length > 0) {
      const { error } = await table().delete().eq('student_id', studentId).in('lecture_id', toDelete)
      if (error) throw error
    }
    if (toUpsert.length > 0) {
      const { error } = await table().upsert(toUpsert, { onConflict: 'lecture_id,student_id' })
      if (error) throw error
    }

    revalidatePath('/admin/lectures')
    revalidatePath('/dashboard/learning')
    revalidateTag('lectures', {})
    return { success: true }
  })
}

// 예외 설정 모달용 — 분반 학생 목록 (예외 지정 대상 선택)
export async function getClassStudentsForAccess(
  classId: string,
): Promise<{ error?: string; students?: Array<{ id: string; name: string }> }> {
  const user = await getStaffUser()
  if (!user) return { error: '인증이 필요합니다.' }
  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('class_members')
    .select('student_id, users!student_id(name)')
    .eq('class_id', classId)
    .eq('is_active', true)
  if (error) return { error: '학생 목록 조회에 실패했습니다.' }

  const students = (data ?? [])
    .map((m) => ({
      id: m.student_id as string,
      name: ((m.users as { name?: string } | null)?.name ?? '') as string,
    }))
    .filter((s) => s.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  return { students }
}

export async function createLecture(data: {
  courseName: string
  title: string
  youtubeVideoId: string
  orderNum: number
  materialUrl?: string
}): Promise<ActionResult> {
  const user = await getStaffUser()

  return withAction('createLecture', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }
    if (!data.title.trim()) return { success: false, error: '강의 제목을 입력하세요.' }
    if (!data.courseName.trim()) return { success: false, error: '강좌명이 없습니다.' }

    const admin = createAdminClient()
    const { error } = await admin.from('lectures').insert({
      course_name:      data.courseName,
      title:            data.title.trim(),
      youtube_video_id: data.youtubeVideoId.trim() || null,
      order_num:        data.orderNum,
      material_url:     data.materialUrl?.trim() || null,
      class_id:         null,
    })
    if (error) throw error

    revalidatePath('/admin/lectures')
    revalidateTag('lectures', {})
    return { success: true }
  })
}

export async function updateLecture(
  id: string,
  data: { title: string; youtubeVideoId: string; orderNum: number; materialUrl?: string },
): Promise<ActionResult> {
  const user = await getStaffUser()

  return withAction('updateLecture', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const admin = createAdminClient()
    const { error } = await admin
      .from('lectures')
      .update({
        title:            data.title,
        youtube_video_id: data.youtubeVideoId || null,
        order_num:        data.orderNum,
        material_url:     data.materialUrl || null,
      })
      .eq('id', id)
    if (error) throw error

    revalidatePath('/admin/lectures')
    revalidateTag('lectures', {})
    return { success: true }
  })
}

export async function updateLectureOrder(id: string, orderNum: number): Promise<ActionResult> {
  const user = await getStaffUser()

  return withAction('updateLectureOrder', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const admin = createAdminClient()
    const { error } = await admin.from('lectures').update({ order_num: orderNum }).eq('id', id)
    if (error) throw error

    revalidatePath('/admin/lectures')
    revalidateTag('lectures', {})
    return { success: true }
  })
}

export async function deleteLecture(id: string): Promise<ActionResult> {
  const user = await getStaffUser()

  return withAction('deleteLecture', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const admin = createAdminClient()
    const { error } = await admin.from('lectures').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/admin/lectures')
    revalidateTag('lectures', {})
    return { success: true }
  })
}

export async function addCourseMaterial(courseName: string, title: string, url: string): Promise<ActionResult> {
  const user = await getStaffUser()

  return withAction('addCourseMaterial', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }
    if (!title.trim()) return { success: false, error: '제목을 입력하세요.' }
    if (!url.trim()) return { success: false, error: 'URL을 입력하세요.' }

    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from('course_materials').insert({
      course_name: courseName,
      title: title.trim(),
      url: url.trim(),
    })
    if (error) throw error

    revalidatePath('/admin/lectures')
    revalidatePath(`/dashboard/learning/course/${encodeURIComponent(courseName)}`)
    revalidateTag('lectures', {})
    return { success: true }
  })
}

export async function deleteCourseMaterial(id: string): Promise<ActionResult> {
  const user = await getStaffUser()

  return withAction('deleteCourseMaterial', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const admin = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any).from('course_materials').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/admin/lectures')
    revalidateTag('lectures', {})
    return { success: true }
  })
}

export async function syncYouTubePlaylistToCourse(
  courseName: string,
  playlistUrl: string,
): Promise<ActionResult<{ synced: number }>> {
  const user = await getStaffUser()

  return withAction('syncYouTubePlaylistToCourse', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }
    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const apiKey = process.env.YOUTUBE_API_KEY
    if (!apiKey) return { success: false, error: 'YouTube API 키가 설정되지 않았습니다.' }

    const match = playlistUrl.match(/[?&]list=([^&#]+)/)
    if (!match) return { success: false, error: '올바른 YouTube 플레이리스트 URL을 입력하세요.' }
    const playlistId = match[1]

    type YTItem = { snippet: { resourceId: { videoId: string }; title: string; position: number } }
    type YTResponse = { items?: YTItem[]; nextPageToken?: string; error?: { message?: string } }

    const videos: Array<{ videoId: string; title: string; position: number }> = []
    let pageToken: string | undefined

    do {
      const url = new URL('https://www.googleapis.com/youtube/v3/playlistItems')
      url.searchParams.set('part', 'snippet')
      url.searchParams.set('maxResults', '50')
      url.searchParams.set('playlistId', playlistId)
      url.searchParams.set('key', apiKey)
      if (pageToken) url.searchParams.set('pageToken', pageToken)

      const res = await fetch(url.toString())
      const body = (await res.json()) as YTResponse
      if (!res.ok) return { success: false, error: `YouTube API 오류: ${body.error?.message ?? res.statusText}` }
      for (const item of body.items ?? []) {
        videos.push({ videoId: item.snippet.resourceId.videoId, title: item.snippet.title, position: item.snippet.position })
      }
      pageToken = body.nextPageToken
    } while (pageToken)

    if (videos.length === 0) return { success: false, error: '플레이리스트에 영상이 없습니다.' }

    const admin = createAdminClient()
    const now = new Date().toISOString()

    await admin.from('lectures').delete().eq('course_name', courseName).eq('youtube_playlist_id', playlistId)

    const rows = videos.map((v) => ({
      course_name:         courseName,
      title:               v.title,
      youtube_video_id:    v.videoId,
      youtube_playlist_id: playlistId,
      // 유튜브 position은 0부터 시작 — 화면 표기는 1강부터여야 하므로 +1
      order_num:           v.position + 1,
      synced_at:           now,
      class_id:            null,
    }))

    const { error } = await admin.from('lectures').insert(rows)
    if (error) throw error

    revalidatePath('/admin/lectures')
    revalidateTag('lectures', {})
    return { success: true, data: { synced: videos.length } }
  })
}
