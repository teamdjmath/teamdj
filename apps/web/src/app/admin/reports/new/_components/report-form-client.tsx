'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReportCard } from '../../_components/report-card'
import { saveReport } from '@/lib/actions/reports'
import { InputField, SelectField, TextareaField } from '@/components/ui/form-field'
import type { ReportContent } from '@/lib/actions/reports'
import type { ReportCardData } from '../../_components/report-card'

type ClassOption = { id: string; name: string }
type TestOption  = { id: string; title: string; date: string }

type StudentData = {
  id: string
  name: string
  school: string
  grade: string
  attendance: 'present' | 'late' | 'absent' | null
  absenceReason: string
  scores: Record<string, {
    score: number
    title: string
    examType: string
    date: string
    totalQ?: number
    objQ?: number
    subjQ?: number
    difficulty?: string
    classAverage?: number
  }>
  assignments: Array<{ title: string; completionPct: number }>
  avgAssignmentPct: number
  initialNotes?: string
}

type Attendance = 'present' | 'late' | 'absent' | ''

interface Props {
  classOptions: ClassOption[]
  testOptions:  TestOption[]
  students:     StudentData[]
  selectedClassId: string | null
  selectedSessionDate: string | null
  className: string
  initialCommon?: { studyContent: string; homework: string; announcement: string } | null
}

const TODAY = new Date().toISOString().split('T')[0]

