import { createClient } from '@/lib/supabase/server'
import { NoticesClient } from './_components/notices-client'

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>
}) {
  const { classId: selectedClassId } = await searchParams
  const supabase = await createClient()

  let noticesQuery = supabase
    .from('notices')
    .select('id, title, content, is_pinned, class_id, created_at, class_groups!class_id(name), users!author_id(name)')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (selectedClassId) {
    noticesQuery = noticesQuery.or(`class_id.is.null,class_id.eq.${selectedClassId}`) as typeof noticesQuery
  }

  const [{ data: classes }, { data: rows }] = await Promise.all([
    supabase
      .from('class_groups')
      .select('id, name')
      .eq('is_active', true)
      .order('name'),
    noticesQuery,
  ])

  const notices = (rows ?? []).map((n) => ({
    id: n.id as string,
    title: n.title as string,
    content: n.content as string,
    is_pinned: (n.is_pinned ?? false) as boolean,
    class_id: (n.class_id ?? null) as string | null,
    created_at: n.created_at as string,
    className: (n.class_groups as { name: string } | null)?.name ?? null,
    authorName: (n.users as { name: string } | null)?.name ?? '',
  }))

  return (
    <NoticesClient
      classOptions={(classes ?? []).map((c) => ({ id: c.id, name: c.name }))}
      selectedClassId={selectedClassId ?? null}
      notices={notices}
    />
  )
}
