import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { redirect } from 'next/navigation'
import { ChangePasswordForm } from './_components/change-password-form'

export default async function ChangePasswordPage() {
  const user = await getVerifiedUser()

  if (!user) redirect('/login')

  // must_change_password=true면 초기/재설정 비밀번호로 막 로그인한 강제 변경 흐름(현재 비밀번호
  // 확인 없이 바로 새 비밀번호만 받음) — 그 외에는 본인이 자발적으로 바꾸러 온 것이므로 현재
  // 비밀번호 확인을 추가로 받는다. 두 경우 다 이 페이지 하나에서 처리한다.
  const forced = !!user.user_metadata?.must_change_password

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">비밀번호 변경</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {forced ? '초기 비밀번호를 변경해주세요.' : '새 비밀번호를 입력해주세요.'}
          </p>
        </div>
        <ChangePasswordForm role={user.user_metadata?.role ?? 'student'} forced={forced} />
      </div>
    </div>
  )
}
