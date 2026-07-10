import type { Metadata } from 'next'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { LandingNav } from '@/components/landing/landing-nav'
import { SiteFooter } from '@/components/landing/site-footer'

export const metadata: Metadata = {
  title: '공지사항 | TeamDJ',
  description: 'TeamDJ 학원 공지사항 — 수업 일정, 학부모 안내, 특강 소식',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

// 로그인 없이 보는 공개 공지 목록 — 제목·등록일만 표시, 본문은 상세 페이지에서
export default async function PublicNoticesPage() {
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (admin as any)
    .from('notices')
    .select('id, title, is_pinned, created_at')
    .eq('is_public', true)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notices = ((rows ?? []) as any[]).map((n) => ({
    id: n.id as string,
    title: n.title as string,
    isPinned: (n.is_pinned ?? false) as boolean,
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
          <div className="divide-y divide-zinc-100 border-t-2 border-zinc-950">
            {notices.map((n) => (
              <Link
                key={n.id}
                href={`/notices/${n.id}`}
                className="group flex items-center justify-between gap-4 py-5 px-1 hover:bg-zinc-50 transition-colors"
              >
                <span className="font-medium text-zinc-900 group-hover:text-zinc-950 break-keep">
                  {n.isPinned && <span className="mr-1.5" aria-label="고정">📌</span>}
                  {n.title}
                </span>
                <time className="shrink-0 text-sm text-zinc-400">{formatDate(n.createdAt)}</time>
              </Link>
            ))}
          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
