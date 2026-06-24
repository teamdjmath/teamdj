'use client'

import { useRef, useState, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { toPng } from 'html-to-image'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { StudentReportCard, type StudentData } from './student-report-card'

const DAYS_KR = ['일', '월', '화', '수', '목', '금', '토']
const MAX_ASSIGNMENTS = 5
const PREVIEW_COUNT = 4

function formatDateLabel(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const dow = DAYS_KR[d.getDay()]
  return `${y}.${m}.${day} (${dow})`
}

function excelTimeToString(value: unknown): string {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d{1,2}:\d{2}/.test(trimmed)) return trimmed
    return trimmed
  }
  // Excel serial time fraction (0–1 = one day)
  if (typeof value === 'number' && value >= 0 && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60)
    const h = Math.floor(totalMinutes / 60)
    const min = totalMinutes % 60
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }
  if (value instanceof Date) {
    const h = value.getHours()
    const min = value.getMinutes()
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
  }
  return String(value)
}

function parseExcel(buffer: ArrayBuffer): StudentData[] {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

  if (rows.length < 2) throw new Error('데이터가 없습니다. 헤더 행 포함 최소 2행이 필요합니다.')

  const headers = (rows[0] as unknown[]).map((h) => String(h ?? '').trim())
  const assignmentHeaders = headers.slice(7)
  if (assignmentHeaders.length === 0) throw new Error('과제 컬럼(8번째 컬럼 이후)이 없습니다.')

  const selectedAssignmentHeaders =
    assignmentHeaders.length > MAX_ASSIGNMENTS
      ? assignmentHeaders.slice(assignmentHeaders.length - MAX_ASSIGNMENTS)
      : assignmentHeaders
  const startColOffset = Math.max(0, assignmentHeaders.length - MAX_ASSIGNMENTS)

  const students: StudentData[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    const hasData = row.some((c) => c !== '' && c !== null && c !== undefined)
    if (!hasData) continue

    const name = String(row[2] ?? '').trim()
    if (!name) continue

    const assignments = selectedAssignmentHeaders.map((aName, idx) => {
      const colIdx = 7 + startColOffset + idx
      const rawVal = row[colIdx]
      const score =
        typeof rawVal === 'number'
          ? Math.round(rawVal)
          : parseInt(String(rawVal ?? '0'), 10) || 0
      return { name: aName, score }
    })

    students.push({
      school: String(row[0] ?? '').trim(),
      grade: String(row[1] ?? '').trim(),
      name,
      arrivalTime: excelTimeToString(row[3]),
      departureTime: excelTimeToString(row[4]),
      studyContent: String(row[5] ?? '').trim(),
      specialNote: String(row[6] ?? '').trim(),
      assignments,
    })
  }

  if (students.length === 0)
    throw new Error('유효한 학생 데이터가 없습니다. 이름 컬럼(3번째)을 확인해주세요.')

  return students
}

// 배열에서 n개 랜덤 선택 (원본 순서 유지)
function sampleIndices(total: number, n: number): number[] {
  if (total <= n) return Array.from({ length: total }, (_, i) => i)
  const picked = new Set<number>()
  while (picked.size < n) picked.add(Math.floor(Math.random() * total))
  return Array.from(picked).sort((a, b) => a - b)
}

