import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { LandingNav } from '@/components/landing/landing-nav'
import { SiteFooter } from '@/components/landing/site-footer'
import { NoticeContent } from '@/components/notice-content'

export const metadata: Metadata = {
  title: '공지사항 | TeamDJ',
  description: 'TeamDJ 학원 공지사항 — 수업 일정, 학부모 안내, 특강 소식',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// 로그인 없이 보는 공개 공지 — is_public=true인 공지만 노출 (admin 클라이언트로 조회, RLS 무관)
export default async function PublicNoticesPage() {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (admin as any)
    .from('notices')
    .select('id, title, content, is_pinned, image_urls, created_at')
    .eq('is_public', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notices = ((rows ?? []) as any[]).map((n) => ({
    id: n.id as string,
    title: n.title as string,
    content: n.content as string,
    isPinned: (n.is_pinned ?? false) as boolean,
    imageUrls: (n.image_urls ?? []) as string[],
    createdAt: n.created_at as string,
  }))

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <LandingNav />

      <div className="container max-w-3xl mx-auto px-4 py-14 md:py-20 flex-1 w-full">
        <span className="text-emerald-600 font-bold tracking-tight text-sm uppercase mb-4 block">
          Notice
        </span>
        <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-950 mb-3">
          공지사항
        </h1>
        <p className="text-zinc-500 mb-10">수업 일정과 학원 소식을 안내드립니다.</p>

        {notices.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 py-20 text-center text-zinc-400">
            등록된 공지사항이 없습니다.
          </div>
        ) : (
          <div className="space-y-4">
            {notices.map((n) => (
              <article key={n.id} className="rounded-2xl border border-zinc-200 p-6 md:p-8">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-lg md:text-xl font-bold text-zinc-950 break-keep">
                    {n.isPinned && <span className="mr-1.5" aria-label="고정">📌</span>}
                    {n.title}
                  </h2>
                  <time className="shrink-0 text-xs text-zinc-400 mt-1.5">{formatDate(n.createdAt)}</time>
                </div>
                <div className="text-[15px] text-zinc-700">
                  <NoticeContent content={n.content} imageUrls={n.imageUrls} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
