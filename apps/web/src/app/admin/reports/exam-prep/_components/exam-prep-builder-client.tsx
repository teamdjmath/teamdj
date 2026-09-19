'use client'

import { startTransition, useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import * as XLSX from 'xlsx'
import { toPng } from 'html-to-image'
import { ExamPrepReportCard, type ExamPrepStudentData, type ExamPrepPlanItem } from './exam-prep-report-card'
import { DatePicker } from '@/components/ui/date-picker'
import { TimeInput } from '@/components/ui/time-input'
import { excelTimeToString } from '@/lib/excel-time'
import {
  searchStudentsByName,
  getExamPrepReportsForDate,
  saveExamPrepReports,
  sendBatchExamPrepKakao,
  matchStudentsByNameSchool,
  getExamPrepPlanItems,
  addExamPrepPlanItem,
  updateExamPrepPlanItemProgress,
  deleteExamPrepPlanItem,
  resetExamPrepPlan,
  resetAllExamPrepPlans,
  saveExamPrepDraft,
  getExamPrepDraft,
  deleteExamPrepDraft,
  type ExamPrepContent,
  type ExamPrepMockExamEntry,
} from '@/lib/actions/reports'

const PROGRESS_OPTIONS = [0, 20, 40, 60, 80, 100] as const

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

type StudentHit = { id: string; name: string; school: string | null; grade: string | null }

type LoggedRow = { id: string; studentId: string; studentName: string; imageUrl: string | null; content: ExamPrepContent }

const LOGGED_PREVIEW_COUNT = 6

// 폼에서는 점수를 입력 중인 문자열로 다루고, 저장할 때 숫자로 변환한다
type MockExamForm = { examLabel: string; status: ExamPrepMockExamEntry['status']; score: string }

function toMockExamForms(entries: ExamPrepMockExamEntry[]): MockExamForm[] {
  return entries.map((e) => ({ examLabel: e.examLabel, status: e.status, score: e.score != null ? String(e.score) : '' }))
}

// 응시 기록만 점수를 가진다. 시험명·점수가 모두 비어있는 응시 행은 빈 줄이라 제외한다.
function toMockExamEntries(forms: MockExamForm[]): ExamPrepMockExamEntry[] {
  return forms
    .filter((m) => m.status === 'absent' || m.examLabel.trim() || m.score.trim())
    .map((m) => ({
      examLabel: m.examLabel.trim(),
      status: m.status,
      score: m.status === 'attended' && m.score.trim() ? Number(m.score) : null,
    }))
}

// mockExams 도입 전(단일 모의고사)에 저장된 기록은 1건짜리 목록으로 변환해서 읽는다
function mockExamsOf(content: ExamPrepContent): ExamPrepMockExamEntry[] {
  if (content.mockExams) return content.mockExams
  const legacy = content.mockExam
  if (!legacy || legacy.status === 'none') return []
  return [{ examLabel: legacy.examLabel ?? '', status: legacy.status, score: legacy.score ?? null }]
}

type FormState = {
  studentId: string
  studentName: string
  school: string
  grade: string
  arrivalTime: string
  departureTime: string
  studyContent: string
  mockExams: MockExamForm[]
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
    mockExams: [],
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
    mockExams: toMockExamForms(mockExamsOf(row.content)),
  }
}

// ── 엑셀 일괄 업로드 ──────────────────────────────────────────────────────────
// cols: 학교(0) | 학년(1) | 이름(2) | 등원시각(3) | 하원시각(4) | 학습내용(5) |
//       이후 (시험명, 점수) 쌍을 원하는 만큼 반복 — 6·7번째 칸이 1회차, 8·9번째 칸이 2회차 …
//       점수 칸에 "미응시"라고 적으면 미응시, 숫자면 응시, 시험명·점수가 모두 비어있으면 건너뜀

type ExamPrepExcelRow = {
  school: string
  grade: string
  name: string
  arrivalTime: string
  departureTime: string
  studyContent: string
  mockExams: ExamPrepMockExamEntry[]
}

