'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { toPng } from 'html-to-image'
import { ExamPrepReportCard, type ExamPrepStudentData, type ExamPrepHistoryEntry } from './exam-prep-report-card'
import { DatePicker } from '@/components/ui/date-picker'
import { TimeInput } from '@/components/ui/time-input'
import {
  searchStudentsByName,
  getExamPrepReportsForDate,
  getExamPrepHistoryForStudent,
  saveExamPrepReports,
  sendBatchExamPrepKakao,
  type ExamPrepContent,
} from '@/lib/actions/reports'

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type StudentHit = { id: string; name: string; school: string | null; grade: string | null }

type LoggedRow = { id: string; studentId: string; studentName: string; imageUrl: string | null; content: ExamPrepContent }

const LOGGED_PREVIEW_COUNT = 6

type FormState = {
  studentId: string
  studentName: string
  school: string
  grade: string
  arrivalTime: string
  departureTime: string
  studyContent: string
  mockExamStatus: ExamPrepContent['mockExam']['status']
  examLabel: string
  difficulty: string
  score: string
  note: string
}

function blankForm(hit: StudentHit): FormState {
  return {
    studentId: hit.id,
    studentName: hit.name,
    school: hit.school ?? '',
    grade: hit.grade ?? '',
    arrivalTime: '',
    departureTime: '',
    studyContent: '',
    mockExamStatus: 'none',
    examLabel: '',
    difficulty: '',
    score: '',
    note: '',
  }
}

function formFromLogged(row: LoggedRow): FormState {
  return {
    studentId: row.studentId,
    studentName: row.studentName,
    school: row.content.school,
    grade: row.content.grade,
    arrivalTime: row.content.arrivalTime,
    departureTime: row.content.departureTime,
    studyContent: row.content.studyContent,
    mockExamStatus: row.content.mockExam.status,
    examLabel: row.content.mockExam.examLabel ?? '',
    difficulty: row.content.mockExam.difficulty != null ? String(row.content.mockExam.difficulty) : '',
    score: row.content.mockExam.score != null ? String(row.content.mockExam.score) : '',
    note: row.content.mockExam.note ?? '',
  }
}

