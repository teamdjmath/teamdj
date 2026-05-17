import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChangePasswordForm } from './_components/change-password-form'

export default async function ChangePasswordPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // 이미 변경 완료한 경우 대시보드로
  if (!user.user_metadata?.must_change_password) {
    const role = user.user_metadata?.role as string | undefined
    redirect(['teacher', 'ta_admin', 'ta_assistant'].includes(role ?? '') ? '/admin/dashboard' : '/dashboard')
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">비밀번호 변경</h1>
          <p className="mt-2 text-sm text-zinc-500">
            초기 비밀번호를 변경해주세요.
          </p>
        </div>
        <ChangePasswordForm role={user.user_metadata?.role ?? 'student'} />
      </div>
    </div>
  )
}