function parseExamPrepExcel(buffer: ArrayBuffer): ExamPrepExcelRow[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (rows.length < 2) throw new Error('데이터가 없습니다. 헤더 포함 2행 이상이 필요합니다.')

  const result: ExamPrepExcelRow[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    if (!row.some((c) => c !== '' && c !== null && c !== undefined)) continue
    const name = String(row[2] ?? '').trim()
    if (!name) continue

    const mockExams: ExamPrepMockExamEntry[] = []
    for (let c = 6; c < row.length; c += 2) {
      const examLabel = String(row[c] ?? '').trim()
      const scoreRaw = String(row[c + 1] ?? '').trim()
      if (!examLabel && !scoreRaw) continue
      const absent = scoreRaw === '미응시'
      const score = !absent && scoreRaw !== '' ? Number(scoreRaw) : null
      mockExams.push({ examLabel, status: absent ? 'absent' : 'attended', score: score != null && Number.isFinite(score) ? score : null })
    }

    result.push({
      school: String(row[0] ?? '').trim(),
      grade: String(row[1] ?? '').trim(),
      name,
      arrivalTime: excelTimeToString(row[3]),
      departureTime: excelTimeToString(row[4]),
      studyContent: String(row[5] ?? '').trim(),
      mockExams,
    })
  }
  if (result.length === 0) {
    throw new Error('유효한 학생 데이터가 없습니다. 이름 컬럼(3번째)을 확인해주세요.')
  }
  return result
}

function downloadExamPrepSampleExcel() {
  const aoa = [
    ['학교', '학년', '이름', '등원시각', '하원시각', '학습내용', '시험명1', '점수1', '시험명2', '점수2', '시험명3', '점수3'],
    ['대륜고', '3', '홍길동', '17:10', '20:40', 'DECISIVE 5~6회 오답 정리, 대륜고 기출 3세트 풀이', '미적분2 모의중간고사 1회', '78', '미적분2 모의중간고사 2회', '85', '미적분2 모의중간고사 3회', '미응시'],
    ['경신고', '2', '김철수', '17:00', '19:30', '기출 3세트 풀이 및 오답 정리', '', '', '', '', '', ''],
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 10 }, { wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 45 }, { wch: 24 }, { wch: 8 }, { wch: 24 }, { wch: 8 }, { wch: 24 }, { wch: 8 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '내신대비리포트')
  XLSX.writeFile(wb, '내신대비리포트_샘플.xlsx')
}

interface Props {
  isTeacher: boolean
}

