import Link from 'next/link'
import { ConsultationForm } from './_components/consultation-form'

export const metadata = {
  title: '상담 신청 | TeamDJ',
  description: '수업 관련 문의, 수강 신청, 학습 상담 등 궁금한 점을 남겨주세요.',
}

export default function ConsultationPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 심플 헤더 */}
      <header className="border-b border-zinc-100 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <Link href="/" className="text-sm font-black tracking-tighter text-zinc-950 uppercase italic">
            TeamDJ
          </Link>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors">
            ← 홈으로
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-12">
        {/* 안내 섹션 */}
        <div className="mb-10">
          <h1 className="text-3xl font-black tracking-tight text-zinc-950">상담 신청</h1>
          <p className="mt-3 text-base text-zinc-600 leading-relaxed">
            수업 관련 문의, 수강 신청, 학습 상담 등 궁금한 점을 남겨주세요.
            <br />
            빠른 시일 내에 연락드리겠습니다.
          </p>

          <div className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50 px-6 py-5 space-y-3">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-zinc-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold text-zinc-700">상담 가능 시간</p>
                <p className="mt-0.5 text-sm text-zinc-600">평일 오후 2시 ~ 오후 10시</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-zinc-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold text-zinc-700">연락 방법</p>
                <p className="mt-0.5 text-sm text-zinc-600">아래 양식 제출 후 문자 또는 전화로 연락드립니다.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-zinc-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                </svg>
              </span>
              <div>
                <p className="text-xs font-semibold text-zinc-700">상담 유형</p>
                <p className="mt-0.5 text-sm text-zinc-600">수강 신청, 커리큘럼 안내, 학습 방향 상담 등</p>
              </div>
            </div>
          </div>
        </div>

        {/* 상담 신청 폼 */}
        <ConsultationForm />
      </main>
    </div>
  )
}