export function ReportFormClient({
  classOptions,
  testOptions,
  students,
  selectedClassId,
  selectedSessionDate,
  className,
  initialCommon,
}: Props) {
  const router = useRouter()

  // 1. 공통 정보
  const [common, setCommon] = useState(
    initialCommon ?? { studyContent: '', homework: '', announcement: '' },
  )

  // 2. 메인 테스트 선택 (가장 최근 것 기본값)
  const [selectedTestId, setSelectedTestId] = useState<string>(() => testOptions[0]?.id ?? '')

  // 3. 학생별 개별 정보 (출결, 특이사항)
  const [perStudent, setPerStudent] = useState<Record<string, { att: Attendance; notes: string }>>(
    () => Object.fromEntries(
      students.map((s) => [
        s.id,
        { att: (s.attendance ?? '') as Attendance, notes: s.initialNotes ?? '' },
      ]),
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
    const testScore = selectedTestId ? s.scores[selectedTestId] : null
    const assignmentDetails = s.assignments
      .map(a => `${a.title}(${a.completionPct}%)`)
      .join(', ')

    return {
      studentName: s.name,
      className,
      reportDate: selectedSessionDate ?? TODAY,
      school: s.school,
      grade: s.grade,
      content: {
        studyContent:     common.studyContent    ?? '',
        homework:         common.homework        ?? '',
        announcement:     common.announcement    ?? '',
        notes:            sd.notes               ?? '',
        todayAttendance:  (sd.att || null) as ReportContent['todayAttendance'],
        recentScore:      testScore ?? null,
        avgAssignmentPct: s.avgAssignmentPct,
        absenceReason:    s.absenceReason,
        lastAssignmentTitle: assignmentDetails,
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
      let savedCount = 0

      // 1. 예열
      const firstId = students[0].id
      const firstEl = cardRefs.current.get(firstId)
      if (firstEl) {
        try {
          await toPng(firstEl, { backgroundColor: '#ffffff', pixelRatio: 1, skipFonts: true })
          await new Promise((r) => setTimeout(r, 300))
        } catch (e) { console.warn('Warm-up failed', e) }
      }

      for (let i = 0; i < students.length; i++) {
        const s = students[i]
        setProgress({ cur: i + 1, total: students.length })

        const el = cardRefs.current.get(s.id)
        if (!el) continue

        await new Promise((r) => setTimeout(r, 200))

        try {
          const imageBase64 = await toPng(el, {
            backgroundColor: '#ffffff',
            pixelRatio: 2,
            cacheBust: true,
            filter: (node: Node) => {
              const el = node as HTMLElement
              if (el.tagName === 'LINK' && el.getAttribute('rel') === 'stylesheet') {
                const href = el.getAttribute('href')
                if (href?.includes('pretendard') || href?.includes('google')) return true
                return false
              }
              return true
            }
          })

          const res = await saveReport({
            classId:     selectedClassId,
            studentId:   s.id,
            reportDate:  selectedSessionDate,
            contentJson: buildCardData(s).content,
            imageBase64,
          })
          if (res.error) console.error(`Save failed for ${s.name}:`, res.error)
          else savedCount++

        } catch (captureErr) {
          console.error(`Capture failed for ${s.name}:`, captureErr)
          await new Promise((r) => setTimeout(r, 500))
          const retryUrl = await toPng(el, { backgroundColor: '#ffffff', pixelRatio: 1.5, skipFonts: true })
          
          const res = await saveReport({
            classId:     selectedClassId,
            studentId:   s.id,
            reportDate:  selectedSessionDate,
            contentJson: buildCardData(s).content,
            imageBase64: retryUrl,
          })
          if (!res.error) savedCount++
        }
      }

      setDone(savedCount)
      setProgress(null)
    } catch (e) {
      console.error('Report saving error:', e)
      setProgress(null)
      setErr(e instanceof Error ? e.message : '이미지 생성 및 저장 중 오류가 발생했습니다.')
    }
  }

  const showForm = !!(selectedClassId && selectedSessionDate)

  return (
    <div className="space-y-6">
      {/* 분반 + 날짜 선택 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 shadow-sm">
        <SelectField
          label="분반"
          required
          value={selectedClassId ?? ''}
          onChange={(e) => nav(e.target.value, selectedSessionDate ?? '')}
        >
          <option value="">선택하세요</option>
          {classOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </SelectField>
        <InputField
          label="수업 날짜"
          type="date"
          required
          value={selectedSessionDate ?? ''}
          onChange={(e) => nav(selectedClassId ?? '', e.target.value)}
        />
      </div>

      {!showForm && (
        <p className="text-center text-sm text-zinc-400 py-10">분반과 날짜를 선택하면 입력 폼이 표시됩니다.</p>
      )}

      {showForm && (
        <>
          {/* 공통 입력 및 테스트 선택 */}
          <div className="rounded-xl border border-zinc-200 bg-white p-6 space-y-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-900">리포트 설정</h2>
              <div className="flex items-center gap-3">
                <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">리포트 표시 테스트</label>
                <select
                  value={selectedTestId}
                  onChange={(e) => setSelectedTestId(e.target.value)}
                  className="min-w-[200px] rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-bold text-zinc-900 shadow-sm transition-all focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 cursor-pointer appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2371717a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                >
                  <option value="">테스트 없음</option>
                  {testOptions.map((t) => (
                    <option key={t.id} value={t.id}>{t.title} ({t.date})</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-6">
              <TextareaField
                label="이번 시간 학습 내용"
                required
                rows={3}
                value={common.studyContent}
                onChange={(e) => setCommon((f) => ({ ...f, studyContent: e.target.value }))}
                placeholder="예: 수열과 급수 — 등차수열 개념 학습"
              />
              <TextareaField
                label="다음 시간 과제"
                rows={2}
                value={common.homework}
                onChange={(e) => setCommon((f) => ({ ...f, homework: e.target.value }))}
                placeholder="예: 교재 p.52 1~15번"
              />
              <TextareaField
                label="공지사항"
                rows={2}
                value={common.announcement}
                onChange={(e) => setCommon((f) => ({ ...f, announcement: e.target.value }))}
                placeholder="예: 다음 주 금요일 모의고사 예정"
              />
            </div>
          </div>

          {/* 학생별 입력 */}
          <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-5 py-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">
                  학생별 상세 <span className="text-zinc-400 font-normal">({students.length}명)</span>
                </h2>
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
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/30">
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase text-zinc-400">이름</th>
                    <th className="px-5 py-3 text-center text-[11px] font-bold uppercase text-zinc-400">출석</th>
                    <th className="px-5 py-3 text-center text-[11px] font-bold uppercase text-zinc-400">테스트 점수</th>
                    <th className="px-5 py-3 text-left text-[11px] font-bold uppercase text-zinc-400">특이사항</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {students.map((s) => {
                    const sd = perStudent[s.id] ?? { att: '', notes: '' }
                    const score = selectedTestId ? s.scores[selectedTestId]?.score : null
                    return (
                      <tr key={s.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-5 py-4">
                          <span className="font-semibold text-zinc-900">{s.name}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <select
                            value={sd.att}
                            onChange={(e) =>
                              setPerStudent((p) => ({
                                ...p,
                                [s.id]: { ...p[s.id]!, att: e.target.value as Attendance },
                              }))
                            }
                            className={`min-w-[80px] rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all focus:outline-none ${
                              sd.att === 'present' ? 'bg-zinc-900 text-white border-zinc-900' :
                              sd.att === 'late'    ? 'bg-amber-500 text-white border-amber-500' :
                              sd.att === 'absent'  ? 'bg-red-500 text-white border-red-500' :
                              'bg-white text-zinc-400 border-zinc-200'
                            }`}
                          >
                            <option value="">미입력</option>
                            <option value="present">출석</option>
                            <option value="late">지각</option>
                            <option value="absent">결석</option>
                          </select>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`text-sm font-bold ${score === null ? 'text-zinc-300' : 'text-zinc-900'}`}>
                            {score !== null ? `${score}점` : '—'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <input
                            type="text"
                            value={sd.notes}
                            onChange={(e) =>
                              setPerStudent((p) => ({
                                ...p,
                                [s.id]: { ...p[s.id]!, notes: e.target.value },
                              }))
                            }
                            placeholder="특이사항 입력..."
                                                         className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none transition-all shadow-sm"

                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 저장 및 진행바 */}
          <div className="sticky bottom-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-xl flex items-center justify-between">
            <div>
              {progress ? (
                <div className="flex items-center gap-3">
                  <div className="h-2 w-48 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full bg-zinc-900 transition-all duration-300"
                      style={{ width: `${(progress.cur / progress.total) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-zinc-500">{progress.cur} / {progress.total}명 완료</span>
                </div>
              ) : done !== null ? (
                <p className="text-sm font-medium text-zinc-900">✓ {done}명의 리포트가 생성되었습니다.</p>
              ) : err ? (
                <p className="text-sm font-medium text-red-500">{err}</p>
              ) : (
                <p className="text-sm text-zinc-500">리포트 내용을 모두 확인하셨나요?</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={!!progress || students.length === 0}
              className="rounded-lg bg-zinc-950 px-8 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-all disabled:opacity-50"
            >
              {progress ? '생성 중...' : '리포트 일괄 생성'}
            </button>
          </div>
        </>
      )}

      {/* 미리보기 (실제 캡처용 숨김 렌더링) */}
      <div className="fixed left-[-2000px] top-0 pointer-events-none opacity-0">
        {students.map((s) => (
          <div key={s.id} ref={(el) => { if (el) cardRefs.current.set(s.id, el) }}>
            <ReportCard data={buildCardData(s)} />
          </div>
        ))}
      </div>
    </div>
  )
}
