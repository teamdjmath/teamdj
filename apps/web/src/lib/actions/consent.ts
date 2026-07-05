'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'

const STAFF_ROLES = ['teacher', 'ta_desk', 'ta_assistant']

export async function agreeTerms() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const now = new Date().toISOString()
  const admin = createAdminClient()

  // user_metadata 업데이트 (middleware 체크용) + DB 기록 (감사용) 병렬
  await Promise.all([
    admin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...user.user_metadata, agreed_terms_at: now },
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from('users') as any).update({ agreed_terms_at: now }).eq('id', user.id),
  ])

  const role = user.user_metadata?.role as string | undefined
  redirect(STAFF_ROLES.includes(role ?? '') ? '/admin/dashboard' : '/dashboard')
}
