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

  // Fetch classes the student is enrolled in
  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id, class_groups(id, name, subject)')
    .eq('student_id', user.id)
    .eq('is_active', true)

  const classes = (memberships || [])
    .map(m => m.class_groups)
    .filter(Boolean) as unknown as { id: string; name: string; subject: string }[]

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-zinc-200">
        <h1 className="text-lg font-bold text-zinc-900">새 질문 등록</h1>
      </div>
      
      <NewQuestionForm classes={classes} />
    </div>
  )
}
