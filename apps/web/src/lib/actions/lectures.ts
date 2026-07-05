'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
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
    return { success: true }
  })
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
      order_num:           v.position,
      synced_at:           now,
      class_id:            null,
    }))

    const { error } = await admin.from('lectures').insert(rows)
    if (error) throw error

    revalidatePath('/admin/lectures')
    return { success: true, data: { synced: videos.length } }
  })
}
