'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { sendBatchKakaoReports, deleteReport } from '@/lib/actions/reports'

type StudentReport = {
  id: string
  imageUrl: string | null
  kakaoSentAt: string | null
  studentName: string
}

interface Props {
  classId: string
  date: string
  sessionLabel: string
  reports: StudentReport[]
}

export function SessionClient({ classId, date, sessionLabel, reports }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [batchResult, setBatchResult] = useState('')
  const [batchErr, setBatchErr] = useState('')

  function handleBatchSend() {
    if (!confirm(`${sessionLabel} 리포트를 전체 학부모에게 카카오톡으로 발송하시겠습니까?`)) return
    setBatchResult('')
    setBatchErr('')
    startTransition(async () => {
      const res = await sendBatchKakaoReports(classId, date)
      if (res.error && res.sent === 0) {
        setBatchErr(res.error)
      } else {
        setBatchResult(`${res.sent}명 발송 완료${res.failed > 0 ? ` · ${res.failed}명 실패` : ''}`)
        router.refresh()
      }
    })
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`${name} (${date}) 리포트를 삭제하시겠습니까?\n저장된 이미지도 함께 삭제됩니다.`)) return
    startTransition(async () => {
      const result = await deleteReport(id)
      if (result.error) alert(result.error)
      else router.refresh()
    })
  }

  const sentCount = reports.filter((r) => r.kakaoSentAt).length
  const allSent   = sentCount === reports.length && reports.length > 0

  return (
    <div className="space-y-5">
      {/* 전체 발송 카드 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-zinc-900">카카오톡 전체 발송</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {sentCount > 0
              ? `${sentCount}/${reports.length}명 발송 완료`
              : `${reports.length}명 미발송`}
          </p>
          {batchErr && <p className="mt-1.5 text-xs text-red-500">{batchErr}</p>}
          {batchResult && <p className="mt-1.5 text-xs font-medium text-zinc-700">✓ {batchResult}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/reports/new?classId=${classId}&sessionDate=${date}`}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100 hover:border-zinc-300 transition-all active:scale-95 shadow-sm"
          >
            리포트 수정
          </Link>
          <button
            type="button"
            onClick={handleBatchSend}
            disabled={pending || reports.length === 0}
            className={[
              'shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-all active:scale-95 disabled:opacity-50',
              allSent
                ? 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                : 'bg-zinc-950 text-white hover:bg-zinc-800',
            ].join(' ')}
          >
            {pending ? '발송 중…' : allSent ? '전체 재발송' : '전체 발송'}
          </button>
        </div>
      </div>

      {/* 학생별 리포트 그리드 */}
      {reports.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center text-sm text-zinc-400">
          리포트가 없습니다.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((r) => (
            <div
              key={r.id}
              className="rounded-xl border border-zinc-200 bg-white overflow-hidden hover:border-zinc-300 hover:shadow-sm transition-all"
            >
              {/* 썸네일 */}
              <Link href={`/admin/reports/${r.id}`} className="block">
                <div className="aspect-4/3 bg-zinc-100 overflow-hidden">
                  {r.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.imageUrl}
                      alt="리포트 이미지"
                      className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-10 h-10 text-zinc-300" fill="none" stroke="currentColor" strokeWidth={1} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5.586a1 1 0 0 1 .707.293l5.414 5.414a1 1 0 0 1 .293.707V19a2 2 0 0 1-2 2z" />
                      </svg>
                    </div>
                  )}
                </div>
              </Link>

              {/* 정보 + 액션 */}
              <div className="p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="font-semibold text-sm text-zinc-900">{r.studentName || '(학생 없음)'}</p>
                  {r.kakaoSentAt ? (
                    <span className="shrink-0 rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-medium text-white">발송 완료</span>
                  ) : (
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">미발송</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Link
                    href={`/admin/reports/${r.id}`}
                    className="text-zinc-500 hover:text-zinc-900 transition-colors"
                  >
                    상세 / 개별 발송
                  </Link>
                  <span className="text-zinc-200">|</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id, r.studentName)}
                    disabled={pending}
                    className="text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
