'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ClassOption = { id: string; name: string }
type Report = {
  id: string
  report_date: string
  image_url: string | null
  kakao_sent_at: string | null
  created_at: string
  studentName: string
  className: string
}

interface Props {
  classOptions: ClassOption[]
  selectedClassId: string | null
  reports: Report[]
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

export function ReportsClient({ classOptions, selectedClassId, reports }: Props) {
  const router = useRouter()

  return (
    <>
      {/* 분반 필터 */}
      <div className="mb-6 flex flex-wrap gap-2">
        <button
          onClick={() => router.push('/admin/reports')}
          className={[
            'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
            !selectedClassId ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
          ].join(' ')}
        >
          전체
        </button>
        {classOptions.map((c) => (
          <button
            key={c.id}
            onClick={() => router.push(`/admin/reports?classId=${c.id}`)}
            className={[
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              selectedClassId === c.id ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
            ].join(' ')}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* 리포트 목록 */}
      {reports.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-20 text-center">
          <p className="text-sm text-zinc-400 mb-4">작성된 리포트가 없습니다.</p>
          <Link
            href="/admin/reports/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            첫 리포트 작성하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <Link
              key={r.id}
              href={`/admin/reports/${r.id}`}
              className="group rounded-xl border border-zinc-200 bg-white overflow-hidden hover:border-zinc-400 hover:shadow-sm transition-all"
            >
              {/* 썸네일 */}
              <div className="aspect-[4/3] bg-zinc-100 overflow-hidden">
                {r.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.image_url}
                    alt="리포트 이미지"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-zinc-300" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                    </svg>
                  </div>
                )}
              </div>

              {/* 정보 */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm text-zinc-900">{r.studentName}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{r.className} · {r.report_date}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {r.kakao_sent_at ? (
                      <span className="rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white">
                        발송 완료
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                        미발송
                      </span>
                    )}
                  </div>
                </div>
                {r.kakao_sent_at && (
                  <p className="mt-1 text-[10px] text-zinc-400">{formatDate(r.kakao_sent_at)} 발송</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
