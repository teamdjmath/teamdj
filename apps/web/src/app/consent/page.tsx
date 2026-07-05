import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ConsentClient } from './_components/consent-client'

const STAFF_ROLES = ['teacher', 'ta_desk', 'ta_assistant']

export default async function ConsentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 이미 동의한 경우 대시보드로
  if (user.user_metadata?.agreed_terms_at) {
    const role = user.user_metadata?.role as string | undefined
    redirect(STAFF_ROLES.includes(role ?? '') ? '/admin/dashboard' : '/dashboard')
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-950 mb-5">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">서비스 이용 동의</h1>
          <p className="mt-2 text-sm text-zinc-500">
            TeamDJ 학습 관리 서비스를 이용하시려면 아래 내용에 동의해주세요.
          </p>
        </div>
        <ConsentClient />
      </div>
    </div>
  )
}
