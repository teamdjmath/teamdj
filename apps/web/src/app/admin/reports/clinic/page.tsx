import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ClinicBuilderClient } from './_components/clinic-builder-client'

export default async function ClinicReportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const role = user?.user_metadata?.role as string | undefined
  if (!user || !['teacher', 'ta_desk'].includes(role ?? '')) redirect('/admin/dashboard')

  return <ClinicBuilderClient />
}
