'use client'

import { useState, useTransition } from 'react'
import { createExamResult, deleteExamResult } from '@/lib/actions/exam-results'
import { EmptyState } from '@/components/ui/empty-state'

interface ClassOption { id: string; name: string }
interface StudentOption { id: string; name: string; classId: string }

interface ExamResult {
  id: string
  studentName: string
  className: string
  examName: string
  examType: string
  examDate: string
  score: number
  maxScore: number
  gradeCuts: Record<string, number>
  studySuggestion: string | null
}

const EXAM_TYPES = [
  { value: 'mock', label: '모의고사' },
  { value: 'midterm', label: '중간고사' },
  { value: 'final', label: '기말고사' },
  { value: 'other', label: '기타' },
]

const GRADE_LABELS = ['1등급', '2등급', '3등급', '4등급', '5등급', '6등급', '7등급', '8등급', '9등급']

function examTypeLabel(t: string) {
  return EXAM_TYPES.find((e) => e.value === t)?.label ?? t
}

function gradeFromScore(score: number, gradeCuts: Record<string, number>): string {
  for (let g = 1; g <= 9; g++) {
    const cut = gradeCuts[String(g)]
    if (cut !== undefined && score >= cut) return `${g}등급`
  }
  return '9등급'
}

export function ExamResultsClient({
  classes,
  students,
  results,
}: {
  classes: ClassOption[]
  students: StudentOption[]
  results: ExamResult[]
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [detailResult, setDetailResult] = useState<ExamResult | null>(null)
  const [filterClassId, setFilterClassId] = useState('')
  const [filterExamType, setFilterExamType] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // 폼 상태
  const [form, setForm] = useState({
    classId: classes[0]?.id ?? '',
    studentId: '',
    examName: '',
    examType: 'mock',
    examDate: '',
    score: '',
    maxScore: '100',
    studySuggestion: '',
    gradeCuts: {} as Record<string, string>,
  })

  const filteredStudents = form.classId
    ? students.filter((s) => s.classId === form.classId)
    : students

  function resetForm() {
    setForm({
      classId: classes[0]?.id ?? '',
      studentId: '',
      examName: '',
      examType: 'mock',
      examDate: '',
      score: '',
      maxScore: '100',
      studySuggestion: '',
      gradeCuts: {},
    })
    setError(null)
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.studentId) { setError('학생을 선택하세요'); return }
    if (!form.examName.trim()) { setError('시험명을 입력하세요'); return }
    if (!form.examDate) { setError('시험 날짜를 선택하세요'); return }
    const score = Number(form.score)
    const maxScore = Number(form.maxScore)
    if (isNaN(score) || score < 0) { setError('점수를 올바르게 입력하세요'); return }
    if (isNaN(maxScore) || maxScore <= 0) { setError('만점을 올바르게 입력하세요'); return }

    const gradeCuts: Record<string, number> = {}
    for (let g = 1; g <= 9; g++) {
      const val = Number(form.gradeCuts[String(g)])
      if (!isNaN(val) && form.gradeCuts[String(g)] !== '') {
        gradeCuts[String(g)] = val
      }
    }

    startTransition(async () => {
      const res = await createExamResult({
        studentId: form.studentId,
        classId: form.classId,
        examName: form.examName.trim(),
        examType: form.examType,
        examDate: form.examDate,
        score,
        maxScore,
        gradeCuts,
        studySuggestion: form.studySuggestion,
      })
      if (!res.success) { setError(res.error); return }
      setCreateOpen(false)
      resetForm()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('이 결과를 삭제하시겠습니까?')) return
    startTransition(async () => {
      const res = await deleteExamResult(id)
      if (!res.success) { alert(res.error); return }
      setDetailResult(null)
    })
  }

  // 필터된 결과
  const filtered = results.filter((r) => {
    if (filterClassId && r.className !== classes.find((c) => c.id === filterClassId)?.name) return false
    if (filterExamType && r.examType !== filterExamType) return false
    return true
  })

  // 반별 통계 (같은 examName + examType 묶기)
  const examGroups: Record<string, ExamResult[]> = {}
  for (const r of filtered) {
    const key = `${r.examName}__${r.examDate}`
    if (!examGroups[key]) examGroups[key] = []
    examGroups[key].push(r)
  }

  return (
    <>
      {/* 필터 + 등록 버튼 */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterClassId}
          onChange={(e) => setFilterClassId(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none"
        >
          <option value="">전체 분반</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterExamType}
          onChange={(e) => setFilterExamType(e.target.value)}
          className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:border-zinc-400 focus:outline-none"
        >
          <option value="">전체 유형</option>
          {EXAM_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { resetForm(); setCreateOpen(true) }}
          className="ml-auto rounded-xl bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          결과 등록
        </button>
      </div>

      {/* 시험별 그룹 통계 + 목록 */}
      {Object.entries(examGroups).length === 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white">
          <EmptyState message="등록된 시험 결과가 없습니다." description="시험 결과 추가 버튼으로 등록하세요." />
        </div>
      )}
      {Object.entries(examGroups).map(([key, rows]) => {
        const first = rows[0]!
        const scores = rows.map((r) => r.score)
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        const max = Math.max(...scores)
        const min = Math.min(...scores)

        // 등급 분포
        const gradeDist: Record<string, number> = {}
        for (const r of rows) {
          if (Object.keys(r.gradeCuts).length > 0) {
            const g = gradeFromScore(r.score, r.gradeCuts)
            gradeDist[g] = (gradeDist[g] ?? 0) + 1
          }
        }

        return (
          <div key={key} className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            {/* 시험 헤더 */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-100">
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-900">{first.examName}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {examTypeLabel(first.examType)} · {first.examDate} · {rows.length}명
                </p>
              </div>
              {/* 통계 요약 */}
              <div className="hidden sm:flex gap-4 text-xs text-zinc-500">
                <span>평균 <strong className="text-zinc-900">{avg}</strong></span>
                <span>최고 <strong className="text-zinc-900">{max}</strong></span>
                <span>최저 <strong className="text-zinc-900">{min}</strong></span>
              </div>
            </div>

            {/* 등급 분포 (등급컷 있는 경우) */}
            {Object.keys(gradeDist).length > 0 && (
              <div className="flex gap-1.5 flex-wrap px-5 py-3 border-b border-zinc-50">
                {Object.entries(gradeDist)
                  .sort((a, b) => Number(a[0].replace('등급', '')) - Number(b[0].replace('등급', '')))
                  .map(([grade, cnt]) => (
                    <span
                      key={grade}
                      className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600"
                    >
                      {grade} {cnt}명
                    </span>
                  ))}
              </div>
            )}

            {/* 학생별 결과 목록 */}
            <ul className="divide-y divide-zinc-50">
              {rows
                .sort((a, b) => b.score - a.score)
                .map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 cursor-pointer transition-colors"
                    onClick={() => setDetailResult(r)}
                  >
                    <p className="flex-1 text-sm text-zinc-800">{r.studentName}</p>
                    <p className="text-xs text-zinc-400">{r.className}</p>
                    <p className="text-sm font-semibold text-zinc-900 w-16 text-right">
                      {r.score} / {r.maxScore}
                    </p>
                    {Object.keys(r.gradeCuts).length > 0 && (
                      <p className="text-xs text-zinc-500 w-12 text-right">
                        {gradeFromScore(r.score, r.gradeCuts)}
                      </p>
                    )}
                    <svg className="h-4 w-4 text-zinc-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                    </svg>
                  </li>
                ))}
            </ul>
          </div>
        )
      })}

      {/* 결과 등록 모달 */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white px-5 pt-5 pb-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">시험 결과 등록</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="text-sm text-zinc-400 hover:text-zinc-700"
              >
                닫기
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* 분반 + 학생 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">분반</label>
                  <select
                    value={form.classId}
                    onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value, studentId: '' }))}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm focus:border-zinc-400 focus:outline-none"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">학생</label>
                  <select
                    value={form.studentId}
                    onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm focus:border-zinc-400 focus:outline-none"
                  >
                    <option value="">선택</option>
                    {filteredStudents.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 시험명 + 유형 */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">시험명</label>
                  <input
                    type="text"
                    value={form.examName}
                    onChange={(e) => setForm((f) => ({ ...f, examName: e.target.value }))}
                    placeholder="예) 6월 모의고사"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm focus:border-zinc-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">유형</label>
                  <select
                    value={form.examType}
                    onChange={(e) => setForm((f) => ({ ...f, examType: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm focus:border-zinc-400 focus:outline-none"
                  >
                    {EXAM_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 날짜 + 점수 + 만점 */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">날짜</label>
                  <input
                    type="date"
                    value={form.examDate}
                    onChange={(e) => setForm((f) => ({ ...f, examDate: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm focus:border-zinc-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">점수</label>
                  <input
                    type="number"
                    min={0}
                    value={form.score}
                    onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
                    placeholder="점수"
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm focus:border-zinc-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-600">만점</label>
                  <input
                    type="number"
                    min={1}
                    value={form.maxScore}
                    onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm focus:border-zinc-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* 등급컷 */}
              <div>
                <label className="mb-2 block text-xs font-medium text-zinc-600">
                  등급컷 (선택, 각 등급 기준 점수)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {GRADE_LABELS.map((label, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="shrink-0 text-xs text-zinc-400 w-10">{label}</span>
                      <input
                        type="number"
                        min={0}
                        value={form.gradeCuts[String(idx + 1)] ?? ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            gradeCuts: { ...f.gradeCuts, [String(idx + 1)]: e.target.value },
                          }))
                        }
                        placeholder="점"
                        className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-xs focus:border-zinc-400 focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* 학습 제안 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600">학습 제안 (선택)</label>
                <textarea
                  value={form.studySuggestion}
                  onChange={(e) => setForm((f) => ({ ...f, studySuggestion: e.target.value }))}
                  placeholder="학습 방향이나 피드백을 입력하세요."
                  rows={3}
                  className="w-full resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none"
                />
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-xl bg-zinc-950 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:bg-zinc-200 disabled:text-zinc-400"
              >
                {isPending ? '저장 중…' : '저장'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 상세 모달 */}
      {detailResult && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-0 sm:px-4"
          onClick={() => setDetailResult(null)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white px-5 pt-5 pb-8 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-900">시험 결과 상세</h2>
              <button
                type="button"
                onClick={() => setDetailResult(null)}
                className="text-sm text-zinc-400 hover:text-zinc-700"
              >
                닫기
              </button>
            </div>

            <div className="space-y-3">
              <Row label="학생" value={`${detailResult.studentName} (${detailResult.className})`} />
              <Row label="시험명" value={detailResult.examName} />
              <Row label="유형" value={examTypeLabel(detailResult.examType)} />
              <Row label="날짜" value={detailResult.examDate} />
              <Row label="점수" value={`${detailResult.score} / ${detailResult.maxScore}`} />
              {Object.keys(detailResult.gradeCuts).length > 0 && (
                <Row
                  label="등급"
                  value={gradeFromScore(detailResult.score, detailResult.gradeCuts)}
                />
              )}
              {Object.keys(detailResult.gradeCuts).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-2">등급컷</p>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(detailResult.gradeCuts)
                      .sort((a, b) => Number(a[0]) - Number(b[0]))
                      .map(([g, cut]) => (
                        <span key={g} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                          {g}등급 {cut}점
                        </span>
                      ))}
                  </div>
                </div>
              )}
              {detailResult.studySuggestion && (
                <div>
                  <p className="text-xs font-medium text-zinc-400 mb-1">학습 제안</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed">
                    {detailResult.studySuggestion}
                  </p>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleDelete(detailResult.id)}
              disabled={isPending}
              className="mt-6 w-full rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              삭제
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-xs font-medium text-zinc-400">{label}</span>
      <span className="text-sm text-zinc-800 text-right">{value}</span>
    </div>
  )
}