export function ExamPrepBuilderClient() {
  const [reportDate, setReportDate] = useState(todayString())
  // 중간/기말 내신대비 기간 구분 — 세션 전체에 적용되는 설정. 학습 내용 누적·모의고사 성적
  // 추이가 이 값으로 스코핑되어, 기말고사 기간에 중간고사 때 기록이 섞이지 않는다.
  const [examType, setExamType] = useState<ExamPrepContent['examType']>('midterm')
  const [logged, setLogged] = useState<LoggedRow[]>([])

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<StudentHit[]>([])

  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [err, setErr] = useState('')

  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState('')
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [listExpanded, setListExpanded] = useState(false)

  const [history, setHistory] = useState<ExamPrepHistoryEntry[]>([])

  const cardRef = useRef<HTMLDivElement>(null)
  const [loadPending, startLoadTransition] = useTransition()
  const [searchPending, startSearchTransition] = useTransition()
  const [historyPending, startHistoryTransition] = useTransition()

  const loadLogged = useCallback((date: string) => {
    startLoadTransition(async () => {
      const res = await getExamPrepReportsForDate(date)
      if (res.error) { setErr(res.error); return }
      setLogged(res.reports)
      setListExpanded(false)
    })
  }, [])

  useEffect(() => {
    loadLogged(reportDate)
  }, [reportDate, loadLogged])

  const loadHistory = useCallback((studentId: string, throughDate: string, type: ExamPrepContent['examType']) => {
    startHistoryTransition(async () => {
      const res = await getExamPrepHistoryForStudent(studentId, throughDate, type)
      if (!res.error) setHistory(res.history)
    })
  }, [])

  const selectedStudentId = form?.studentId ?? null
  useEffect(() => {
    if (!selectedStudentId) return
    loadHistory(selectedStudentId, reportDate, examType)
  }, [selectedStudentId, reportDate, examType, loadHistory])

  // 학생 검색 (300ms 디바운스) — query가 비면 이전 결과를 그냥 안 보여주기만 하면 되므로
  // 별도 setState로 리셋하지 않고 렌더링 시점에 파생시킨다 (visibleHits 참고)
  useEffect(() => {
    if (!query.trim()) return
    const t = setTimeout(() => {
      startSearchTransition(async () => {
        const res = await searchStudentsByName(query)
        if (!res.error) setHits(res.students)
      })
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const visibleHits = query.trim() ? hits : []

  function selectHit(hit: StudentHit) {
    const existing = logged.find((l) => l.studentId === hit.id)
    setForm(existing ? formFromLogged(existing) : blankForm(hit))
    if (existing) setExamType(existing.content.examType)
    setHistory([])
    setQuery('')
    setHits([])
    setSavedAt(null)
    setErr('')
  }

  function selectLogged(row: LoggedRow) {
    setForm(formFromLogged(row))
    setExamType(row.content.examType)
    setHistory([])
    setSavedAt(null)
    setErr('')
  }

  const handleSave = useCallback(async () => {
    if (!form) return
    if (!form.arrivalTime && !form.departureTime && !form.studyContent.trim()) {
      setErr('등원/하원 시각 또는 학습 내용 중 하나는 입력하세요.')
      return
    }
    setErr('')
    setSaving(true)
    try {
      await document.fonts.ready
      const node = cardRef.current
      if (!node) throw new Error('카드를 렌더링하지 못했습니다.')

      const imageBase64 = await toPng(node, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
        width: node.offsetWidth,
        height: node.offsetHeight,
      })

      const content: ExamPrepContent = {
        type: 'exam_prep',
        examType,
        school: form.school,
        grade: form.grade,
        arrivalTime: form.arrivalTime,
        departureTime: form.departureTime,
        studyContent: form.studyContent,
        mockExam: {
          status: form.mockExamStatus,
          examLabel: form.mockExamStatus === 'attended' ? form.examLabel.trim() || undefined : undefined,
          difficulty: form.mockExamStatus === 'attended' && form.difficulty.trim() ? Number(form.difficulty) : null,
          score: form.mockExamStatus === 'attended' && form.score.trim() ? Number(form.score) : null,
          note: form.mockExamStatus === 'attended' ? form.note.trim() || undefined : undefined,
        },
      }

      const res = await saveExamPrepReports([{
        studentId: form.studentId,
        reportDate,
        contentJson: content,
        imageBase64,
      }])
      if (res.error) { setErr(res.error); return }
      setSavedAt(Date.now())
      await loadLogged(reportDate)
      loadHistory(form.studentId, reportDate, examType)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }, [form, reportDate, examType, loadLogged, loadHistory])

  const handleSend = useCallback(async () => {
    if (!confirm(`${reportDate} 내신대비 리포트를 전체 학부모에게 카카오톡으로 발송하시겠습니까?`)) return
    setSending(true)
    setSendResult('')
    try {
      const res = await sendBatchExamPrepKakao(reportDate)
      if (res.error && res.sent === 0) setErr(res.error)
      else setSendResult(`${res.sent}명 발송 완료${res.failed > 0 ? ` · ${res.failed}명 실패` : ''}`)
    } finally {
      setSending(false)
    }
  }, [reportDate])

  // 카카오 자동 발송(Solapi)이 아직 설정 안 됐을 수 있으므로, 그동안 수동으로 전달할 수 있게
  // 이미지 다운로드(단일/전체 ZIP)를 지원한다.
  const downloadOne = useCallback(async (row: LoggedRow) => {
    if (!row.imageUrl) return
    setDownloadingId(row.id)
    try {
      const res = await fetch(`${row.imageUrl}?dl=${Date.now()}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`이미지 요청 실패 (${res.status})`)
      const blob = await res.blob()
      if (!blob.type.startsWith('image/')) throw new Error('올바른 이미지 응답이 아닙니다.')
      const { saveAs } = await import('file-saver')
      saveAs(blob, `${row.content.school || '학교'}_${row.studentName}.png`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '이미지 다운로드에 실패했습니다.')
    } finally {
      setDownloadingId(null)
    }
  }, [])

  const downloadAllZip = useCallback(async () => {
    const withImages = logged.filter((r) => r.imageUrl)
    if (withImages.length === 0) return
    setDownloadingZip(true)
    try {
      const JSZip = (await import('jszip')).default
      const { saveAs } = await import('file-saver')
      const zip = new JSZip()
      for (const row of withImages) {
        const res = await fetch(`${row.imageUrl}?dl=${Date.now()}`, { cache: 'no-store' })
        if (!res.ok) throw new Error(`${row.studentName} 이미지 요청 실패 (${res.status})`)
        const blob = await res.blob()
        if (!blob.type.startsWith('image/')) throw new Error(`${row.studentName} 이미지 응답이 올바르지 않습니다.`)
        zip.file(`${row.content.school || '학교'}_${row.studentName}.png`, blob)
      }
      const content = await zip.generateAsync({ type: 'blob' })
      saveAs(content, `내신대비리포트_${reportDate}.zip`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ZIP 다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloadingZip(false)
    }
  }, [logged, reportDate])

  const previewCard: ExamPrepStudentData | null = form
    ? {
        school: form.school,
        grade: form.grade,
        name: form.studentName,
        arrivalTime: form.arrivalTime,
        departureTime: form.departureTime,
        studyContent: form.studyContent,
        mockExam: {
          status: form.mockExamStatus,
          examLabel: form.examLabel,
          difficulty: form.difficulty.trim() ? Number(form.difficulty) : null,
          score: form.score.trim() ? Number(form.score) : null,
          note: form.note,
        },
      }
    : null

  // 과거 기록(history, DB) + 오늘 실시간 입력값을 합쳐 "학습 내용 누적"/"성적 추이"에 반영 —
  // 오늘 것만 아직 저장 전이라도 미리보기에 바로 보이게 한다.
  const mergedHistory: ExamPrepHistoryEntry[] = form
    ? [
        ...history.filter((h) => h.date !== reportDate),
        {
          date: reportDate,
          studyContent: form.studyContent,
          mockExam: {
            status: form.mockExamStatus,
            examLabel: form.examLabel,
            difficulty: form.difficulty.trim() ? Number(form.difficulty) : null,
            score: form.score.trim() ? Number(form.score) : null,
            note: form.note,
          },
        },
      ].sort((a, b) => a.date.localeCompare(b.date))
    : []

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/admin/reports"
          className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
          리포트 목록
        </Link>
        <h1 className="text-xl font-bold text-zinc-950 dark:text-zinc-50">내신대비 리포트 생성</h1>
        <p className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-600">학생을 검색해 등하원 시각과 그날 학습 내용을 바로 입력합니다.</p>
      </div>

      {/* 날짜 + 발송 */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 mb-6 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500">날짜</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setReportDate(todayString())}
                className="rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-3 text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors whitespace-nowrap"
              >
                오늘
              </button>
              <div className="w-[200px]">
                <DatePicker value={reportDate} onChange={setReportDate} />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500">내신대비 기간</label>
            <div className="flex items-center gap-1.5">
              {([
                { value: 'midterm', label: '모의 중간고사' },
                { value: 'final', label: '모의 기말고사' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setExamType(opt.value)}
                  className={`rounded-xl px-4 py-3 text-sm font-bold transition-colors whitespace-nowrap ${
                    examType === opt.value
                      ? 'bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-900'
                      : 'border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-950'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1" />
          {logged.length > 0 && (
            <div className="flex items-center gap-2">
              {sendResult && <span className="text-xs text-zinc-500 dark:text-zinc-500">{sendResult}</span>}
              <button
                type="button"
                onClick={downloadAllZip}
                disabled={downloadingZip}
                className="rounded-xl border-2 border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors disabled:opacity-60"
              >
                {downloadingZip ? 'ZIP 생성 중…' : `ZIP 다운로드 (${logged.length}명)`}
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="rounded-xl bg-zinc-950 dark:bg-zinc-50 px-4 py-3 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-60"
              >
                {sending ? '발송 중…' : `카카오 전체 발송 (${logged.length}명)`}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* 입력 폼 */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-4">
          {/* 학생 검색 */}
          <div className="relative">
            <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1.5 block">학생 검색</label>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름으로 검색…"
              className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none transition-all"
            />
            {(visibleHits.length > 0 || searchPending) && query.trim() && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-lg max-h-64 overflow-y-auto">
                {searchPending && <p className="px-4 py-2.5 text-xs text-zinc-400 dark:text-zinc-600">검색 중…</p>}
                {visibleHits.map((hit) => (
                  <button
                    key={hit.id}
                    type="button"
                    onClick={() => selectHit(hit)}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-950 text-left"
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">{hit.name}</span>
                    <span className="text-xs text-zinc-400 dark:text-zinc-600">{hit.school} {hit.grade}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!form ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-600 py-10 text-center">학생을 검색해 선택하면 입력 폼이 표시됩니다.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 px-4 py-2.5">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">{form.studentName}</span>
                <span className="text-xs text-zinc-400 dark:text-zinc-600">{form.school} {form.grade}</span>
                {logged.some((l) => l.studentId === form.studentId) && (
                  <span className="rounded-full bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">수정 중</span>
                )}
                {historyPending && <span className="text-[10px] text-zinc-400 dark:text-zinc-600">이전 기록 불러오는 중…</span>}
                <button type="button" onClick={() => setForm(null)} className="ml-auto text-xs text-zinc-400 dark:text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300">변경</button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1.5 block">등원</label>
                  <TimeInput value={form.arrivalTime} onChange={(v) => setForm((f) => f && { ...f, arrivalTime: v })} />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1.5 block">하원</label>
                  <TimeInput value={form.departureTime} onChange={(v) => setForm((f) => f && { ...f, departureTime: v })} />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1.5 block">오늘 학습 내용</label>
                <textarea
                  rows={4}
                  value={form.studyContent}
                  onChange={(e) => setForm((f) => f && { ...f, studyContent: e.target.value })}
                  placeholder="예: DECISIVE 8회 오답 정리, 대륜고 기출 3세트 풀이"
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none transition-all resize-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1.5 block">모의중간·기말고사</label>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: 'none', label: '해당 없음' },
                    { value: 'attended', label: '응시' },
                    { value: 'absent', label: '미응시' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm((f) => f && { ...f, mockExamStatus: opt.value })}
                      className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${
                        form.mockExamStatus === opt.value
                          ? 'bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-900'
                          : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {form.mockExamStatus === 'attended' && (
                  <div className="space-y-3 mt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={form.examLabel}
                        onChange={(e) => setForm((f) => f && { ...f, examLabel: e.target.value })}
                        placeholder="시험명 (예: 미적분2 1회)"
                        className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none transition-all"
                      />
                      <input
                        type="number"
                        value={form.score}
                        onChange={(e) => setForm((f) => f && { ...f, score: e.target.value })}
                        placeholder="점수"
                        className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none transition-all"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-500 shrink-0">난이도</span>
                      {[1, 2, 3, 4, 5].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setForm((f) => f && { ...f, difficulty: String(d) })}
                          className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                            form.difficulty === String(d)
                              ? 'bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-900'
                              : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 dark:text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-900'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={form.note}
                      onChange={(e) => setForm((f) => f && { ...f, note: e.target.value })}
                      placeholder="시험지 특이사항 (예: 7번 문항 유의, 3번 고난도)"
                      className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none transition-all"
                    />
                  </div>
                )}
              </div>

              {err && <p className="text-sm text-red-500">{err}</p>}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-xl bg-zinc-950 dark:bg-zinc-50 px-6 py-3 text-sm font-bold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-60"
                >
                  {saving ? '저장 중…' : '저장'}
                </button>
                {savedAt && <span className="text-sm text-zinc-500 dark:text-zinc-500">✓ 저장되었습니다</span>}
              </div>
            </>
          )}
        </div>

        {/* 오늘 입력된 학생 목록 */}
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm">
          <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-300 mb-3">
            이 날짜에 입력된 학생 <span className="font-normal text-zinc-400 dark:text-zinc-600">({logged.length}명)</span>
          </h2>
          {loadPending ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-600">불러오는 중…</p>
          ) : logged.length === 0 ? (
            <p className="text-sm text-zinc-400 dark:text-zinc-600">아직 입력된 학생이 없습니다.</p>
          ) : (
            <>
              <div className="space-y-1">
                {(listExpanded ? logged : logged.slice(0, LOGGED_PREVIEW_COUNT)).map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center gap-1 rounded-lg px-1 hover:bg-zinc-50 dark:hover:bg-zinc-950"
                  >
                    <button
                      type="button"
                      onClick={() => selectLogged(row)}
                      className="flex-1 flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm text-left min-w-0"
                    >
                      <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                        {row.studentName}
                        <span className="ml-1 font-normal text-zinc-400 dark:text-zinc-600">({row.content.school || '학교 없음'})</span>
                      </span>
                      <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-600">
                        {row.content.arrivalTime || '—'} ~ {row.content.departureTime || '—'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadOne(row)}
                      disabled={!row.imageUrl || downloadingId === row.id}
                      title="이미지 다운로드"
                      className="shrink-0 rounded-lg p-2 text-zinc-400 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-zinc-300 disabled:opacity-40 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              {logged.length > LOGGED_PREVIEW_COUNT && (
                <button
                  type="button"
                  onClick={() => setListExpanded((v) => !v)}
                  className="mt-2 w-full rounded-lg py-2 text-xs font-medium text-zinc-500 dark:text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-950 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                >
                  {listExpanded ? '접기' : `외 ${logged.length - LOGGED_PREVIEW_COUNT}명 더보기`}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 오프스크린 캡처용 카드 */}
      {previewCard && (
        <div
          aria-hidden="true"
          style={{ position: 'fixed', left: -10000, top: 0, width: 420, pointerEvents: 'none', zIndex: -1 }}
        >
          <ExamPrepReportCard ref={cardRef} student={previewCard} dateString={reportDate.slice(5).replace('-', '/')} history={mergedHistory} />
        </div>
      )}
    </div>
  )
}
