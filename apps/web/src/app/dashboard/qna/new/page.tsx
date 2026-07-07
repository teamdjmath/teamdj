import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { redirect } from 'next/navigation'
import { NewQuestionForm } from './_components/new-question-form'

export const metadata = {
  title: '새 질문 등록 | TeamDJ',
}

export default async function NewQuestionPage() {
  const supabase = await createClient()
  const user = await getVerifiedUser()

  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // 휴원 확인
  const { data: dbUser } = await db.from('users').select('suspended_from, suspended_until').eq('id', user.id).single()
  const today = new Date().toISOString().slice(0, 10)
  const suspFrom = dbUser?.suspended_from as string | null
  const suspUntil = dbUser?.suspended_until as string | null
  const isSuspended = !!(suspFrom && suspUntil && suspFrom <= today && today <= suspUntil)

  if (isSuspended) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-6 py-8 text-center">
        <p className="text-sm font-semibold text-amber-800">휴원 중에는 질문 등록이 제한됩니다.</p>
        <p className="mt-1 text-xs text-amber-700">
          종료일: {suspUntil ? new Date(suspUntil).toLocaleDateString('ko-KR') : ''} 이후 이용 가능합니다.
        </p>
      </div>
    )
  }

  const [membershipsRes, textbooksRes] = await Promise.all([
    supabase
      .from('class_members')
      .select('class_id, class_groups(id, name, subject)')
      .eq('student_id', user.id)
      .eq('is_active', true),
    db.from('textbooks').select('id, name').order('name'),
  ])

  const classes = (membershipsRes.data || [])
    .map((m: { class_groups: unknown }) => m.class_groups)
    .filter(Boolean) as { id: string; name: string; subject: string }[]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const textbooks = (textbooksRes.data ?? []).map((t: any) => ({ id: t.id as string, name: t.name as string }))

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-zinc-200">
        <h1 className="text-lg font-bold text-zinc-900">새 질문 등록</h1>
      </div>

      <NewQuestionForm classes={classes} textbooks={textbooks} />
    </div>
  )
}
