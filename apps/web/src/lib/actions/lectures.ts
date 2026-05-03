'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createLecture(data: {
  classId: string
  title: string
  youtubeVideoId: string
  orderNum: number
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await supabase.from('lectures').insert({
    class_id: data.classId,
    title: data.title,
    youtube_video_id: data.youtubeVideoId || null,
    order_num: data.orderNum,
  })

  if (error) return { error: '강의 등록에 실패했습니다.' }
  revalidatePath('/admin/lectures')
  return {}
}

export async function updateLecture(
  id: string,
  data: { title: string; youtubeVideoId: string; orderNum: number },
): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await supabase
    .from('lectures')
    .update({ title: data.title, youtube_video_id: data.youtubeVideoId || null, order_num: data.orderNum })
    .eq('id', id)

  if (error) return { error: '수정에 실패했습니다.' }
  revalidatePath('/admin/lectures')
  return {}
}

export async function updateLectureOrder(id: string, orderNum: number): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await supabase.from('lectures').update({ order_num: orderNum }).eq('id', id)
  if (error) return { error: '순서 변경에 실패했습니다.' }
  revalidatePath('/admin/lectures')
  return {}
}

export async function deleteLecture(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await supabase.from('lectures').delete().eq('id', id)
  if (error) return { error: '삭제에 실패했습니다.' }
  revalidatePath('/admin/lectures')
  return {}
}

export async function syncYouTubePlaylist(
  classId: string,
  playlistUrl: string,
): Promise<{ error?: string; synced?: number }> {
  const apiKey = process.env.YOUTUBE_API_KEY
  if (!apiKey) return { error: 'YouTube API 키가 설정되지 않았습니다.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const match = playlistUrl.match(/[?&]list=([^&#]+)/)
  if (!match) return { error: '올바른 YouTube 플레이리스트 URL을 입력하세요.' }
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

    if (!res.ok) return { error: `YouTube API 오류: ${body.error?.message ?? res.statusText}` }

    for (const item of body.items ?? []) {
      videos.push({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        position: item.snippet.position,
      })
    }
    pageToken = body.nextPageToken
  } while (pageToken)

  if (videos.length === 0) return { error: '플레이리스트에 영상이 없습니다.' }

  const now = new Date().toISOString()

  // Replace existing videos from this playlist in this class
  await supabase
    .from('lectures')
    .delete()
    .eq('class_id', classId)
    .eq('youtube_playlist_id', playlistId)

  const rows = videos.map((v) => ({
    class_id: classId,
    title: v.title,
    youtube_video_id: v.videoId,
    youtube_playlist_id: playlistId,
    order_num: v.position,
    synced_at: now,
  }))

  const { error } = await supabase.from('lectures').insert(rows)
  if (error) return { error: '동기화 저장에 실패했습니다.' }

  revalidatePath('/admin/lectures')
  return { synced: videos.length }
}
