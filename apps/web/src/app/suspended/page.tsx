import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { LogoutButton } from '@/components/ui/logout-button'

export default async function SuspendedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dbUser } = await (supabase as any)
    .from('users')
    .select('name, suspended_from, suspended_until')
    .eq('id', user.id)
    .single()

  const today = new Date().toISOString().slice(0, 10)
  const from = dbUser?.suspended_from as string | null
  const until = dbUser?.suspended_until as string | null

  // 휴원 기간이 아니면 대시보드로
  if (!from || !until || !(from <= today && today <= until)) {
    redirect('/dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4 text-center">
      <div className="max-w-sm space-y-6">
        <div className="rounded-full bg-amber-100 p-4 inline-flex">
          <svg className="h-8 w-8 text-amber-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-zinc-950">
            {dbUser?.name ?? ''}님, 현재 휴원 중입니다
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            휴원 기간: <span className="font-medium text-zinc-800">{from} ~ {until}</span>
          </p>
          <p className="mt-3 text-sm text-zinc-500 leading-relaxed">
            휴원 기간 중에는 학습 서비스 이용이 제한됩니다.
            <br />
            문의사항은 담당 선생님께 연락해 주세요.
          </p>
        </div>

        <LogoutButton className="w-full" />
      </div>
    </div>
  )
}
