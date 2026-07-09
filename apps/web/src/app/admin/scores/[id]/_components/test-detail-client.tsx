'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { saveTestScores, bulkSaveTestScores } from '@/lib/actions/scores'
import type { BulkResult } from '@/lib/actions/scores'

type Student = { id: string; name: string }

interface Props {
  testId: string
  students: Student[]
  scoreMap: Record<string, number>
  absentMap: Record<string, string> // studentId → 미응시 사유 (미응시 학생만)
  gradeCuts: Record<string, number> | null
  examType: string
  maxScore: number
}

const GRADE_EXAM_TYPES = ['모의고사', '중간고사', '기말고사']

function calcGrade(score: number, cuts: Record<string, number>): number {
  for (let g = 1; g <= 9; g++) {
    if (score >= (cuts[g.toString()] ?? 0)) return g
  }
  return 9
}

export function TestDetailClient({
  testId,
  students,
  scoreMap,
  absentMap,
  gradeCuts,
  examType,
  maxScore,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [scores, setScores] = useState<Record<string, string>>(
    () => Object.fromEntries(Object.entries(scoreMap).map(([k, v]) => [k, v.toString()])),
  )
  // 미응시: studentId → true, 사유: studentId → string
  const [absent, setAbsent] = useState<Record<string, boolean>>(
    () => Object.fromEntries(Object.keys(absentMap).map((k) => [k, true])),
  )
  const [absentReasons, setAbsentReasons] = useState<Record<string, string>>(
    () => ({ ...absentMap }),
  )
  const [saveErr, setSaveErr] = useState('')
  const [saveOk, setSaveOk]   = useState(false)

  const [omrOpen, setOmrOpen]       = useState(false)
  const [omrErr, setOmrErr]         = useState('')
  const [omrResult, setOmrResult]   = useState<BulkResult | null>(null)

  const showGrades = GRADE_EXAM_TYPES.includes(examType) && gradeCuts !== null

  // 통계 — 미응시 학생은 평균/최고/최저에서 제외
  const validScores = students
    .filter((s) => !absent[s.id])
    .map((s) => scores[s.id])
    .filter((v) => v !== undefined && v !== '')
    .map(Number)
    .filter((v) => !isNaN(v))

  const absentCount = students.filter((s) => absent[s.id]).length

  const avg = validScores.length > 0
    ? validScores.reduce((a, b) => a + b, 0) / validScores.length
    : null
  const max = validScores.length > 0 ? Math.max(...validScores) : null
  const min = validScores.length > 0 ? Math.min(...validScores) : null

  function handleSave() {
    setSaveErr('')
    setSaveOk(false)
    startTransition(async () => {
      // 미응시 학생: 점수 없이 미응시+사유로 저장 / 응시 학생: 입력된 점수만 저장
      const absentEntries = students
        .filter((s) => absent[s.id])
        .map((s) => ({
          studentId: s.id,
          score: null,
          isAbsent: true,
          absenceReason: absentReasons[s.id] ?? '',
        }))

      const scoreEntries = students
        .filter((s) => !absent[s.id] && scores[s.id] !== undefined && scores[s.id] !== '')
        .map((s) => ({ studentId: s.id, score: parseFloat(scores[s.id]) }))
        .filter((e) => !isNaN(e.score))

      const result = await saveTestScores(testId, [...scoreEntries, ...absentEntries])
      if (!result.success) { setSaveErr(result.error); return }
      setSaveOk(true)
      router.refresh()
    })
  }

  function toggleAbsent(studentId: string) {
    setAbsent((prev) => {
      const next = !prev[studentId]
      if (next) {
        // 미응시로 전환하면 입력돼 있던 점수는 비운다
        setScores((sc) => ({ ...sc, [studentId]: '' }))
      }
      return { ...prev, [studentId]: next }
    })
    setSaveOk(false)
  }

  async function handleOmrFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOmrErr('')

    const buf = await file.arrayBuffer()
    const XLSX = await import('xlsx')
    const wb   = XLSX.read(buf, { type: 'array' })
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const raw  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

    const rows = raw
      .map((r) => ({
        name:  String(r['이름']  ?? '').trim(),
        score: Number(r['점수']  ?? 0),
      }))
      .filter((r) => r.name)

    if (rows.length === 0) {
      setOmrErr('유효한 데이터 없음. 이름, 점수 컬럼을 확인하세요.')
      return
    }

    startTransition(async () => {
      const result = await bulkSaveTestScores(testId, rows)
      setOmrResult(result)
      // 로컬 점수도 업데이트 — 점수가 들어온 학생은 미응시 표시 해제
      const updated = { ...scores }
      const clearedAbsent = { ...absent }
      for (const row of rows) {
        const student = students.find((s) => s.name === row.name)
        if (student) {
          updated[student.id] = row.score.toString()
          clearedAbsent[student.id] = false
        }
      }
      setScores(updated)
      setAbsent(clearedAbsent)
      router.refresh()
    })
  }

  function closeOmr() {
    setOmrOpen(false)
    setOmrErr('')
    setOmrResult(null)
  }

  return (
    <div className="space-y-5">
      {/* 통계 */}
      {validScores.length > 0 && (
        <div className="flex flex-wrap gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">
          <span className="text-zinc-500">
            평균 <span className="font-bold text-zinc-900">{avg!.toFixed(1)}</span>
          </span>
          <span className="text-zinc-300">|</span>
          <span className="text-zinc-500">
            최고 <span className="font-bold text-zinc-900">{max}</span>
          </span>
          <span className="text-zinc-300">|</span>
          <span className="text-zinc-500">
            최저 <span className="font-bold text-zinc-900">{min}</span>
          </span>
          <span className="text-zinc-300">|</span>
          <span className="text-zinc-500">
            입력 <span className="font-bold text-zinc-900">{validScores.length}</span>/{students.length}명
          </span>
          {absentCount > 0 && (
            <>
              <span className="text-zinc-300">|</span>
              <span className="text-zinc-500">
                미응시 <span className="font-bold text-zinc-900">{absentCount}</span>명 <span className="text-zinc-400">(평균 제외)</span>
              </span>
            </>
          )}
        </div>
      )}

      {/* 컨트롤 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-700">학생별 점수 입력</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setOmrErr(''); setOmrResult(null); setOmrOpen(true) }}
            className="rounded-lg border border-zinc-200 px-3.5 py-2 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            OMR 업로드
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className="rounded-lg bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {pending ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      {saveErr && <p className="text-sm text-red-500">{saveErr}</p>}
      {saveOk  && <p className="text-sm text-zinc-400">저장되었습니다.</p>}

      {/* 점수 입력 테이블 */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">이름</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500">
                점수 <span className="font-normal text-zinc-400">({maxScore}점 만점)</span>
              </th>
              {showGrades && (
                <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500">등급</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {students.length === 0 ? (
              <tr>
                <td
                  colSpan={showGrades ? 3 : 2}
                  className="py-10 text-center text-sm text-zinc-400"
                >
                  소속 학생이 없습니다.
                </td>
              </tr>
            ) : (
              students.map((s) => {
                const isAbsent = !!absent[s.id]
                const raw      = scores[s.id]
                const numScore = !isAbsent && raw !== undefined && raw !== '' ? parseFloat(raw) : null
                const grade    =
                  showGrades && numScore !== null && !isNaN(numScore) && gradeCuts
                    ? calcGrade(numScore, gradeCuts)
                    : null

                return (
                  <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-zinc-900">{s.name}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-center gap-2">
                        {isAbsent ? (
                          <input
                            type="text"
                            value={absentReasons[s.id] ?? ''}
                            onChange={(e) =>
                              setAbsentReasons((prev) => ({ ...prev, [s.id]: e.target.value }))
                            }
                            className="w-40 rounded-lg border border-amber-200 bg-amber-50 px-2 py-2 text-sm text-zinc-800 placeholder:text-amber-400 focus:border-amber-400 focus:outline-none transition-all"
                            placeholder="미응시 사유 (선택)"
                          />
                        ) : (
                          <input
                            type="number"
                            value={scores[s.id] ?? ''}
                            min={0}
                            max={maxScore}
                            step="0.5"
                            onChange={(e) =>
                              setScores((prev) => ({ ...prev, [s.id]: e.target.value }))
                            }
                            className="w-24 rounded-lg border border-zinc-200 bg-white px-2 py-2 text-center text-base font-bold text-zinc-950 placeholder:text-zinc-300 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 focus:outline-none transition-all shadow-sm"
                            placeholder="—"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => toggleAbsent(s.id)}
                          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            isAbsent
                              ? 'bg-amber-500 text-white hover:bg-amber-600'
                              : 'border border-zinc-200 text-zinc-400 hover:border-zinc-400 hover:text-zinc-700'
                          }`}
                        >
                          미응시
                        </button>
                      </div>
                    </td>
                    {showGrades && (
                      <td className="px-5 py-3 text-center">
                        {grade !== null ? (
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                              grade === 1
                                ? 'bg-zinc-900 text-white'
                                : grade <= 3
                                  ? 'bg-zinc-700 text-white'
                                  : grade <= 6
                                    ? 'bg-zinc-200 text-zinc-700'
                                    : 'bg-zinc-100 text-zinc-400'
                            }`}
                          >
                            {grade}등급
                          </span>
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* OMR 업로드 모달 */}
      <Modal open={omrOpen} onClose={closeOmr} title="OMR 엑셀 업로드" size="sm">
        {omrResult ? (
          <div className="space-y-4">
            <div className="rounded-lg bg-zinc-50 p-4 text-sm">
              <p className="font-medium text-zinc-900">업로드 완료</p>
              <p className="mt-1 text-zinc-600">성공: {omrResult.succeeded}건</p>
              {omrResult.failed.length > 0 && (
                <p className="mt-0.5 text-red-500">실패: {omrResult.failed.length}건</p>
              )}
            </div>
            {omrResult.failed.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-red-100 bg-red-50">
                {omrResult.failed.map((f, i) => (
                  <div
                    key={i}
                    className="flex justify-between border-b border-red-100 px-3 py-2 text-xs last:border-b-0"
                  >
                    <span className="text-zinc-700">{f.name}</span>
                    <span className="text-red-500">{f.reason}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={closeOmr}
              className="w-full rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              닫기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-zinc-400">
              필수 컬럼: <b className="text-zinc-700">이름</b>, <b className="text-zinc-700">점수</b>
            </p>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">엑셀 파일</label>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleOmrFile}
                disabled={pending}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 file:mr-3 file:rounded file:border-0 file:bg-zinc-200 file:px-2 file:py-1 file:text-xs file:text-zinc-700 disabled:opacity-50"
              />
              {omrErr && <p className="mt-1 text-sm text-red-500">{omrErr}</p>}
            </div>
            <button
              type="button"
              onClick={closeOmr}
              className="w-full rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              취소
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
