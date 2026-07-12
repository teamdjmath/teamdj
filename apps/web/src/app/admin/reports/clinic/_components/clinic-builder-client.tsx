'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { toBlob, toPng } from 'html-to-image'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { ClinicReportCard, type ClinicStudentData } from './clinic-report-card'
import { DatePicker } from '@/components/ui/date-picker'
import { matchClinicStudents, saveClinicReports, sendBatchClinicKakao, type ClinicContent } from '@/lib/actions/reports'

const PREVIEW_COUNT = 4

// ── helpers (report-builder와 동일 규칙) ─────────────────────────────────────

function excelTimeToString(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') {
    const t = value.trim()
    if (/^\d{1,2}:\d{2}/.test(t)) return t
    return t
  }
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const total = Math.round(value * 24 * 60)
    const h = Math.floor(total / 60)
    const m = total % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  if (value instanceof Date) {
    const h = value.getHours()
    const m = value.getMinutes()
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  return String(value)
}

function todayString(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function generateDateString(start: string, end: string): string {
  if (!start) return ''
  const parseLocal = (s: string) => {
    const [y, m, d] = s.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`
  const s = parseLocal(start)
  const sStr = fmt(s)
  if (!end || end <= start) return sStr
  const e = parseLocal(end)
  const diffDays = Math.round((e.getTime() - s.getTime()) / 86_400_000)
  if (diffDays >= 5) return `${sStr}~${fmt(e)}`
  const dates: string[] = []
  const cur = new Date(s)
  while (cur.getTime() <= e.getTime()) {
    dates.push(fmt(new Date(cur)))
    cur.setDate(cur.getDate() + 1)
  }
  return dates.join(', ')
}

// ── excel parser ──────────────────────────────────────────────────────────────
// cols: 학교(0) | 학년(1) | 이름(2) | 등원시각(3) | 하원시각(4) | 클리닉 내용(5)

function parseClinicExcel(buffer: ArrayBuffer): ClinicStudentData[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (rows.length < 2) throw new Error('데이터가 없습니다. 헤더 포함 2행 이상이 필요합니다.')

  const students: ClinicStudentData[] = []
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    if (!row.some((c) => c !== '' && c !== null && c !== undefined)) continue
    const name = String(row[2] ?? '').trim()
    if (!name) continue

    students.push({
      school:        String(row[0] ?? '').trim(),
      grade:         String(row[1] ?? '').trim(),
      name,
      arrivalTime:   excelTimeToString(row[3]),
      departureTime: excelTimeToString(row[4]),
      clinicContent: String(row[5] ?? '').trim(),
    })
  }

  if (students.length === 0) {
    throw new Error('유효한 학생 데이터가 없습니다. 이름 컬럼(3번째)을 확인해주세요.')
  }
  return students
}

// ── sample excel (클라이언트에서 즉석 생성) ──────────────────────────────────

function downloadSampleExcel() {
  const aoa = [
    ['학교', '학년', '이름', '등원시각', '하원시각', '클리닉 내용'],
    ['대륜고', '3', '홍길동', '16:30', '19:00', '미적분 오답 클리닉 진행\n- 수열의 극한 3문항 재풀이\n- 다음 클리닉까지 유사문항 5개 과제'],
    ['경신고', '2', '김철수', '17:00', '19:30', '테스트 오답 문항 분석 및 개념 보완'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 10 }, { wch: 6 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 50 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '클리닉리포트')
  XLSX.writeFile(wb, '클리닉리포트_샘플.xlsx')
}

// ── random preview ────────────────────────────────────────────────────────────

function sampleIndices(total: number, n: number): number[] {
  if (total <= n) return Array.from({ length: total }, (_, i) => i)
  const picked = new Set<number>()
  while (picked.size < n) picked.add(Math.floor(Math.random() * total))
  return Array.from(picked).sort((a, b) => a - b)
}

// ── component ─────────────────────────────────────────────────────────────────

export function ClinicBuilderClient() {
  const router = useRouter()
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [students, setStudents] = useState<ClinicStudentData[]>([])
  const [previewIndices, setPreviewIndices] = useState<number[]>([])
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  // 학생 매칭 (index → studentId | null) — 저장·발송 대상 판별용 (백그라운드 자동 처리)
  const [matchMap, setMatchMap] = useState<Record<number, string | null>>({})
  const [saving, setSaving] = useState(false)
  const [saveProgress, setSaveProgress] = useState<{ cur: number; total: number } | null>(null)
  const [savedCount, setSavedCount] = useState<number | null>(null)
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState('')

  const captureRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const dateString = generateDateString(startDate, endDate)
  const matchedCount   = students.filter((_, i) => matchMap[i]).length
  const unmatchedCount = students.length - matchedCount

  // 파일 처리 공통 로직 — 버튼 업로드와 드래그앤드롭 양쪽에서 사용
  const processFile = useCallback((file: File) => {
    setError('')
    setStudents([])
    setPreviewIndices([])
    setMatchMap({})
    setSavedCount(null)

    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer
        const parsed = parseClinicExcel(buffer)
        setStudents(parsed)
        setPreviewIndices(sampleIndices(parsed.length, PREVIEW_COUNT))

        // 학생 계정 매칭 (카카오 발송·저장에 필요)
        const { matches } = await matchClinicStudents(
          parsed.map((s) => ({ name: s.name, school: s.school })),
        )
        const map: Record<number, string | null> = {}
        matches.forEach((m, i) => { map[i] = m.studentId })
        setMatchMap(map)
      } catch (err) {
        setError(err instanceof Error ? err.message : '엑셀 파싱 중 오류가 발생했습니다.')
      }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }, [processFile])

  // 드래그앤드롭 — 페이지 어디에나 엑셀을 떨어뜨리면 업로드 (report-builder와 동일 패턴)
  const [dragOver, setDragOver] = useState(false)
  useEffect(() => {
    function hasFiles(e: DragEvent) {
      const types = e.dataTransfer?.types
      return !!types && Array.from(types).includes('Files')
    }
    function onDragEnterOver(e: DragEvent) {
      if (!hasFiles(e)) return
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
      setDragOver(true)
    }
    function onDrop(e: DragEvent) {
      e.preventDefault()
      setDragOver(false)
      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length === 0) return
      const file = files.find((f) => /\.(xlsx?|xls)$/i.test(f.name))
      if (file) processFile(file)
      else setError(`엑셀 파일(.xlsx, .xls)만 업로드할 수 있습니다. (받은 파일: ${files[0]?.name ?? '알 수 없음'})`)
    }
    function onDragLeave(e: DragEvent) {
      if (!e.relatedTarget) setDragOver(false)
    }
    window.addEventListener('dragenter', onDragEnterOver, true)
    window.addEventListener('dragover', onDragEnterOver, true)
    window.addEventListener('drop', onDrop, true)
    window.addEventListener('dragleave', onDragLeave, true)
    return () => {
      window.removeEventListener('dragenter', onDragEnterOver, true)
      window.removeEventListener('dragover', onDragEnterOver, true)
      window.removeEventListener('drop', onDrop, true)
      window.removeEventListener('dragleave', onDragLeave, true)
    }
  }, [processFile])

  // DB 저장 — 매칭된 학생만, 같은 날짜 기존 클리닉 리포트는 덮어씀(수정)
  const handleSave = useCallback(async () => {
    if (!startDate) { setError('날짜를 먼저 선택하세요.'); return }
    const targets = students
      .map((s, i) => ({ student: s, index: i, studentId: matchMap[i] }))
      .filter((t): t is typeof t & { studentId: string } => !!t.studentId)
    if (targets.length === 0) { setError('매칭된 학생이 없어 저장할 수 없습니다.'); return }

    setError('')
    setSaving(true)
    setSavedCount(null)
    setSaveProgress({ cur: 0, total: targets.length })

    try {
      await document.fonts.ready
      const items: Array<{ studentId: string; reportDate: string; contentJson: ClinicContent; imageBase64: string }> = []

      for (let i = 0; i < targets.length; i++) {
        const { student, index, studentId } = targets[i]
        setSaveProgress({ cur: i + 1, total: targets.length })
        const node = captureRefs.current.get(index)
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
          reportDate: startDate,
          contentJson: {
            type: 'clinic',
            school: student.school,
            grade: student.grade,
            arrivalTime: student.arrivalTime,
            departureTime: student.departureTime,
            clinicContent: student.clinicContent,
          },
          imageBase64,
        })
      }

      const res = await saveClinicReports(items)
      if (res.error) { setError(res.error); return }
      setSavedCount(res.saved)
      setSendResult('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
      setSaveProgress(null)
    }
  }, [students, matchMap, startDate])

  // 저장된 리포트를 학부모 카카오톡으로 일괄 발송
  const handleSend = useCallback(async () => {
    if (!startDate) return
    if (!confirm(`${dateString || startDate} 클리닉 리포트를 전체 학부모에게 카카오톡으로 발송하시겠습니까?`)) return
    setSending(true)
    setSendResult('')
    try {
      const res = await sendBatchClinicKakao(startDate)
      if (res.error && res.sent === 0) setError(res.error)
      else setSendResult(`${res.sent}명 발송 완료${res.failed > 0 ? ` · ${res.failed}명 실패` : ''}`)
    } finally {
      setSending(false)
    }
  }, [startDate, dateString])

  const handleDownloadAll = useCallback(async () => {
    if (students.length === 0) return
    setDownloading(true)
    setDownloadProgress(0)

    try {
      await document.fonts.ready
      const zip = new JSZip()

      for (let i = 0; i < students.length; i++) {
        const student = students[i]
        const node = captureRefs.current.get(i)
        if (!node) continue

        // data: URL을 fetch로 재조회하면 CSP connect-src에 막힘 — toBlob 직행
        const blob = await toBlob(node, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true,
          width: node.offsetWidth,
          height: node.offsetHeight,
        })
        if (!blob) continue
        zip.file(`${student.school}_${student.name}.png`, blob)
        setDownloadProgress(Math.round(((i + 1) / students.length) * 100))
      }

      const sanitizedDate = dateString.replace(/\//g, '-')
      const zipBlob = await zip.generateAsync({ type: 'blob' })
      saveAs(zipBlob, `클리닉리포트_${sanitizedDate || todayString()}.zip`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloading(false)
      setDownloadProgress(0)
    }
  }, [students, dateString])

  return (
    <div>
      {/* 드래그 중 오버레이 */}
      {dragOver && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 pointer-events-none"
          aria-hidden
        >
          <div className="rounded-2xl border-2 border-dashed border-white bg-white/10 px-10 py-8 text-center">
            <p className="text-lg font-bold text-white">엑셀 파일을 여기에 놓으세요</p>
            <p className="mt-1 text-sm text-zinc-300">클리닉 리포트 엑셀 (.xlsx)</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <Link
          href="/admin/reports"
          className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
          </svg>
          리포트 목록
        </Link>
        <h1 className="text-xl font-bold text-zinc-950">클리닉 리포트 생성</h1>
        <p className="mt-0.5 text-sm text-zinc-400">엑셀(구글 스프레드시트) 파일을 업로드하면 학생별 클리닉 리포트 이미지를 만듭니다.</p>
      </div>

      {/* 컨트롤 패널 */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 mb-6 space-y-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          {/* 날짜 선택 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-zinc-500">날짜</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => { const t = todayString(); setStartDate(t); setEndDate(t) }}
                className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-bold text-zinc-700 hover:bg-zinc-50 transition-colors whitespace-nowrap"
              >
                당일
              </button>
              <div className="w-[200px]">
                <DatePicker value={startDate} onChange={setStartDate} placeholder="시작일" />
              </div>
              <span className="text-zinc-400 font-bold text-sm">~</span>
              <div className="w-[200px]">
                <DatePicker value={endDate} onChange={setEndDate} placeholder="종료일" />
              </div>
            </div>
          </div>

          <div className="flex-1" />

          {/* 엑셀 업로드 */}
          <label className="cursor-pointer rounded-xl border-2 border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            엑셀 업로드
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
          </label>

          {/* ZIP 다운로드 */}
          {students.length > 0 && (
            <button
              onClick={handleDownloadAll}
              disabled={downloading || saving}
              className="rounded-xl border-2 border-zinc-200 px-4 py-3 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {downloading ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {downloadProgress > 0 ? `${downloadProgress}%` : '준비 중…'}
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  ZIP 다운로드 ({students.length}명)
                </>
              )}
            </button>
          )}

          {/* 리포트 저장 (DB — 발송/관리용) */}
          {students.length > 0 && (
            <button
              onClick={handleSave}
              disabled={saving || downloading || matchedCount === 0}
              className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {saveProgress ? `${saveProgress.cur}/${saveProgress.total}` : '저장 중…'}
                </>
              ) : (
                <>리포트 저장 ({matchedCount}명)</>
              )}
            </button>
          )}
        </div>

        {/* 미매칭 안내 (있을 때만 한 줄) */}
        {students.length > 0 && unmatchedCount > 0 && (
          <p className="text-xs text-amber-600">
            학생 계정을 찾지 못한 {unmatchedCount}명은 저장·발송에서 제외됩니다 (ZIP 다운로드에는 포함)
          </p>
        )}

        {/* 저장 완료 + 발송 */}
        {savedCount !== null && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3">
            <p className="text-sm font-medium text-zinc-900">
              ✓ {savedCount}명 저장 완료
              {sendResult && <span className="ml-2 text-zinc-600">· {sendResult}</span>}
            </p>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleSend}
                disabled={sending}
                className="rounded-lg bg-zinc-950 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                {sending ? '발송 중…' : sendResult ? '카카오 재발송' : '카카오 전체 발송'}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/admin/reports/clinic/session/${startDate}`)}
                className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                관리 페이지 →
              </button>
            </div>
          </div>
        )}

        {/* 제목 미리보기 */}
        {dateString && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400">생성될 제목</span>
            <span className="text-sm font-bold text-zinc-800">
              {dateString} 역전의 수학 클리닉 리포트
            </span>
            {students.length > 0 && (
              <>
                <span className="text-zinc-300">·</span>
                <span className="text-xs text-zinc-500">{students.length}명</span>
              </>
            )}
          </div>
        )}

        {/* 진행률 바 */}
        {downloading && (
          <div className="w-full bg-zinc-100 rounded-full h-1.5">
            <div
              className="bg-zinc-950 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${downloadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* 에러 */}
      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3 items-start">
          <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-red-700">오류</p>
            <p className="text-sm text-red-600 mt-0.5 whitespace-pre-line">{error}</p>
          </div>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 shrink-0">✕</button>
        </div>
      )}

      {/* 초기 안내 */}
      {students.length === 0 && !error && (
        <div className="rounded-xl border border-zinc-200 bg-white flex flex-col items-center justify-center py-20 gap-5 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-zinc-800 mb-1">엑셀 파일을 업로드하세요</h2>
            <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
              파일을 이 화면에 <strong>드래그해서 놓거나</strong>, 위의 &ldquo;엑셀 업로드&rdquo; 버튼을 사용하세요.
              구글 스프레드시트에서 <strong>xlsx로 다운로드</strong>한 파일도 그대로 사용할 수 있습니다.
            </p>
          </div>
          <div className="text-xs text-zinc-400 space-y-1 bg-zinc-50 rounded-xl px-6 py-4 text-left">
            <p className="font-bold text-zinc-500 mb-2">시트 컬럼 순서 (첫 번째 시트 기준)</p>
            <p>학교 | 학년 | 이름 | 등원시각 | 하원시각 | 클리닉 내용</p>
            <p className="mt-1 text-zinc-300">첫 행은 헤더 · 이름이 비어있는 행은 건너뜀 · 시각은 16:30 형식</p>
          </div>
          <button
            type="button"
            onClick={downloadSampleExcel}
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 border border-zinc-200 rounded-lg px-4 py-2 hover:bg-zinc-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            샘플 엑셀 다운로드
          </button>
        </div>
      )}

      {/* 카드 영역 */}
      {students.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-zinc-800">
                리포트 미리보기
                <span className="ml-2 text-sm font-normal text-zinc-400">
                  (전체 {students.length}명 중 {previewIndices.length}명 샘플)
                </span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                다운로드 시 전체 {students.length}명 모두 PNG로 저장됩니다
              </p>
            </div>
            <p className="text-xs text-zinc-400">카드 420px · ×2 = 840px PNG</p>
          </div>

          {/* 미리보기 카드 (랜덤 최대 4개) */}
          <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, 420px)' }}>
            {previewIndices.map((idx) => (
              <div key={`preview-${idx}`} className="shadow-md rounded-sm overflow-hidden w-fit">
                <ClinicReportCard student={students[idx]} dateString={dateString} />
              </div>
            ))}
          </div>

          {/* 오프스크린 캡처용 DOM */}
          <div
            aria-hidden="true"
            style={{
              position: 'fixed',
              left: -10000,
              top: 0,
              width: 420,
              pointerEvents: 'none',
              zIndex: -1,
            }}
          >
            {students.map((student, i) => (
              <ClinicReportCard
                key={`capture-${i}`}
                ref={(el) => {
                  if (el) captureRefs.current.set(i, el)
                  else captureRefs.current.delete(i)
                }}
                student={student}
                dateString={dateString}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
