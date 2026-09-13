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
  selectedReportType: string | null
  sessions: Session[]
}

const REPORT_TYPE_OPTIONS = [
  { value: '', label: '전체 유형' },
  { value: 'learning', label: '학습 리포트' },
  { value: 'clinic', label: '클리닉 리포트' },
  { value: 'exam_prep', label: '내신대비 리포트' },
] as const

function fmtDate(iso?: string) {
  if (!iso || !iso.includes('-')) return iso || ''
  const parts = iso.split('-')
  if (parts.length < 3) return iso
  const [, mm, dd] = parts
  return `${mm}.${dd}`
}

export function ReportsClient({ classOptions, selectedClassId, selectedDate, selectedReportType, sessions }: Props) {
  const router = useRouter()

  function nav(classId: string, date: string, reportType: string) {
    const p = new URLSearchParams()
    if (classId)    p.set('classId', classId)
    if (date)       p.set('date', date)
    if (reportType) p.set('reportType', reportType)
    router.push(`/admin/reports?${p.toString()}`)
  }

  // 클리닉/내신대비는 분반이 없는 리포트라 분반 필터가 의미 없음 — 그 유형을 고르면 분반 선택은 비활성화
  const classFilterDisabled = selectedReportType === 'clinic' || selectedReportType === 'exam_prep'

  return (
    <>
      {/* 필터 */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">리포트 유형</label>
          <select
            value={selectedReportType ?? ''}
            onChange={(e) => nav(e.target.value === 'clinic' || e.target.value === 'exam_prep' ? '' : (selectedClassId ?? ''), selectedDate ?? '', e.target.value)}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
          >
            {REPORT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 max-w-xs space-y-1.5">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">분반</label>
          <select
            value={selectedClassId ?? ''}
            disabled={classFilterDisabled}
            onChange={(e) => nav(e.target.value, selectedDate ?? '', selectedReportType ?? '')}
            className="w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">전체 분반</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400">날짜</label>
          <input
            type="date"
            value={selectedDate ?? ''}
            onChange={(e) => nav(selectedClassId ?? '', e.target.value, selectedReportType ?? '')}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:border-zinc-400 dark:focus:border-zinc-600 focus:outline-none"
          />
        </div>
        {(selectedClassId || selectedDate || selectedReportType) && (
          <button
            onClick={() => nav('', '', '')}
            className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-sm text-zinc-500 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors whitespace-nowrap"
          >
            초기화
          </button>
        )}
      </div>

      {/* 세션 목록 */}
      {sessions.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-20 text-center">
          <p className="text-sm text-zinc-400 dark:text-zinc-600 mb-4">작성된 리포트가 없습니다.</p>
          <Link
            href="/admin/reports/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 dark:bg-zinc-50 px-4 py-2 text-sm font-medium text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            첫 리포트 작성하기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((s) => (
            <Link
              key={`${s.date}__${s.classId}`}
              href={s.classId === 'clinic'
                ? `/admin/reports/clinic/session/${s.date}`
                : s.classId === 'exam_prep'
                ? `/admin/reports/exam-prep/session/${s.date}`
                : `/admin/reports/session/${s.classId}/${s.date}`}
              className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all"
            >
              {/* 썸네일 */}
              <div className="aspect-4/3 bg-zinc-100 dark:bg-zinc-900 overflow-hidden relative">
                {s.sampleImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.sampleImageUrl}
                    alt="리포트 썸네일"
                    className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-zinc-300 dark:text-zinc-700" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
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
                    <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">{fmtDate(s.date)} · {s.className}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-600 mt-0.5">{s.date}</p>
                  </div>
                  {s.sentCount === s.total && s.total > 0 ? (
                    <span className="shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-white dark:text-zinc-900">
                      전체 발송 완료
                    </span>
                  ) : s.sentCount > 0 ? (
                    <span className="shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400">
                      {s.sentCount}/{s.total} 발송
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:text-zinc-500">
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
