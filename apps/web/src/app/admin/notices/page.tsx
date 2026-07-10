import { createClient } from '@/lib/supabase/server'
import { filterTestNamed, getViewerIsSuperAdmin, isTestName } from '@/lib/test-data'
import { NoticesClient } from './_components/notices-client'

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string }>
}) {
  const { classId: selectedClassId } = await searchParams
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let noticesQuery = (supabase as any)
    .from('notices')
    .select('id, title, content, is_pinned, is_public, image_urls, class_id, created_at, class_groups!class_id(name), users!author_id(name)')
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notices = ((rows ?? []) as any[]).map((n) => ({
    id: n.id as string,
    title: n.title as string,
    content: n.content as string,
    is_pinned: (n.is_pinned ?? false) as boolean,
    is_public: (n.is_public ?? false) as boolean,
    image_urls: (n.image_urls ?? []) as string[],
    class_id: (n.class_id ?? null) as string | null,
    created_at: n.created_at as string,
    className: (n.class_groups as { name: string } | null)?.name ?? null,
    authorName: (n.users as { name: string } | null)?.name ?? '',
  }))

  // 테스트 분반 대상 공지는 관리자에게만 노출
  const viewerIsAdmin = await getViewerIsSuperAdmin()
  const visibleNotices = notices.filter((n) => viewerIsAdmin || !n.className || !isTestName(n.className))

  return (
    <NoticesClient
      classOptions={(await filterTestNamed(classes ?? [])).map((c) => ({ id: c.id, name: c.name }))}
      selectedClassId={selectedClassId ?? null}
      notices={visibleNotices}
    />
  )
}
