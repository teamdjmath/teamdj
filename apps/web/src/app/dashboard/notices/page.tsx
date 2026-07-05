import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'

export const metadata = {
  title: '공지사항 | TeamDJ',
}

// 같은 분반 조합의 학생은 동일 데이터 → classIds별로 캐시, 60초 TTL
// 공지 생성/수정/삭제 시 revalidateTag('notices')로 즉시 무효화
const getCachedNotices = unstable_cache(
  async (classIds: string[]) => {
    const admin = createAdminClient()
    const filter = classIds.length > 0
      ? `class_id.is.null,class_id.in.(${classIds.join(',')})`
      : 'class_id.is.null'
    const { data } = await admin
      .from('notices')
      .select('id, title, created_at, is_pinned')
      .or(filter)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false })
    return data ?? []
  },
  ['notices'],
  { revalidate: 60, tags: ['notices'] },
)

export default async function NoticesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('student_id', user!.id)
    .eq('is_active', true)

  const classIds = (memberships ?? []).map((m) => m.class_id as string).sort()
  const notices = await getCachedNotices(classIds)

  return (
    <div className="max-w-2xl mx-auto pb-10">
      {/* 상단 네비게이션 */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/dashboard"
          className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm hover:bg-zinc-50 transition-colors"
        >
          <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-black text-zinc-900 tracking-tight">공지사항</h1>
      </div>

      {/* 목록 영역 */}
      <div className="space-y-3">
        {notices.map((n) => (
          <Link
            key={n.id}
            href={`/dashboard/notices/${n.id}`}
            className="flex items-center justify-between p-5 rounded-[24px] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md transition-all group"
          >
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-bold text-zinc-800 leading-snug group-hover:text-zinc-950">
                {n.title}
              </h3>
              <p className="text-xs text-zinc-400 mt-1.5 font-medium">
                {new Date(n.created_at).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <svg className="w-5 h-5 text-zinc-200 group-hover:text-zinc-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        ))}
        {notices.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-zinc-400">공지사항이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}
