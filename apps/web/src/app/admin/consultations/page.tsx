import { createAdminClient } from '@/lib/supabase/admin'
import { ConsultationsClient } from './_components/consultations-client'

export default async function ConsultationsPage() {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (admin as any)
    .from('consultations')
    .select('id, name, phone, content, is_read, created_at')
    .order('created_at', { ascending: false })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consultations = (rows ?? []).map((r: any) => ({
    id: r.id as string,
    name: r.name as string,
    phone: r.phone as string,
    content: r.content as string,
    is_read: r.is_read as boolean,
    created_at: r.created_at as string,
  }))

  return (
    <ConsultationsClient consultations={consultations} />
  )
}
