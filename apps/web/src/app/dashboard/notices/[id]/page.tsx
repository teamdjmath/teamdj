import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'

export const metadata = {
  title: '공지사항 상세 | TeamDJ',
}

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: notice, error } = await supabase
    .from('notices')
    .select('*, author:users(name)')
    .eq('id', id)
    .single()

  if (error || !notice) {
    redirect('/dashboard/notices')
  }

  return (
    <div className="max-w-2xl mx-auto pb-20">
      {/* 상단 네비게이션 */}
      <div className="flex items-center gap-4 mb-10">
        <Link 
          href="/dashboard/notices" 
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-zinc-50 transition-colors"
        >
          <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      </div>

      {/* 헤더 영역 */}
      <div className="mb-8 border-b border-zinc-100 pb-8">
        <h1 className="text-3xl font-extrabold text-zinc-900 leading-tight mb-4">
          {notice.title}
        </h1>
        <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
          <span>{new Date(notice.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          <span className="w-1 h-1 rounded-full bg-zinc-200" />
          <span>관리자</span>
        </div>
      </div>

      {/* 본문 영역 */}
      <div className="prose prose-zinc max-w-none prose-sm md:prose-base text-zinc-700 leading-relaxed">
        <ReactMarkdown>
          {notice.content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
