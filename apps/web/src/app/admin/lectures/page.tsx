import { createClient } from '@/lib/supabase/server'
import { LecturesClient } from './_components/lectures-client'

export default async function LecturesPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>
}) {
  const { classId: selectedClassId } = await searchParams
  const supabase = await createClient()

  const { data: classes } = await supabase
    .from('class_groups')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  let query = supabase
    .from('lectures')
    .select('id, title, youtube_video_id, youtube_playlist_id, order_num, synced_at, class_id, class_groups!class_id(name)')
    .order('order_num', { ascending: true })

  if (selectedClassId) {
    query = query.eq('class_id', selectedClassId) as typeof query
  }

  const { data: rows } = await query

  const lectures = (rows ?? []).map((l) => ({
    id: l.id as string,
    title: l.title as string,
    youtube_video_id: (l.youtube_video_id ?? '') as string,
    youtube_playlist_id: (l.youtube_playlist_id ?? '') as string,
    order_num: (l.order_num ?? 0) as number,
    synced_at: (l.synced_at ?? null) as string | null,
    class_id: l.class_id as string,
    className: ((l.class_groups as unknown as { name: string } | null)?.name ?? '') as string,
  }))

  // Last synced time for the selected class
  const lastSynced = selectedClassId
    ? lectures.filter((l) => l.synced_at).sort((a, b) => (b.synced_at! > a.synced_at! ? 1 : -1))[0]?.synced_at ?? null
    : null

  return (
    <LecturesClient
      classOptions={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
      selectedClassId={selectedClassId ?? null}
      lectures={lectures}
      lastSynced={lastSynced}
    />
  )
}
