'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ActionResult = { success: true } | { success: false; error: string }

async function assertStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: '인증이 필요합니다.' }
  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { ok: false as const, error: '권한이 없습니다.' }
  return { ok: true as const, user }
}

// ── 강좌 생성 (lecture_class_access 행 삽입)
export async function createCourse(
  courseName: string,
  classIds: string[],
): Promise<ActionResult> {
  const auth = await assertStaff()
  if (!auth.ok) return { success: false, error: auth.error }
  const admin = createAdminClient()

  if (!courseName.trim()) return { success: false, error: '강좌명을 입력하세요.' }

  if (classIds.length > 0) {
    const { error } = await admin.from('lecture_class_access').insert(
      classIds.map((id) => ({ course_name: courseName.trim(), class_id: id })),
    )
    if (error) return { success: false, error: `강좌 생성 실패: ${error.message}` }
  }

  revalidatePath('/admin/lectures')
  return { success: true }
}

// ── 강좌 접근 분반 업데이트 (기존 삭제 후 재삽입)
export async function updateCourseClasses(
  courseName: string,
  classIds: string[],
): Promise<ActionResult> {
  const auth = await assertStaff()
  if (!auth.ok) return { success: false, error: auth.error }
  const admin = createAdminClient()

  await admin.from('lecture_class_access').delete().eq('course_name', courseName)

  if (classIds.length > 0) {
    const { error } = await admin.from('lecture_class_access').insert(
      classIds.map((id) => ({ course_name: courseName, class_id: id })),
    )
    if (error) return { success: false, error: `업데이트 실패: ${error.message}` }
  }

  revalidatePath('/admin/lectures')
  return { success: true }
}

// ── 강좌 삭제 (lectures + lecture_class_access 함께 삭제)
export async function deleteCourse(courseName: string): Promise<ActionResult> {
  const auth = await assertStaff()
  if (!auth.ok) return { success: false, error: auth.error }
  const admin = createAdminClient()

  await admin.from('lectures').delete().eq('course_name', courseName)
  await admin.from('lecture_class_access').delete().eq('course_name', courseName)

  revalidatePath('/admin/lectures')
  return { success: true }
}

// ── 강의 추가 (강좌에 개별 영상 추가)
export async function createLecture(data: {
  courseName: string
  title: string
  youtubeVideoId: string
  orderNum: number
}): Promise<ActionResult> {
  const auth = await assertStaff()
  if (!auth.ok) return { success: false, error: auth.error }
  const admin = createAdminClient()

  if (!data.title.trim()) return { success: false, error: '강의 제목을 입력하세요.' }
  if (!data.courseName.trim()) return { success: false, error: '강좌명이 없습니다.' }

  const { error } = await admin.from('lectures').insert({
    course_name:       data.courseName,
    title:             data.title.trim(),
    youtube_video_id:  data.youtubeVideoId.trim() || null,
    order_num:         data.orderNum,
    class_id:          null,
  })

  if (error) return { success: false, error: `강의 추가 실패: ${error.message}` }
  revalidatePath('/admin/lectures')
  return { success: true }
}

// ── 강의 수정
export async function updateLecture(
  id: string,
  data: { title: string; youtubeVideoId: string; orderNum: number },
): Promise<ActionResult> {
  const auth = await assertStaff()
  if (!auth.ok) return { success: false, error: auth.error }
  const admin = createAdminClient()

  const { error } = await admin
    .from('lectures')
    .update({
      title:            data.title,
      youtube_video_id: data.youtubeVideoId || null,
      order_num:        data.orderNum,
    })
    .eq('id', id)

  if (error) return { success: false, error: `수정 실패: ${error.message}` }
  revalidatePath('/admin/lectures')
  return { success: true }
}

// ── 강의 순서 변경
export async function updateLectureOrder(id: string, orderNum: number): Promise<ActionResult> {
  const auth = await assertStaff()
  if (!auth.ok) return { success: false, error: auth.error }
  const admin = createAdminClient()

  const { error } = await admin.from('lectures').update({ order_num: orderNum }).eq('id', id)
  if (error) return { success: false, error: `순서 변경 실패: ${error.message}` }
  revalidatePath('/admin/lectures')
  return { success: true }
}

// ── 강의 삭제
export async function deleteLecture(id: string): Promise<ActionResult> {
  const auth = await assertStaff()
  if (!auth.ok) return { success: false, error: auth.error }
  const admin = createAdminClient()

  const { error } = await admin.from('lectures').delete().eq('id', id)
  if (error) return { success: false, error: `삭제 실패: ${error.message}` }
  revalidatePath('/admin/lectures')
  return { success: true }
}

// ── YouTube 플레이리스트 → 강좌 동기화
export async function syncYouTubePlaylistToCourse(
  courseName: string,
  playlistUrl: string,
): Promise<{ success: false; error: string } | { success: true; synced: number }> {
  const auth = await assertStaff()
  if (!auth.ok) return { success: false, error: auth.error }

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

  // 기존 이 플레이리스트로 동기화된 강의 삭제
  await admin.from('lectures').delete().eq('course_name', courseName).eq('youtube_playlist_id', playlistId)

  const rows = videos.map((v) => ({
    course_name:          courseName,
    title:                v.title,
    youtube_video_id:     v.videoId,
    youtube_playlist_id:  playlistId,
    order_num:            v.position,
    synced_at:            now,
    class_id:             null,
  }))

  const { error } = await admin.from('lectures').insert(rows)
  if (error) return { success: false, error: `동기화 저장 실패: ${error.message}` }

  revalidatePath('/admin/lectures')
  return { success: true, synced: videos.length }
}
