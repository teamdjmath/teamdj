'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ReportCard } from '../../_components/report-card'
import { saveBatchReports } from '@/lib/actions/reports'
import type { ReportContent } from '@/lib/actions/reports'
import type { ReportCardData } from '../../_components/report-card'

type ClassOption = { id: string; name: string }
type StudentData = {
  id: string
  name: string
  attendance: 'present' | 'late' | 'absent' | null
  recentScore: { score: number; title: string; examType: string; date: string } | null
  avgAssignmentPct: number
}
type Attendance = 'present' | 'late' | 'absent' | ''

interface Props {
  classOptions: ClassOption[]
  students: StudentData[]
  selectedClassId: string | null
  selectedSessionDate: string | null
  className: string
}

const TODAY = new Date().toISOString().split('T')[0]

export function ReportFormClient({
  classOptions,
  students,
  selectedClassId,
  selectedSessionDate,
  className,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [common, setCommon] = useState({ studyContent: '', homework: '', announcement: '' })
  const [perStudent, setPerStudent] = useState<Record<string, { att: Attendance; notes: string }>>(
    () => Object.fromEntries(
      students.map((s) => [s.id, { att: (s.attendance ?? '') as Attendance, notes: '' }]),
    ),
  )
  const [progress, setProgress] = useState<{ cur: number; total: number } | null>(null)
  const [done, setDone] = useState<number | null>(null)
  const [err, setErr] = useState('')

  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  function nav(classId: string, date: string) {
    const p = new URLSearchParams()
    if (classId) p.set('classId', classId)
    if (date) p.set('sessionDate', date)
    router.push(`/admin/reports/new?${p.toString()}`)
  }

  function buildCardData(s: StudentData): ReportCardData {
    const sd = perStudent[s.id] ?? { att: (s.attendance ?? '') as Attendance, notes: '' }
    return {
      studentName: s.name,
      className,
      reportDate: selectedSessionDate ?? TODAY,
      content: {
        studyContent:     common.studyContent    ?? '',
        homework:         common.homework        ?? '',
        announcement:     common.announcement    ?? '',
        notes:            sd.notes               ?? '',
        todayAttendance:  (sd.att || null) as ReportContent['todayAttendance'],
        recentScore:      s.recentScore,
        avgAssignmentPct: s.avgAssignmentPct,
      },
    }
  }

  async function handleSave() {
    if (!selectedClassId || !selectedSessionDate) { setErr('분반과 날짜를 선택하세요.'); return }
    if (!common.studyContent.trim()) { setErr('이번 시간 학습 내용을 입력하세요.'); return }
    if (students.length === 0) { setErr('소속 학생이 없습니다.'); return }
    setErr('')
    setDone(null)
    setProgress({ cur: 0, total: students.length })

    try {
      const { toPng } = await import('html-to-image')
      const items: Parameters<typeof saveBatchReports>[0] = []

      for (let i = 0; i < students.length; i++) {
        const s = students[i]
        setProgress({ cur: i + 1, total: students.length })

        const el = cardRefs.current.get(s.id)
        if (!el) continue

        const imageBase64 = await toPng(el, { quality: 1, pixelRatio: 2, backgroundColor: '#ffffff' })
        const sd = perStudent[s.id] ?? { att: '', notes: '' }

        items.push({
          classId:     selectedClassId,
          studentId:   s.id,
          sessionDate: selectedSessionDate,
          contentJson: {
            studyContent:     common.studyContent,
            homework:         common.homework,
            announcement:     common.announcement,
            notes:            sd.notes,
            todayAttendance:  (sd.att || null) as ReportContent['todayAttendance'],
            recentScore:      s.recentScore,
            avgAssignmentPct: s.avgAssignmentPct,
          },
          imageBase64,
        })
      }

      startTransition(async () => {
        const result = await saveBatchReports(items)
        setProgress(null)
        if (result.error) { setErr(result.error); return }
        setDone(result.saved)
      })
    } catch (e) {
      setProgress(null)
      setErr(e instanceof Error ? e.message : '이미지 생성 실패')
    }
  }

  const showForm = !!(selectedClassId && selectedSessionDate)

  return (
    <div className="space-y-6">
      {/* 분반 + 날짜 선택 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-600">분반 *</label>
          <select
            value={selectedClassId ?? ''}
            onChange={(e) => nav(e.target.value, selectedSessionDate ?? '')}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
          >
            <option value="">선택하세요</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-600">수업 날짜 *</label>
          <input
            type="date"
            value={selectedSessionDate ?? ''}
            onChange={(e) => nav(selectedClassId ?? '', e.target.value)}
            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 focus:border-zinc-400 focus:outline-none"
          />
        </div>
      </div>

      {!showForm && (
        <p className="text-center text-sm text-zinc-400 py-10">분반과 날짜를 선택하면 입력 폼이 표시됩니다.</p>
      )}

      {showForm && (
        <>
          {/* 공통 입력 */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900">공통 내용</h2>
            {[
              { key: 'studyContent', label: '이번 시간 학습 내용', required: true, placeholder: '예: 수열과 급수 — 등차수열 개념 학습' },
              { key: 'homework',     label: '다음 시간 과제',       required: false, placeholder: '예: 교재 p.52 1~15번' },
              { key: 'announcement', label: '공지사항',             required: false, placeholder: '예: 다음 주 금요일 모의고사 예정' },
            ].map(({ key, label, required, placeholder }) => (
              <div key={key}>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">
                  {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
                <textarea
                  rows={key === 'studyContent' ? 3 : 2}
                  value={common[key as keyof typeof common]}
                  onChange={(e) => setCommon((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm resize-none focus:border-zinc-400 focus:bg-white focus:outline-none"
                />
              </div>
            ))}
          </div>

          {/* 학생별 입력 */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
            <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  학생별 입력 <span className="text-zinc-400 font-normal">({students.length}명)</span>
                </h2>
                {students.some((s) => s.attendance !== null) && (
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    출석부에서 당일 출석 현황 자동 로드됨 · 직접 수정 가능
                  </p>
                )}
                {students.length > 0 && students.every((s) => s.attendance === null) && (
                  <p className="text-[10px] text-amber-500 mt-0.5">
                    이 날짜의 출석 기록이 없습니다. 직접 입력하세요.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() =>
                  setPerStudent((prev) =>
                    Object.fromEntries(
                      Object.entries(prev).map(([id, v]) => [id, { ...v, att: 'present' }]),
                    ),
                  )
                }
                className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors shrink-0"
              >
                전체 출석 처리
              </button>
            </div>
            {students.length === 0 ? (
              <p className="py-10 text-center text-sm text-zinc-400">소속 학생이 없습니다.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-zinc-500">이름</th>
                    <th className="px-5 py-2.5 text-center text-xs font-semibold text-zinc-500">출석</th>
                    <th className="px-5 py-2.5 text-center text-xs font-semibold text-zinc-500 hidden sm:table-cell">최근 점수</th>
                    <th className="px-5 py-2.5 text-center text-xs font-semibold text-zinc-500 hidden sm:table-cell">과제율</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-zinc-500">특이사항</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {students.map((s) => {
                    const sd = perStudent[s.id] ?? { att: '', notes: '' }
                    return (
                      <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-5 py-2.5 font-medium text-zinc-900">{s.name}</td>
                        <td className="px-5 py-2.5 text-center">
                          <select
                            value={sd.att}
                            onChange={(e) =>
                              setPerStudent((p) => ({
                                ...p,
                                [s.id]: { ...p[s.id]!, att: e.target.value as Attendance },
                              }))
                            }
                            className={`rounded-lg border px-2 py-1 text-xs font-medium focus:outline-none ${
                              sd.att === 'present'
                                ? 'border-zinc-900 bg-zinc-900 text-white'
                                : sd.att === 'late'
                                  ? 'border-amber-400 bg-amber-50 text-amber-700'
                                  : sd.att === 'absent'
                                    ? 'border-red-300 bg-red-50 text-red-600'
                                    : 'border-zinc-200 bg-zinc-50 text-zinc-400'
                            }`}
                          >
                            <option value="">—</option>
                            <option value="present">출석</option>
                            <option value="late">지각</option>
                            <option value="absent">결석</option>
                          </select>
                        </td>
                        <td className="hidden sm:table-cell px-5 py-2.5 text-center text-xs text-zinc-500">
                          {s.recentScore ? `${Math.round(s.recentScore.score)}점` : '—'}
                        </td>
                        <td className="hidden sm:table-cell px-5 py-2.5 text-center text-xs text-zinc-500">
                          {s.avgAssignmentPct}%
                        </td>
                        <td className="px-5 py-2.5">
                          <input
                            type="text"
                            value={sd.notes}
                            onChange={(e) =>
                              setPerStudent((p) => ({
                                ...p,
                                [s.id]: { ...p[s.id]!, notes: e.target.value },
                              }))
                            }
                            placeholder="특이사항 (선택)"
                            className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs focus:border-zinc-400 focus:outline-none"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {err && <p className="text-sm text-red-500">{err}</p>}

          {progress && (
            <div className="rounded-xl border border-zinc-200 bg-white p-5 text-center space-y-3">
              <p className="text-sm font-medium text-zinc-700">
                이미지 생성 중… {progress.cur} / {progress.total}명
              </p>
              <div className="h-1.5 w-full rounded-full bg-zinc-100">
                <div
                  className="h-1.5 rounded-full bg-zinc-950 transition-all"
                  style={{ width: `${(progress.cur / progress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {done !== null && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-center space-y-3">
              <p className="text-sm font-semibold text-zinc-900">
                ✓ {done}명 리포트 저장 완료
              </p>
              <button
                type="button"
                onClick={() => router.push('/admin/reports')}
                className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
              >
                리포트 목록 보기
              </button>
            </div>
          )}

          {done === null && !progress && (
            <button
              type="button"
              onClick={handleSave}
              disabled={pending}
              className="w-full rounded-xl bg-zinc-950 py-3 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {pending ? '저장 중…' : `${students.length}명 리포트 일괄 저장`}
            </button>
          )}

          {/* 숨겨진 캡처용 카드 */}
          {students.map((s) => (
            <div
              key={s.id}
              ref={(el) => {
                if (el) cardRefs.current.set(s.id, el)
                else cardRefs.current.delete(s.id)
              }}
              style={{ position: 'fixed', top: -9999, left: -9999, pointerEvents: 'none' }}
              aria-hidden="true"
            >
              <ReportCard data={buildCardData(s)} />
            </div>
          ))}
        </>
      )}
    </div>
  )
}