export function ExamPrepBuilderClient({ isTeacher }: Props) {
  const [reportDate, setReportDate] = useState(todayString())
  // 중간/기말 내신대비 기간 구분 — 그날 응시한 모의고사가 어느 시험 기간 것인지 표기
  const [examType, setExamType] = useState<ExamPrepContent['examType']>('midterm')
  const [logged, setLogged] = useState<LoggedRow[]>([])
  const [mode, setMode] = useState<'manual' | 'excel'>('manual')

  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<StudentHit[]>([])

  const [form, setForm] = useState<FormState | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [err, setErr] = useState('')

  // 임시 저장 — 이미지는 만들지 않고 입력값만 보존, 같은 학생+날짜를 다시 열면 자동으로 불러온다
  const [draftSaving, setDraftSaving] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<number | null>(null)

  // 선택된 학생의 계획 항목 목록 — 날짜와 무관하게 즉시 저장되는 실시간 상태
  const [planItems, setPlanItems] = useState<ExamPrepPlanItem[]>([])
  const [newItemContent, setNewItemContent] = useState('')
  const [addingItem, setAddingItem] = useState(false)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null)
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null)
  const [resettingPlan, setResettingPlan] = useState(false)
  const [planErr, setPlanErr] = useState('')

  // 전체 학생 계획 항목 일괄 초기화 (선생님 전용, 학생별 초기화와 별개)
  const [resettingAllPlans, setResettingAllPlans] = useState(false)
  const [resetAllResult, setResetAllResult] = useState('')

  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState('')
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [listExpanded, setListExpanded] = useState(false)

  // 엑셀 일괄 업로드
  const [excelRows, setExcelRows] = useState<ExamPrepExcelRow[]>([])
  const [excelMatchMap, setExcelMatchMap] = useState<Record<number, string | null>>({})
  const [excelPlanMap, setExcelPlanMap] = useState<Record<number, ExamPrepPlanItem[]>>({})
  const [excelError, setExcelError] = useState('')
  const [excelSaving, setExcelSaving] = useState(false)
  const [excelSaveProgress, setExcelSaveProgress] = useState<{ cur: number; total: number } | null>(null)
  const [excelSavedCount, setExcelSavedCount] = useState<number | null>(null)
  const excelCaptureRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const cardRef = useRef<HTMLDivElement>(null)
  const [loadPending, startLoadTransition] = useTransition()
  const [searchPending, startSearchTransition] = useTransition()
  const [planItemsPending, startPlanItemsTransition] = useTransition()

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

  // 날짜를 바꾸면 이전 날짜에서 선택해둔 학생 폼을 그대로 남겨두면 헷갈리므로 초기화한다
  useEffect(() => {
    startTransition(() => {
      setForm(null)
      setQuery('')
      setHits([])
      setPlanItems([])
      setSavedAt(null)
      setDraftSavedAt(null)
      setErr('')
      setPlanErr('')
    })
  }, [reportDate])

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

  const loadPlanItems = useCallback((studentId: string) => {
    startPlanItemsTransition(async () => {
      const res = await getExamPrepPlanItems(studentId)
      if (!res.error) setPlanItems(res.items)
    })
  }, [])

  // 정식 리포트가 아직 없을 때만 임시저장을 불러온다 — 정식 기록이 있으면 그쪽이 우선
  const loadDraftIntoForm = useCallback((studentId: string, date: string) => {
    getExamPrepDraft(studentId, date).then((res) => {
      if (res.error || !res.draft) return
      const d = res.draft
      setForm((f) => (f && f.studentId === studentId ? {
        ...f,
        arrivalTime: d.arrivalTime,
        departureTime: d.departureTime,
        studyContent: d.studyContent,
        mockExams: toMockExamForms(d.mockExams),
      } : f))
      setExamType(d.examType)
    })
  }, [])

  function selectHit(hit: StudentHit) {
    const existing = logged.find((l) => l.studentId === hit.id)
    setForm(existing ? formFromLogged(existing) : blankForm(hit))
    if (existing) setExamType(existing.content.examType)
    setQuery('')
    setHits([])
    setSavedAt(null)
    setDraftSavedAt(null)
    setErr('')
    setPlanErr('')
    setPlanItems([])
    loadPlanItems(hit.id)
    if (!existing) loadDraftIntoForm(hit.id, reportDate)
  }

  function selectLogged(row: LoggedRow) {
    setForm(formFromLogged(row))
    setExamType(row.content.examType)
    setSavedAt(null)
    setDraftSavedAt(null)
    setErr('')
    setPlanErr('')
    setPlanItems([])
    loadPlanItems(row.studentId)
  }

  function addMockExam() {
    setForm((f) => f && { ...f, mockExams: [...f.mockExams, { examLabel: '', status: 'attended', score: '' }] })
  }

  function updateMockExam(index: number, patch: Partial<MockExamForm>) {
    setForm((f) => f && { ...f, mockExams: f.mockExams.map((m, i) => (i === index ? { ...m, ...patch } : m)) })
  }

  function removeMockExam(index: number) {
    setForm((f) => f && { ...f, mockExams: f.mockExams.filter((_, i) => i !== index) })
  }

  // 계획 항목 추가/이행도 수정/삭제 — 날짜별 "저장"과 무관하게 클릭 즉시 반영된다
  async function handleAddPlanItem() {
    if (!form || !newItemContent.trim()) return
    setAddingItem(true)
    setPlanErr('')
    try {
      const res = await addExamPrepPlanItem(form.studentId, newItemContent)
      if (res.error || !res.item) { setPlanErr(res.error ?? '추가에 실패했습니다.'); return }
      setPlanItems((prev) => [...prev, res.item!])
      setNewItemContent('')
    } finally {
      setAddingItem(false)
    }
  }

  async function handleUpdateItemProgress(itemId: string, pct: number) {
    setUpdatingItemId(itemId)
    setPlanErr('')
    setPlanItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, progressPct: pct } : it)))
    try {
      const res = await updateExamPrepPlanItemProgress(itemId, pct)
      if (res.error) setPlanErr(res.error)
    } finally {
      setUpdatingItemId(null)
    }
  }

  async function handleDeletePlanItem(itemId: string) {
    setDeletingItemId(itemId)
    setPlanErr('')
    try {
      const res = await deleteExamPrepPlanItem(itemId)
      if (res.error) { setPlanErr(res.error); return }
      setPlanItems((prev) => prev.filter((it) => it.id !== itemId))
    } finally {
      setDeletingItemId(null)
    }
  }

  async function handleResetPlan() {
    if (!form) return
    if (!confirm(`${form.studentName}의 계획 항목을 모두 삭제하시겠습니까? 되돌릴 수 없습니다.`)) return
    setResettingPlan(true)
    setPlanErr('')
    try {
      const res = await resetExamPrepPlan(form.studentId)
      if (res.error) { setPlanErr(res.error); return }
      setPlanItems([])
    } finally {
      setResettingPlan(false)
    }
  }

  // 학생 개별 초기화와는 별개 — 전체 학생의 계획 항목을 한 번에 삭제 (중간→기말 시즌 전환 등)
  async function handleResetAllPlans() {
    if (!confirm('정말로 "전체" 학생의 계획 항목을 삭제하시겠습니까?\n특정 학생이 아니라 등록된 모든 학생의 계획이 전부 사라집니다. 되돌릴 수 없습니다.')) return
    setResettingAllPlans(true)
    setResetAllResult('')
    try {
      const res = await resetAllExamPrepPlans()
      if (res.error) { setResetAllResult(`오류: ${res.error}`); return }
      setResetAllResult(`✓ 전체 학생의 계획 항목 ${res.deletedCount ?? 0}개를 삭제했습니다.`)
      setPlanItems([]) // 현재 화면에 열려있는 학생의 목록도 같이 비움
    } finally {
      setResettingAllPlans(false)
    }
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
        planItems,
        mockExams: toMockExamEntries(form.mockExams),
      }

      const res = await saveExamPrepReports([{
        studentId: form.studentId,
        reportDate,
        contentJson: content,
        imageBase64,
      }])
      if (res.error) { setErr(res.error); return }
      setSavedAt(Date.now())
      setDraftSavedAt(null)
      await loadLogged(reportDate)
      await deleteExamPrepDraft(form.studentId, reportDate)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }, [form, reportDate, examType, planItems, loadLogged])

  // 임시 저장 — 이미지는 만들지 않고 입력값만 학생+날짜 단위로 보존
  const handleSaveDraft = useCallback(async () => {
    if (!form) return
    setErr('')
    setDraftSaving(true)
    try {
      const res = await saveExamPrepDraft(form.studentId, reportDate, {
        examType,
        arrivalTime: form.arrivalTime,
        departureTime: form.departureTime,
        studyContent: form.studyContent,
        mockExams: toMockExamEntries(form.mockExams),
      })
      if (res.error) { setErr(res.error); return }
      setDraftSavedAt(Date.now())
    } finally {
      setDraftSaving(false)
    }
  }, [form, reportDate, examType])

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

  // 엑셀 파일 처리 — 파싱 → 학생 매칭 → (매칭된 학생만) 계획 항목 목록 미리 조회
  // 계획 항목은 날짜와 무관하므로 reportDate/examType에 의존하지 않는다
  const processExcelFile = useCallback((file: File) => {
    setExcelError('')
    setExcelRows([])
    setExcelMatchMap({})
    setExcelPlanMap({})
    setExcelSavedCount(null)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer
        const parsed = parseExamPrepExcel(buffer)
        setExcelRows(parsed)

        const { matches } = await matchStudentsByNameSchool(
          parsed.map((r) => ({ name: r.name, school: r.school })),
        )
        const map: Record<number, string | null> = {}
        matches.forEach((m, i) => { map[i] = m.studentId })
        setExcelMatchMap(map)

        const planMap: Record<number, ExamPrepPlanItem[]> = {}
        await Promise.all(
          parsed.map(async (_, i) => {
            const sid = map[i]
            if (!sid) return
            const res = await getExamPrepPlanItems(sid)
            if (!res.error) planMap[i] = res.items
          }),
        )
        setExcelPlanMap(planMap)
      } catch (err) {
        setExcelError(err instanceof Error ? err.message : '엑셀 파싱 중 오류가 발생했습니다.')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleExcelFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processExcelFile(file)
    e.target.value = ''
  }, [processExcelFile])

  function buildExcelCardData(row: ExamPrepExcelRow, index: number): ExamPrepStudentData {
    return {
      school: row.school,
      grade: row.grade,
      name: row.name,
      arrivalTime: row.arrivalTime,
      departureTime: row.departureTime,
      studyContent: row.studyContent,
      planItems: excelPlanMap[index] ?? [],
      mockExams: row.mockExams,
    }
  }

  const excelMatchedCount = excelRows.filter((_, i) => excelMatchMap[i]).length

  const handleExcelSave = useCallback(async () => {
    const targets = excelRows
      .map((row, index) => ({ row, index, studentId: excelMatchMap[index] }))
      .filter((t): t is typeof t & { studentId: string } => !!t.studentId)
    if (targets.length === 0) { setExcelError('매칭된 학생이 없어 저장할 수 없습니다.'); return }

    setExcelError('')
    setExcelSaving(true)
    setExcelSavedCount(null)
    setExcelSaveProgress({ cur: 0, total: targets.length })

    try {
      await document.fonts.ready
      const items: Array<{ studentId: string; reportDate: string; contentJson: ExamPrepContent; imageBase64: string }> = []

      for (let i = 0; i < targets.length; i++) {
        const { row, index, studentId } = targets[i]
        setExcelSaveProgress({ cur: i + 1, total: targets.length })
        const node = excelCaptureRefs.current.get(index)
        if (!node) continue

        const imageBase64 = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true,
          width: node.offsetWidth,
          height: node.offsetHeight,
        })

        items.push({
          studentId,
          reportDate,
          contentJson: {
            type: 'exam_prep',
            examType,
            school: row.school,
            grade: row.grade,
            arrivalTime: row.arrivalTime,
            departureTime: row.departureTime,
            studyContent: row.studyContent,
            planItems: excelPlanMap[index] ?? [],
            mockExams: row.mockExams,
          },
          imageBase64,
        })
      }

      const res = await saveExamPrepReports(items)
      if (res.error) { setExcelError(res.error); return }
      setExcelSavedCount(res.saved)
      await loadLogged(reportDate)
    } catch (e) {
      setExcelError(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setExcelSaving(false)
      setExcelSaveProgress(null)
    }
  }, [excelRows, excelMatchMap, excelPlanMap, reportDate, examType, loadLogged])

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
      saveAs(blob, `${reportDate}_${row.content.school || '학교'}_${row.studentName}.png`)
    } catch (e) {
      setErr(e instanceof Error ? e.message : '이미지 다운로드에 실패했습니다.')
    } finally {
      setDownloadingId(null)
    }
  }, [reportDate])

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
        planItems,
        mockExams: toMockExamEntries(form.mockExams),
      }
    : null

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
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
          <p className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-600">
            학생을 검색해 오늘 학습 내용·등하원 시각을 입력하고, 계획 항목 이행도도 같이 갱신합니다.
          </p>
        </div>

        {/* 학생 개별 초기화(폼 안)와는 별개 — 전체 학생 대상이라 실수로 누르지 않도록 헤더 쪽에 분리 배치 */}
        {isTeacher && (
          <div className="shrink-0 text-right">
            <button
              type="button"
              onClick={handleResetAllPlans}
              disabled={resettingAllPlans}
              className="text-xs text-red-500 hover:text-red-600 disabled:opacity-60"
            >
              {resettingAllPlans ? '전체 초기화 중…' : '전체 학생 계획 일괄 초기화'}
            </button>
            {resetAllResult && (
              <p className={`mt-1 text-[11px] ${resetAllResult.startsWith('오류') ? 'text-red-500' : 'text-zinc-500 dark:text-zinc-500'}`}>
                {resetAllResult}
              </p>
            )}
          </div>
        )}
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

      {/* 입력 방식 탭 */}
      <div className="flex gap-1 mb-4 rounded-xl bg-zinc-100 dark:bg-zinc-900 p-1 w-fit">
        {([
          { value: 'manual', label: '개별 입력' },
          { value: 'excel', label: '엑셀 일괄 업로드' },
        ] as const).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setMode(opt.value)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              mode === opt.value
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                : 'text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {mode === 'manual' ? (
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

              {/* 계획 항목 — 날짜별 "저장"과 무관하게 버튼 클릭 즉시 저장된다 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500">
                    계획 항목 {planItemsPending && <span className="font-normal text-zinc-400 dark:text-zinc-600">불러오는 중…</span>}
                  </label>
                  {isTeacher && planItems.length > 0 && (
                    <button
                      type="button"
                      onClick={handleResetPlan}
                      disabled={resettingPlan}
                      className="text-[11px] text-red-500 hover:text-red-600 disabled:opacity-60"
                    >
                      {resettingPlan ? '초기화 중…' : '전체 초기화'}
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  {planItems.map((item) => (
                    <div key={item.id} className="rounded-lg border border-zinc-100 dark:border-zinc-900 bg-zinc-50/60 dark:bg-zinc-950/60 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm text-zinc-800 dark:text-zinc-200 flex-1">{item.content}</p>
                        <button
                          type="button"
                          onClick={() => handleDeletePlanItem(item.id)}
                          disabled={deletingItemId === item.id}
                          title="항목 삭제"
                          className="shrink-0 text-zinc-300 dark:text-zinc-700 hover:text-red-500 disabled:opacity-40 transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {PROGRESS_OPTIONS.map((pct) => (
                          <button
                            key={pct}
                            type="button"
                            onClick={() => handleUpdateItemProgress(item.id, pct)}
                            disabled={updatingItemId === item.id}
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors disabled:opacity-60 ${
                              item.progressPct === pct
                                ? 'bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-900'
                                : 'border border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-600 hover:border-zinc-400 dark:hover:border-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-300'
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {planItems.length === 0 && !planItemsPending && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-600 py-2">등록된 계획 항목이 없습니다.</p>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="text"
                    value={newItemContent}
                    onChange={(e) => setNewItemContent(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddPlanItem() } }}
                    placeholder="새 계획 항목 (예: DECISIVE 1~10회)"
                    className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleAddPlanItem}
                    disabled={addingItem || !newItemContent.trim()}
                    className="shrink-0 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 px-4 py-2.5 text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors disabled:opacity-60"
                  >
                    {addingItem ? '추가 중…' : '추가'}
                  </button>
                </div>
                {planErr && <p className="mt-1.5 text-sm text-red-500">{planErr}</p>}
              </div>

              {/* 모의중간·기말고사 — 하루에 여러 회차를 입력할 수 있다 (없으면 비워둠) */}
              <div>
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-500 mb-1.5 block">모의중간·기말고사</label>
                <div className="space-y-2">
                  {form.mockExams.map((exam, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateMockExam(i, { status: exam.status === 'attended' ? 'absent' : 'attended' })}
                        title="응시/미응시 전환"
                        className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition-colors ${
                          exam.status === 'attended'
                            ? 'bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-900'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {exam.status === 'attended' ? '응시' : '미응시'}
                      </button>
                      <input
                        type="text"
                        value={exam.examLabel}
                        onChange={(e) => updateMockExam(i, { examLabel: e.target.value })}
                        placeholder="시험명 (예: 미적분2 1회)"
                        className="min-w-0 flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none transition-all"
                      />
                      <input
                        type="number"
                        value={exam.status === 'attended' ? exam.score : ''}
                        onChange={(e) => updateMockExam(i, { score: e.target.value })}
                        disabled={exam.status === 'absent'}
                        placeholder={exam.status === 'absent' ? '—' : '점수'}
                        className="w-24 shrink-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 outline-none transition-all disabled:opacity-50"
                      />
                      <button
                        type="button"
                        onClick={() => removeMockExam(i)}
                        title="모의고사 삭제"
                        className="shrink-0 text-zinc-300 dark:text-zinc-700 hover:text-red-500 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {form.mockExams.length === 0 && (
                    <p className="text-xs text-zinc-400 dark:text-zinc-600 py-1">그날 본 모의고사가 없으면 비워두세요.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={addMockExam}
                  className="mt-2 rounded-xl border-2 border-zinc-200 dark:border-zinc-800 px-4 py-2 text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
                >
                  + 모의고사 추가
                </button>
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
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={draftSaving || saving}
                  className="rounded-xl border-2 border-zinc-200 dark:border-zinc-800 px-5 py-3 text-sm font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors disabled:opacity-60"
                >
                  {draftSaving ? '임시 저장 중…' : '임시 저장'}
                </button>
                {savedAt && <span className="text-sm text-zinc-500 dark:text-zinc-500">✓ 저장되었습니다</span>}
                {!savedAt && draftSavedAt && (
                  <span className="text-sm text-zinc-500 dark:text-zinc-500">
                    {new Date(draftSavedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}에 임시저장됨 — 이미지는 아직 생성되지 않았습니다
                  </span>
                )}
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
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 px-4 py-3">
            <span className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-500" aria-hidden>⚠</span>
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                엑셀 일괄 업로드에서는 계획 항목 이행도를 바꿀 수 없습니다
              </p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                저장 시 현재 등록된 계획 항목이 수정 없이 그대로 담깁니다. 이행도를 바꾸려면 &ldquo;개별 입력&rdquo; 탭을 이용하세요.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer rounded-xl border-2 border-zinc-200 dark:border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              엑셀 업로드
              <input type="file" accept=".xlsx,.xls" onChange={handleExcelFile} className="hidden" />
            </label>
            <button
              type="button"
              onClick={downloadExamPrepSampleExcel}
              className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-colors"
            >
              샘플 엑셀 다운로드
            </button>
            <span className="text-xs text-zinc-400 dark:text-zinc-600">
              {reportDate} · {examType === 'midterm' ? '모의 중간고사' : '모의 기말고사'} 기준으로 저장됩니다
            </span>

            {excelRows.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExcelSave}
                  disabled={excelSaving || excelMatchedCount === 0}
                  className="rounded-xl bg-zinc-950 dark:bg-zinc-50 px-5 py-3 text-sm font-semibold text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  {excelSaving
                    ? (excelSaveProgress ? `저장 중… (${excelSaveProgress.cur}/${excelSaveProgress.total})` : '저장 중…')
                    : `리포트 저장 (${excelMatchedCount}명)`}
                </button>
              </div>
            )}
          </div>

          {excelRows.length > 0 && excelRows.length - excelMatchedCount > 0 && (
            <p className="text-xs text-amber-600">
              학생 계정을 찾지 못한 {excelRows.length - excelMatchedCount}명은 저장에서 제외됩니다 (이름·학교로 매칭)
            </p>
          )}

          {excelSavedCount !== null && (
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">✓ {excelSavedCount}명 저장 완료</p>
          )}

          {excelError && <p className="text-sm text-red-500 whitespace-pre-line">{excelError}</p>}

          {excelRows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-6 py-10 text-center">
              <p className="text-sm font-bold text-zinc-600 dark:text-zinc-400 mb-2">시트 컬럼 순서 (첫 번째 시트 기준)</p>
              <p className="text-xs text-zinc-400 dark:text-zinc-600">
                학교 | 학년 | 이름 | 등원시각 | 하원시각 | 학습내용 | 시험명1 | 점수1 | 시험명2 | 점수2 | … (필요한 만큼 계속)
              </p>
              <p className="mt-1 text-xs text-zinc-300 dark:text-zinc-700">첫 행은 헤더 · 이름이 비어있는 행은 건너뜀 · 시각은 16:30 형식 · 모의고사가 없으면 시험명·점수 칸을 비워두면 됨 · 미응시는 점수 칸에 &ldquo;미응시&rdquo;라고 입력 · 계획 항목은 &ldquo;개별 입력&rdquo;에서 관리</p>
            </div>
          ) : (
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, 420px)' }}>
              {excelRows.slice(0, 4).map((row, i) => (
                <div key={i} className="shadow-md rounded-sm overflow-hidden w-fit relative">
                  {!excelMatchMap[i] && (
                    <div className="absolute top-2 right-2 z-10 rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">미매칭</div>
                  )}
                  <ExamPrepReportCard
                    student={buildExcelCardData(row, i)}
                    dateString={reportDate.slice(5).replace('-', '/')}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 오프스크린 캡처용 카드 */}
      {previewCard && (
        <div
          aria-hidden="true"
          style={{ position: 'fixed', left: -10000, top: 0, width: 420, pointerEvents: 'none', zIndex: -1 }}
        >
          <ExamPrepReportCard ref={cardRef} student={previewCard} dateString={reportDate.slice(5).replace('-', '/')} />
        </div>
      )}

      {excelRows.length > 0 && (
        <div
          aria-hidden="true"
          style={{ position: 'fixed', left: -10000, top: 0, width: 420, pointerEvents: 'none', zIndex: -1 }}
        >
          {excelRows.map((row, i) => (
            <ExamPrepReportCard
              key={i}
              ref={(el) => {
                if (el) excelCaptureRefs.current.set(i, el)
                else excelCaptureRefs.current.delete(i)
              }}
              student={buildExcelCardData(row, i)}
              dateString={reportDate.slice(5).replace('-', '/')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
