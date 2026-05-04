'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'

type ClassOption = { id: string; name: string }
type Session = {
  classId: string
  className: string
  date: string
  total: number
  sentCount: number
  sampleImageUrl: string | null
}

interface Props {
  classOptions: ClassOption[]
  selectedClassId: string | null
  selectedDate: string | null
  sessions: Session[]
}

function fmtDate(iso: string) {
  const [, mm, dd] = iso.split('-')
  return `${mm}.${dd}`
}

export function ReportsClient({ classOptions, selectedClassId, selectedDate, sessions }: Props) {
  const router = useRouter()

  function nav(classId: string, date: string) {
    const p = new URLSearchParams()
    if (classId) p.set('classId', classId)
    if (date)    p.set('date', date)
    router.push(`/admin/reports?${p.toString()}`)
  }

  return (
    <>
      {/* 필터 */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => nav('', selectedDate ?? '')}
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
              onClick={() => nav(c.id, selectedDate ?? '')}
              className={[
                'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                selectedClassId === c.id ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
              ].join(' ')}
            >
              {c.name}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={selectedDate ?? ''}
          onChange={(e) => nav(selectedClassId ?? '', e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-700 focus:outline-none focus:border-zinc-400"
        />
        {(selectedClassId || selectedDate) && (
          <button
            onClick={() => nav('', '')}
            className="rounded-full px-3.5 py-1.5 text-xs font-medium text-zinc-500 bg-zinc-100 hover:bg-zinc-200 transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* 세션 목록 */}
      {sessions.length === 0 ? (
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
          {sessions.map((s) => (
            <Link
              key={`${s.date}__${s.classId}`}
              href={`/admin/reports/session/${s.classId}/${s.date}`}
              className="group rounded-xl border border-zinc-200 bg-white overflow-hidden hover:border-zinc-300 hover:shadow-sm transition-all"
            >
              {/* 썸네일 */}
              <div className="aspect-4/3 bg-zinc-100 overflow-hidden relative">
                {s.sampleImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.sampleImageUrl}
                    alt="리포트 썸네일"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-zinc-300" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                    </svg>
                  </div>
                )}
                <div className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
                  {s.total}명
                </div>
              </div>

              {/* 정보 */}
              <div className="p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm text-zinc-900">{fmtDate(s.date)} · {s.className}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{s.date}</p>
                  </div>
                  {s.sentCount === s.total && s.total > 0 ? (
                    <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white">
                      전체 발송 완료
                    </span>
                  ) : s.sentCount > 0 ? (
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600">
                      {s.sentCount}/{s.total} 발송
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                      미발송
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
