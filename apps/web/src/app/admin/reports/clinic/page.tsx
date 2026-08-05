import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { redirect } from 'next/navigation'
import { ClinicBuilderClient } from './_components/clinic-builder-client'

export default async function ClinicReportPage() {
  const user = await getVerifiedUser()
  const role = user?.user_metadata?.role as string | undefined
  if (!user || !['teacher', 'ta_desk'].includes(role ?? '')) redirect('/admin/dashboard')

  return <ClinicBuilderClient />
}