export function ReportBuilderClient() {
  const [reportTitle, setReportTitle] = useState('')
  const [reportDate, setReportDate] = useState('')
  const [students, setStudents] = useState<StudentData[]>([])
  const [previewIndices, setPreviewIndices] = useState<number[]>([])
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  // 전체 학생 카드 ref (숨겨진 캡처용 DOM)
  const captureRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const dateLabel = formatDateLabel(reportDate)

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    setStudents([])
    setPreviewIndices([])
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer
        const parsed = parseExcel(buffer)
        setStudents(parsed)
        setPreviewIndices(sampleIndices(parsed.length, PREVIEW_COUNT))
      } catch (err) {
        setError(err instanceof Error ? err.message : '엑셀 파싱 중 오류가 발생했습니다.')
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }, [])

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

        // 카드 실제 크기 기준으로 캡처 (동적 높이 지원)
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 2,          // 620px × 2 = 1240px wide PNG (선명하지만 작은 파일)
          backgroundColor: '#ffffff',
          skipFonts: true,        // cross-origin 스타일시트 CORS 방지
          width: node.offsetWidth,
          height: node.offsetHeight,
        })

        const res = await fetch(dataUrl)
        const blob = await res.blob()
        zip.file(`${student.school}_${student.name}.png`, blob)
        setDownloadProgress(Math.round(((i + 1) / students.length) * 100))
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      saveAs(zipBlob, `학습리포트_${dateLabel || '전체'}.zip`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloading(false)
      setDownloadProgress(0)
    }
  }, [students, dateLabel])

  const cardProps = { reportTitle, reportDateLabel: dateLabel }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* ── 헤더 */}
      <header className="sticky top-0 z-40 border-b border-zinc-100 bg-white/90 backdrop-blur-sm">
        <div className="container max-w-5xl mx-auto px-4 flex h-14 items-center justify-between">
          <a href="/" className="text-sm font-black tracking-tighter text-zinc-950 uppercase italic">
            TeamDJ
          </a>
          <span className="text-sm font-semibold text-zinc-600">학습 리포트 생성기</span>
        </div>
      </header>

      {/* ── 컨트롤 패널 */}
      <div className="sticky top-14 z-30 bg-white border-b border-zinc-200 shadow-sm">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          <div className="flex flex-wrap items-end gap-4">
            {/* 리포트 제목 */}
            <div className="flex flex-col gap-1 min-w-[220px]">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                리포트 제목
              </label>
              <input
                type="text"
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="예: 기말고사 내신대비"
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>

            {/* 날짜 */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                날짜
              </label>
              <input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
            </div>

            {/* 제목 미리보기 */}
            {dateLabel && (
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                  제목 미리보기
                </span>
                <span className="text-sm font-semibold text-zinc-800 py-2">
                  {dateLabel}{reportTitle ? `  ${reportTitle}` : ''}
                </span>
              </div>
            )}

            <div className="flex-1" />

            {/* 엑셀 업로드 */}
            <label className="cursor-pointer rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              엑셀 업로드
              <input type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
            </label>

            {/* 전체 다운로드 */}
            {students.length > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={downloading}
                className="rounded-lg bg-zinc-950 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {downloading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {downloadProgress > 0 ? `캡처 중… ${downloadProgress}%` : '준비 중…'}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    전체 다운로드 ({students.length}명 ZIP)
                  </>
                )}
              </button>
            )}
          </div>

          {/* 진행률 바 */}
          {downloading && (
            <div className="mt-3 w-full bg-zinc-100 rounded-full h-1.5">
              <div
                className="bg-zinc-950 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── 본문 */}
      <main className="container max-w-5xl mx-auto px-4 py-8">
        {/* 에러 */}
        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3 items-start">
            <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-semibold text-red-700">오류</p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
            </div>
            <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600 shrink-0">✕</button>
          </div>
        )}

        {/* 초기 안내 */}
        {students.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-800 mb-1">엑셀 파일을 업로드하세요</h2>
              <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
                학교·학년·이름·등원/하원·수업내용·특이사항 + 과제 컬럼이 있는 .xlsx 파일을 올리면
                학생별 리포트 카드가 생성됩니다.
              </p>
            </div>
            <div className="text-xs text-zinc-400 space-y-1">
              <p>컬럼 순서: 학교 | 학년 | 이름 | 등원 | 하원 | 수업내용 | 특이사항 | 과제1 | 과제2 | …</p>
              <p>과제 컬럼 헤더 = 과제명, 값 = 0~5 정수</p>
            </div>
            <a
              href="/sample-report.xlsx"
              download
              className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-700 border border-zinc-200 rounded-lg px-4 py-2 hover:bg-zinc-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              샘플 엑셀 다운로드
            </a>
          </div>
        )}

        {/* ── 카드 영역 */}
        {students.length > 0 && (
          <>
            {/* 미리보기 헤더 */}
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
              <p className="text-xs text-zinc-400">카드 420px · ×2 = 840px PNG (카톡 최적화)</p>
            </div>

            {/* 미리보기 카드 (랜덤 최대 3개) — 2열 그리드 */}
            <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, 420px)' }}>
              {previewIndices.map((idx) => (
                <div key={`preview-${idx}`} className="shadow-md rounded-sm overflow-hidden w-fit">
                  <StudentReportCard student={students[idx]} {...cardProps} />
                </div>
              ))}
            </div>

            {/* 오프스크린 캡처용 DOM (전체 학생, 화면 밖) */}
            <div
              aria-hidden="true"
              style={{
                position: 'fixed',
                left: -10000,
                top: 0,
                width: 420,   // 카드 너비와 동일하게 맞춤
                pointerEvents: 'none',
                zIndex: -1,
              }}
            >
              {students.map((student, i) => (
                <StudentReportCard
                  key={`capture-${i}`}
                  ref={(el) => {
                    if (el) captureRefs.current.set(i, el)
                    else captureRefs.current.delete(i)
                  }}
                  student={student}
                  {...cardProps}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* ── 푸터 */}
      <footer className="mt-16 py-8 border-t border-zinc-100">
        <p className="text-center text-xs text-zinc-400">© 2026 TeamDJ · 학습 리포트 생성기</p>
      </footer>
    </div>
  )
}
