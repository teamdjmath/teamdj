import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { LandingNav } from '@/components/landing/landing-nav'
import { SiteFooter } from '@/components/landing/site-footer'
import { NoticeContent } from '@/components/notice-content'

export const metadata: Metadata = {
  title: '공지사항 | TeamDJ',
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

// 공개 공지 상세 — is_public이 아닌 공지는 URL을 직접 쳐도 열리지 않는다
export default async function PublicNoticeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: notice } = await (admin as any)
    .from('notices')
    .select('id, title, content, image_urls, created_at')
    .eq('id', id)
    .eq('is_public', true)
    .maybeSingle()

  if (!notice) notFound()

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <LandingNav />

      <div className="container max-w-3xl mx-auto px-4 py-14 md:py-20 flex-1 w-full">
        <Link
          href="/notices"
          className="text-sm font-bold text-zinc-500 hover:text-zinc-950 transition-colors"
        >
          ← 공지사항 목록
        </Link>

        <h1 className="mt-8 text-2xl md:text-4xl font-black tracking-tighter text-zinc-950 break-keep">
          {notice.title as string}
        </h1>
        <time className="mt-3 block text-sm text-zinc-400 border-b border-zinc-100 pb-8">
          {formatDate(notice.created_at as string)}
        </time>

        <div className="mt-8 text-[15px] md:text-base text-zinc-700">
          <NoticeContent
            content={notice.content as string}
            imageUrls={(notice.image_urls ?? []) as string[]}
          />
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
