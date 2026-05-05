'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { sendKakaoReport } from '@/lib/actions/reports'
import { ReportCard } from '../../_components/report-card'
import type { ReportContent } from '@/lib/actions/reports'

type Report = {
  id: string
  report_date: string
  image_url: string | null
  kakao_sent_at: string | null
  content_json: ReportContent
  created_at: string
  updated_at: string
  studentName: string
  school: string
  grade: string
  className: string
}

interface Props {
  report: Report
}

function formatDatetime(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function ReportDetailClient({ report }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [kakaoResult, setKakaoResult] = useState('')
  const [kakaoErr, setKakaoErr] = useState('')

  function handleSendKakao() {
    setKakaoResult('')
    setKakaoErr('')
    startTransition(async () => {
      const res = await sendKakaoReport(report.id)
      if (res.error) {
        setKakaoErr(res.error)
      } else {
        setKakaoResult(`${res.sentCount}명에게 발송 완료`)
        router.refresh()
      }
    })
  }

  const cardData = {
    studentName: report.studentName,
    school:      report.school,
    grade:       report.grade,
    className:   report.className,
    reportDate:  report.report_date,
    content:     report.content_json,
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[480px_1fr] gap-6">
      {/* 리포트 이미지 / 재렌더링 */}
      <div>
        {report.image_url ? (
          <div className="rounded-xl overflow-hidden border border-zinc-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={report.image_url}
              alt="학습 리포트"
              className="w-full h-auto"
            />
          </div>
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="mb-3 text-xs text-zinc-400">저장된 이미지가 없습니다. 리포트 내용으로 표시합니다.</p>
            <ReportCard data={cardData} />
          </div>
        )}
      </div>

      {/* 오른쪽: 정보 + 카카오 발송 */}
      <div className="space-y-4">
        {/* 상태 카드 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">발송 상태</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-zinc-50">
              <span className="text-sm text-zinc-500">리포트 날짜</span>
              <span className="text-sm font-medium text-zinc-900">{report.report_date}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-zinc-50">
              <span className="text-sm text-zinc-500">작성 일시</span>
              <span className="text-sm text-zinc-700">{formatDatetime(report.updated_at || report.created_at)}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-zinc-500">카카오톡 발송</span>
              {report.kakao_sent_at ? (
                <div className="text-right">
                  <span className="rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white">
                    발송 완료
                  </span>
                  <p className="mt-1 text-xs text-zinc-400">{formatDatetime(report.kakao_sent_at)}</p>
                </div>
              ) : (
                <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-500">
                  미발송
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 카카오 발송 버튼 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">카카오톡 친구톡 발송</h2>
          <p className="mb-4 text-xs text-zinc-500 leading-relaxed">
            학부모 계정에 연결된 카카오톡으로 리포트 이미지를 발송합니다.
            {report.kakao_sent_at && ' 재발송 시 기존 발송 기록이 덮어씌워집니다.'}
          </p>

          {kakaoErr && (
            <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
              {kakaoErr}
            </div>
          )}
          {kakaoResult && (
            <div className="mb-3 rounded-lg bg-zinc-50 px-3 py-2 text-sm text-zinc-700 font-medium">
              ✓ {kakaoResult}
            </div>
          )}

          <button
            onClick={handleSendKakao}
            disabled={pending || !report.image_url}
            className={[
              'w-full rounded-lg py-2.5 text-sm font-medium transition-colors disabled:opacity-50',
              report.kakao_sent_at
                ? 'border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'
                : 'bg-zinc-950 text-white hover:bg-zinc-800',
            ].join(' ')}
          >
            {pending
              ? '발송 중...'
              : report.kakao_sent_at
              ? '카카오톡 재발송'
              : '카카오톡 발송'}
          </button>

          {!report.image_url && (
            <p className="mt-2 text-xs text-zinc-400">이미지가 없어 발송할 수 없습니다.</p>
          )}
        </div>

        {/* 리포트 내용 요약 */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-900">리포트 내용</h2>
          <div className="space-y-3 text-sm">
            {report.content_json.studyContent && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-1">📚 학습 내용</p>
                <p className="text-zinc-700 whitespace-pre-wrap text-xs leading-relaxed">{report.content_json.studyContent}</p>
              </div>
            )}
            {report.content_json.homework && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-1">📝 과제</p>
                <p className="text-zinc-700 whitespace-pre-wrap text-xs leading-relaxed">{report.content_json.homework}</p>
              </div>
            )}
            {report.content_json.notes && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-1">📌 특이사항</p>
                <p className="text-zinc-700 whitespace-pre-wrap text-xs leading-relaxed">{report.content_json.notes}</p>
              </div>
            )}
            {report.content_json.announcement && (
              <div>
                <p className="text-xs font-semibold text-zinc-400 mb-1">📢 공지사항</p>
                <p className="text-zinc-700 whitespace-pre-wrap text-xs leading-relaxed">{report.content_json.announcement}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
