import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { purgeOldRows } from '@/lib/retention'
import { ErrorsClient, type ErrorRow } from './_components/errors-client'

export const dynamic = 'force-dynamic'

export default async function ErrorsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category: categoryFilter } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.user_metadata?.role as string | undefined
  if (!user || role !== 'teacher') redirect('/admin/dashboard')

  const admin = createAdminClient()

  // 보존 정책 lazy 정리 (pg_cron 부재 대비)
  await purgeOldRows('error_logs', 30)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin as any).from('error_logs')
    .select('id, source, severity, category, message, digest, url, user_role, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  if (categoryFilter) query = query.eq('category', categoryFilter)

  const { data: rows } = await query

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors: ErrorRow[] = (rows ?? []).map((r: any) => ({
    id:        r.id         as string,
    source:    r.source     as string,
    severity:  r.severity   as string,
    category:  r.category   as string,
    message:   r.message    as string,
    digest:    r.digest     as string,
    url:       r.url        as string,
    userRole:  r.user_role  as string,
    createdAt: r.created_at as string,
  }))

  return <ErrorsClient errors={errors} categoryFilter={categoryFilter ?? null} />
}
