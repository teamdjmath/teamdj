import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { StudentQnaDetail } from './_components/student-qna-detail'

export const metadata = {
  title: '질문 상세 | TeamDJ',
}

export default async function QnaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const user = await getVerifiedUser()

  if (!user) redirect('/login')

  const { data: qData, error: qError } = await supabase
    .from('qna_questions')
    .select('*')
    .eq('id', id)
    .single()

  if (qError || !qData) redirect('/dashboard/qna')

  // check permission
  if (qData.student_id !== user.id) redirect('/dashboard/qna')

  // 학생 RLS로는 스태프의 users 행을 읽을 수 없어 TA 이름 조인이 전부 null이 됨.
  // 본인 질문임을 확인한 뒤이므로, 이름 조회만 admin으로 수행 (노출 필드는 name뿐).
  const admin = createAdminClient()

  let assignedTaName: string | null = null
  if (qData.assigned_ta_id) {
    const { data: taRow } = await admin.from('users').select('name').eq('id', qData.assigned_ta_id).maybeSingle()
    assignedTaName = taRow?.name ?? null
  }

  const question = {
    ...qData,
    status: qData.status as 'open' | 'in_progress' | 'answered',
    assignedTaName,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: aData } = await (admin as any)
    .from('qna_answers')
    .select('id, content, media_urls, answered_at, student_rating, is_ai_draft, ta:users!qna_answers_ta_id_fkey(name)')
    .eq('question_id', id)
    .order('answered_at', { ascending: true })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const answers = (aData || []).map((a: any) => ({
    id: a.id as string,
    content: a.content as string,
    media_urls: (a.media_urls as string[]) ?? [],
    answered_at: a.answered_at as string,
    taName: (a.ta as { name?: string } | null)?.name || 'TA',
    studentRating: (a.student_rating as number | null) ?? null,
    isAiDraft: (a.is_ai_draft as boolean | null) ?? false,
  }))

  return (
    <div className="pb-10">
      <div className="mb-4">
        <Link href="/dashboard/qna" className="text-sm text-zinc-500 hover:text-zinc-800 transition">
          &larr; 목록으로 돌아가기
        </Link>
      </div>
      <StudentQnaDetail
        question={question}
        answers={answers}
        studentName={(user.user_metadata?.name as string | undefined) ?? ''}
      />
    </div>
  )
}
