import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewQuestionForm } from './_components/new-question-form'

export const metadata = {
  title: '새 질문 등록 | TeamDJ',
}

export default async function NewQuestionPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

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
