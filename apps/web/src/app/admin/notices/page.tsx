import { createClient } from '@/lib/supabase/server'
import { NoticesClient } from './_components/notices-client'

export default async function NoticesPage({
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
    .from('notices')
    .select('id, title, content, is_pinned, class_id, created_at, class_groups!class_id(name), users!author_id(name)')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (selectedClassId) {
    // Show global notices + selected class notices
    query = query.or(`class_id.is.null,class_id.eq.${selectedClassId}`) as typeof query
  }

  const { data: rows } = await query

  const notices = (rows ?? []).map((n) => ({
    id: n.id as string,
    title: n.title as string,
    content: n.content as string,
    is_pinned: (n.is_pinned ?? false) as boolean,
    class_id: (n.class_id ?? null) as string | null,
    created_at: n.created_at as string,
    className: ((n.class_groups as unknown as { name: string } | null)?.name ?? null) as string | null,
    authorName: ((n.users as unknown as { name: string } | null)?.name ?? '') as string,
  }))

  return (
    <NoticesClient
      classOptions={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
      selectedClassId={selectedClassId ?? null}
      notices={notices}
    />
  )
}
