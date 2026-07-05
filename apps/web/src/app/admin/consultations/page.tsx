import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConsultationsClient } from './_components/consultations-client'

export default async function ConsultationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const [consultationsRes, inquiriesRes] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('consultations')
      .select('id, name, phone, content, is_read, created_at')
      .order('created_at', { ascending: false }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('student_inquiries')
      .select('id, user_id, student_name, content, is_read, created_at, users!user_id(school, grade)')
      .order('created_at', { ascending: false }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const consultations = (consultationsRes.data ?? []).map((r: any) => ({
    id:         r.id         as string,
    name:       r.name       as string,
    phone:      r.phone      as string,
    content:    r.content    as string,
    is_read:    r.is_read    as boolean,
    created_at: r.created_at as string,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inquiries = (inquiriesRes.data ?? []).map((r: any) => ({
    id:           r.id           as string,
    user_id:      r.user_id      as string,
    student_name: r.student_name as string,
    school:       (r.users as { school?: string; grade?: string } | null)?.school ?? '',
    grade:        (r.users as { school?: string; grade?: string } | null)?.grade  ?? '',
    content:      r.content      as string,
    is_read:      r.is_read      as boolean,
    created_at:   r.created_at   as string,
  }))

  return (
    <ConsultationsClient consultations={consultations} inquiries={inquiries} />
  )
}
