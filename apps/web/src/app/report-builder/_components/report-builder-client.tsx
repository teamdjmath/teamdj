'use client'

import { useRef, useState, useCallback, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { toBlob } from 'html-to-image'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { StudentReportCard, type StudentData, type AssignmentItem } from './student-report-card'
import { DatePicker } from '@/components/ui/date-picker'

const PREVIEW_COUNT = 4

// ── helpers ──────────────────────────────────────────────────────────────────

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

function formatShortDate(value: unknown): string {
  if (!value && value !== 0) return ''
  if (value instanceof Date) {
    return `${value.getMonth() + 1}/${value.getDate()}`
  }
  if (typeof value === 'string' && value.trim()) {
    const kor = value.match(/(\d+)월\s*(\d+)일/)
    if (kor) return `${kor[1]}/${kor[2]}`
    const d = new Date(value)
    if (!isNaN(d.getTime())) return `${d.getMonth() + 1}/${d.getDate()}`
    return value.trim()
  }
  if (typeof value === 'number' && value > 1) {
    const d = new Date(Math.round((value - 25569) * 86400 * 1000))
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`
  }
  return ''
}

function extractLectureNum(val: unknown): number {
  if (typeof val === 'number') return Math.round(val)
  const str = String(val ?? '').replace(/[^0-9]/g, '')
  return str ? parseInt(str) : 0
}

function findAssignments(
  map: Map<string, AssignmentItem[]>,
  name: string,
): AssignmentItem[] {
  const key = name.trim().toLowerCase()
  for (const [k, v] of map) {
    if (k.trim().toLowerCase() === key) return v
  }
  return []
}

// ── date helpers ──────────────────────────────────────────────────────────────

function todayString(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
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
  const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
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

function parseExcel(
  buffer: ArrayBuffer,
  fileName: string,
): { students: StudentData[]; className: string; classNotice: string } {
  // Validate filename: {분반명}_학습리포트.xlsx
  const baseName = fileName.replace(/\.(xlsx?|xls)$/i, '')
  const SUFFIX = '_학습리포트'
  if (!baseName.endsWith(SUFFIX)) {
    throw new Error(
      `파일명 오류\n\n파일명을 "{분반명}_학습리포트.xlsx" 형식으로 변경한 뒤 다시 업로드해주세요.\n현재 파일명: ${fileName}`,
    )
  }
  const className = baseName.slice(0, -SUFFIX.length)
  if (!className) {
    throw new Error('분반명이 비어있습니다. "{분반명}_학습리포트.xlsx" 형식을 확인해주세요.')
  }

  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })

  // ── 과제검사 sheet ────────────────────────────────────────────────────────
  const assignmentMap = new Map<string, AssignmentItem[]>()
  const aSheetName = wb.SheetNames.find((n) => n.replace(/\s/g, '').includes('과제검사'))

  if (aSheetName) {
    const aSheet = wb.Sheets[aSheetName]
    const aRows: unknown[][] = XLSX.utils.sheet_to_json(aSheet, { header: 1, defval: '' })

    if (aRows.length >= 2) {
      const headers = (aRows[0] as unknown[]).map((h) => String(h ?? '').trim())
      // cols: 강좌번호(0) | 과제명(1) | 출제일(2) | 제출일(3) | student…
      const studentCols = headers.slice(4)

      const dataRows = aRows
        .slice(1)
        .filter((r) => (r as unknown[]).some((c) => c !== '' && c !== null && c !== undefined))
      const last10 = dataRows.slice(-10)

      for (let colIdx = 0; colIdx < studentCols.length; colIdx++) {
        const studentName = studentCols[colIdx]?.trim()
        if (!studentName) continue

        const items: AssignmentItem[] = []
        for (const row of last10) {
          const r = row as unknown[]
          const lectureNum = extractLectureNum(r[0])
          if (!lectureNum) continue
          const slotNum = ((lectureNum - 1) % 10) + 1
          const raw = r[4 + colIdx]
          const completion =
            typeof raw === 'number'
              ? Math.min(5, Math.max(0, Math.round(raw)))
              : Math.min(5, Math.max(0, parseInt(String(raw ?? '0')) || 0))

          items.push({
            slotNum,
            lectureNum,
            issueDate: formatShortDate(r[2]),
            submitDate: formatShortDate(r[3]),
            completion,
          })
        }
        items.sort((a, b) => a.slotNum - b.slotNum)
        assignmentMap.set(studentName, items)
      }
    }
  }

  // ── Main sheet ────────────────────────────────────────────────────────────
  // cols: 학교(0) | 학년(1) | 이름(2) | 출석여부(3) | 등원(4) | 하원(5) | 학습내용(6) | 테스트점수(7) | 특이사항(8) | 공지사항(9)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
  if (rows.length < 2) throw new Error('데이터가 없습니다. 헤더 포함 2행 이상이 필요합니다.')

  // 공지사항: 반 전체 공통 — 첫 번째 비어있지 않은 셀 값 사용
  let classNotice = ''
  for (let i = 1; i < rows.length; i++) {
    const v = String((rows[i] as unknown[])[9] ?? '').trim()
    if (v) { classNotice = v; break }
  }

  const students: StudentData[] = []

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    if (!row.some((c) => c !== '' && c !== null && c !== undefined)) continue
    const name = String(row[2] ?? '').trim()
    if (!name) continue

    const rawScore = row[7]
    let testScore: number | null = null
    if (rawScore !== '' && rawScore !== null && rawScore !== undefined) {
      const n = parseFloat(String(rawScore))
      if (!isNaN(n)) testScore = n
    }

    students.push({
      school: String(row[0] ?? '').trim(),
      grade: String(row[1] ?? '').trim(),
      name,
      attendance: String(row[3] ?? '').trim() || '출석',
      arrivalTime: excelTimeToString(row[4]),
      departureTime: excelTimeToString(row[5]),
      studyContent: String(row[6] ?? '').trim(),
      testScore,
      specialNote: String(row[8] ?? '').trim(),
      assignments: findAssignments(assignmentMap, name),
    })
  }

  if (students.length === 0) {
    throw new Error('유효한 학생 데이터가 없습니다. 이름 컬럼(3번째)을 확인해주세요.')
  }

  return { students, className, classNotice }
}

// ── random preview ────────────────────────────────────────────────────────────

function sampleIndices(total: number, n: number): number[] {
  if (total <= n) return Array.from({ length: total }, (_, i) => i)
  const picked = new Set<number>()
  while (picked.size < n) picked.add(Math.floor(Math.random() * total))
  return Array.from(picked).sort((a, b) => a - b)
}

// ── component ─────────────────────────────────────────────────────────────────

export function ReportBuilderClient() {
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [maxScoreStr, setMaxScoreStr] = useState('')
  const [students, setStudents] = useState<StudentData[]>([])
  const [className, setClassName] = useState('')
  const [classNotice, setClassNotice] = useState('')
  const [previewIndices, setPreviewIndices] = useState<number[]>([])
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState(0)

  const captureRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const dateString = generateDateString(startDate, endDate)
  const maxScore = maxScoreStr ? parseFloat(maxScoreStr) || null : null

  const { classAvg, classStdDev } = useMemo(() => {
    const scores = students.filter((s) => s.testScore !== null).map((s) => s.testScore!)
    if (scores.length === 0) return { classAvg: null, classStdDev: null }
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length
    const variance = scores.reduce((sum, s) => sum + (s - avg) ** 2, 0) / scores.length
    return {
      classAvg: Math.round(avg * 10) / 10,
      classStdDev: Math.round(Math.sqrt(variance) * 10) / 10,
    }
  }, [students])

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setError('')
    setStudents([])
    setPreviewIndices([])
    setClassName('')
    setClassNotice('')
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const buffer = ev.target?.result as ArrayBuffer
        const { students: parsed, className: cn, classNotice: notice } = parseExcel(buffer, file.name)
        setStudents(parsed)
        setClassName(cn)
        setClassNotice(notice)
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

        // fetch(dataUrl)로 data: URL을 다시 읽으면 CSP connect-src에 막혀
        // "Failed to fetch"가 남 — toBlob으로 바로 Blob을 받는다.
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
      saveAs(zipBlob, `${className}_${sanitizedDate || '학습리포트'}.zip`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloading(false)
      setDownloadProgress(0)
    }
  }, [students, dateString, className])

  const cardSharedProps = { className, dateString, maxScore, classAvg, classStdDev, classNotice }

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
        <div className="container max-w-5xl mx-auto px-4 py-4 space-y-3">
          <div className="flex items-end gap-3">
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

            {/* 만점 입력 */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-500">만점</label>
              <input
                type="number"
                min={1}
                value={maxScoreStr}
                onChange={(e) => setMaxScoreStr(e.target.value)}
                placeholder="100"
                className="w-16 rounded-xl border border-zinc-200 px-3 py-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
              />
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

            {/* 전체 다운로드 */}
            {students.length > 0 && (
              <button
                onClick={handleDownloadAll}
                disabled={downloading}
                className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {downloading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {downloadProgress > 0 ? `${downloadProgress}%` : '준비 중…'}
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    전체 다운로드 ({students.length}명)
                  </>
                )}
              </button>
            )}
          </div>

          {/* 제목 미리보기 */}
          {dateString && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">생성될 제목</span>
              <span className="text-sm font-bold text-zinc-800">
                {dateString} 역전의 수학 학습결과
              </span>
              {students.length > 0 && className && (
                <>
                  <span className="text-zinc-300">·</span>
                  <span className="text-xs text-zinc-500">{className} · {students.length}명</span>
                  {classAvg !== null && (
                    <>
                      <span className="text-zinc-300">·</span>
                      <span className="text-xs text-zinc-500">반 평균 {classAvg}점 / 표준편차 {classStdDev}점</span>
                    </>
                  )}
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
              <p className="text-sm text-red-600 mt-0.5 whitespace-pre-line">{error}</p>
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
                파일명은 반드시 <strong>{'{분반명}'}_학습리포트.xlsx</strong> 형식이어야 합니다.
              </p>
            </div>
            <div className="text-xs text-zinc-400 space-y-1 bg-zinc-50 rounded-xl px-6 py-4 text-left">
              <p className="font-bold text-zinc-500 mb-2">학습리포트 시트 컬럼 순서</p>
              <p>학교 | 학년 | 이름 | 출석여부 | 등원 | 하원 | 학습내용 | 테스트점수 | 특이사항 | 공지사항</p>
              <p className="mt-1 text-zinc-300">공지사항은 반 전체 공통 — 첫 번째 행에만 입력 (나머지 행 비워도 됨)</p>
              <p className="mt-2 font-bold text-zinc-500">과제검사 시트 컬럼 순서</p>
              <p>강좌번호 | 과제명 | 출제일 | 제출일 | 홍길동 | 김철수 | 박지수 | …</p>
              <p className="mt-1 text-zinc-300">반 전체 동일 과제 · 각 학생 열에 이행도(0~5) 입력 · 마지막 10행 기준</p>
              <p className="mt-1 text-zinc-300">학생 추가 시 열을 직접 추가 (미입력 학생은 과제 없음으로 처리)</p>
              <p className="mt-2 font-bold text-zinc-500">개별 과제 시트 컬럼 순서 (동명이인 구분)</p>
              <p>학교명 | 학생이름 | 강좌번호 | 과제명 | 출제일 | 제출일 | 이행도</p>
            </div>
            <a
              href="/%EA%B3%A02%20%EB%AF%B8%EC%A0%81%EB%B6%842%20%EC%A0%95%EA%B7%9C%EB%B0%98_%ED%95%99%EC%8A%B5%EB%A6%AC%ED%8F%AC%ED%8A%B8.xlsx"
              download="고2 미적분2 정규반_학습리포트.xlsx"
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
                  <StudentReportCard student={students[idx]} {...cardSharedProps} />
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
                <StudentReportCard
                  key={`capture-${i}`}
                  ref={(el) => {
                    if (el) captureRefs.current.set(i, el)
                    else captureRefs.current.delete(i)
                  }}
                  student={student}
                  {...cardSharedProps}
                />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="mt-16 py-8 border-t border-zinc-100">
        <p className="text-center text-xs text-zinc-400">© 2026 TeamDJ · 학습 리포트 생성기</p>
      </footer>
    </div>
  )
}
