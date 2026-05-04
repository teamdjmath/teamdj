import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    open:        { label: '미답변', cls: 'bg-zinc-100 text-zinc-400' },
    in_progress: { label: '답변중', cls: 'bg-zinc-950 text-white' },
    answered:    { label: '답변완료', cls: 'bg-zinc-100 text-zinc-900 font-bold' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-zinc-100 text-zinc-400' }
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-bold ${cls}`}>
      {label}
    </span>
  )
}

export default async function QnAListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: questions } = await supabase
    .from('qna_questions')
    .select('id, title, status, created_at')
    .eq('student_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">Q&A</h1>
        <Link
          href="/dashboard/qna/new"
          className="rounded-2xl bg-zinc-950 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-zinc-800 active:scale-95 shadow-sm"
        >
          새 질문 등록
        </Link>
      </div>

      <Card>
        <CardHeader title="내 질문 목록" />
        <CardContent>
          {questions && questions.length > 0 ? (
            <div className="space-y-3">
              {questions.map((q) => (
                <Link
                  key={q.id}
                  href={`/dashboard/qna/${q.id}`}
                  className="flex flex-col gap-2 p-5 rounded-[24px] bg-zinc-50 transition-all hover:bg-zinc-100 group"
                >
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex-1 truncate text-[15px] font-bold text-zinc-800">
                      {q.title || '제목 없음'}
                    </span>
                    <StatusBadge status={q.status} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-400">
                      {new Date(q.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <svg className="w-4 h-4 text-zinc-200 group-hover:text-zinc-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-12">
              <EmptyState message="등록된 질문이 없습니다." />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
