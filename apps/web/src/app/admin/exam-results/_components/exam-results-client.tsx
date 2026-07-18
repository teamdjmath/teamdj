'use client'

import { useState, useTransition } from 'react'
import { createExamResult, deleteExamResult, autoRankExam } from '@/lib/actions/exam-results'
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
  rankInExam: number | null
  totalInExam: number | null
  autoRank: boolean
  estimatedGrade: string | null
  estimatedPercentile: number | null
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

import { gradeFromScore } from '@/lib/grade'

import { InputField, SelectField, TextareaField } from '@/components/ui/form-field'

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
  // 시험 그룹 접기/펼치기 — 기본은 전부 접힘 (리스트 형태)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
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
    gradeSystem: '5' as '5' | '9',   // 5등급제(22개정) 기본 — 현 고3만 9등급제(15개정)
    gradeCuts: {} as Record<string, string>,
    rankInExam: '',
    totalInExam: '',
    autoRank: false,
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
      gradeSystem: '5',
      gradeCuts: {},
      rankInExam: '',
      totalInExam: '',
      autoRank: false,
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

    // 선택한 등급제 범위의 컷만 저장 (5등급제: 1~4, 9등급제: 1~8)
    const maxCut = form.gradeSystem === '5' ? 4 : 8
    const gradeCuts: Record<string, number> = {}
    for (let g = 1; g <= maxCut; g++) {
      const val = Number(form.gradeCuts[String(g)])
      if (!isNaN(val) && form.gradeCuts[String(g)] !== '') {
        gradeCuts[String(g)] = val
      }
    }

    const rankInExam = form.rankInExam !== '' ? Number(form.rankInExam) : null
    const totalInExam = form.totalInExam !== '' ? Number(form.totalInExam) : null

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
        rankInExam,
        totalInExam,
        autoRank: form.autoRank,
      })
      if (!res.success) { setError(res.error); return }
      setCreateOpen(false)
      resetForm()
    })
  }

  function handleAutoRank(examName: string, examDate: string) {
    if (!confirm(`"${examName}" (${examDate}) 시험 결과에 자동 등수를 산정합니다.`)) return
    startTransition(async () => {
      const res = await autoRankExam(examName, examDate)
      if (!res.success) alert(res.error)
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
          const g = gradeFromScore(r.score, r.gradeCuts)
          if (g) gradeDist[g] = (gradeDist[g] ?? 0) + 1
        }

        const isOpen = expanded[key] ?? false
        return (
          <div key={key} className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
            {/* 시험 헤더 — 클릭으로 접기/펼치기 */}
            <div
              className={`flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-zinc-50/60 transition-colors ${isOpen ? 'border-b border-zinc-100' : ''}`}
              onClick={() => setExpanded((m) => ({ ...m, [key]: !isOpen }))}
            >
              <svg
                className={`w-4 h-4 shrink-0 text-zinc-400 transition-transform ${isOpen ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <div className="flex-1">
                <p className="text-sm font-semibold text-zinc-900">{first.examName}</p>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {examTypeLabel(first.examType)} · {first.examDate} · {rows.length}명
                </p>
              </div>
              {/* 통계 요약 — 접힌 상태에서도 항상 표시 */}
              <div className="hidden sm:flex gap-4 text-xs text-zinc-500">
                <span>평균 <strong className="text-zinc-900">{avg}</strong></span>
                <span>최고 <strong className="text-zinc-900">{max}</strong></span>
                <span>최저 <strong className="text-zinc-900">{min}</strong></span>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={(e) => { e.stopPropagation(); handleAutoRank(first.examName, first.examDate) }}
                className="shrink-0 rounded-lg border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
              >
                등수 자동 산정
              </button>
            </div>

            {/* 등급 분포 (등급컷 있는 경우) */}
            {isOpen && Object.keys(gradeDist).length > 0 && (
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
            {isOpen && (
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
                    {r.rankInExam != null && (
                      <p className="text-xs text-zinc-500 w-16 text-right">
                        {r.rankInExam}/{r.totalInExam ?? '?'}등{r.autoRank && <span className="text-zinc-300 ml-0.5">A</span>}
                      </p>
                    )}
                    <p className="text-sm font-semibold text-zinc-900 w-16 text-right">
                      {r.score} / {r.maxScore}
                    </p>
                    {Object.keys(r.gradeCuts).length > 0 && (
                      <p className="text-xs text-zinc-500 w-12 text-right">
                        {gradeFromScore(r.score, r.gradeCuts)}
                      </p>
                    )}
                    {r.estimatedGrade && (
                      <span
                        title="정규분포 근사 기반 추정치 — 실제 등급과 다를 수 있습니다"
                        className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 w-16 text-center"
                      >
                        예상 {r.estimatedGrade}
                      </span>
                    )}
                    <svg className="h-4 w-4 text-zinc-300 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6" />
                    </svg>
                  </li>
                ))}
            </ul>
            )}
          </div>
        )
      })}

      {/* 결과 등록 모달 */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
          onClick={() => setCreateOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-3xl bg-white p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-950">특별 시험 결과 등록</h2>
                <p className="text-sm text-zinc-500 mt-1">학생의 시험 점수와 피드백을 기록하세요.</p>
              </div>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              {/* 분반 + 학생 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <SelectField
                  label="분반"
                  required
                  value={form.classId}
                  onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value, studentId: '' }))}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </SelectField>
                <SelectField
                  label="학생"
                  required
                  value={form.studentId}
                  onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}
                >
                  <option value="">학생 선택</option>
                  {filteredStudents.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </SelectField>
              </div>

              {/* 시험명 + 유형 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <InputField
                  label="시험명"
                  required
                  value={form.examName}
                  onChange={(e) => setForm((f) => ({ ...f, examName: e.target.value }))}
                  placeholder="예: 2024년 6월 평가원 모의고사"
                />
                <SelectField
                  label="유형"
                  required
                  value={form.examType}
                  onChange={(e) => setForm((f) => ({ ...f, examType: e.target.value }))}
                >
                  {EXAM_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </SelectField>
              </div>

              {/* 날짜 + 점수 + 만점 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <InputField
                  label="날짜"
                  type="date"
                  required
                  value={form.examDate}
                  onChange={(e) => setForm((f) => ({ ...f, examDate: e.target.value }))}
                />
                <InputField
                  label="실득 점수"
                  type="number"
                  required
                  min={0}
                  value={form.score}
                  onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
                  placeholder="점수 입력"
                />
                <InputField
                  label="시험 만점"
                  type="number"
                  required
                  min={1}
                  value={form.maxScore}
                  onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))}
                  placeholder="예: 100"
                />
              </div>

              {/* 등급컷 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className="block text-xs font-bold text-zinc-900 uppercase tracking-widest">
                    등급컷 설정 (선택)
                  </label>
                  {/* 등급제 선택 — 고1·2: 5등급제(22개정) / 현 고3: 9등급제(15개정) */}
                  <div className="ml-auto flex rounded-lg bg-zinc-100 p-0.5">
                    {([['5', '5등급제'], ['9', '9등급제']] as const).map(([val, label]) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, gradeSystem: val }))}
                        className={`rounded-md px-3 py-1 text-[11px] font-semibold transition-colors ${
                          form.gradeSystem === val
                            ? 'bg-white text-zinc-900 shadow-sm'
                            : 'text-zinc-400 hover:text-zinc-600'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  {GRADE_LABELS.slice(0, form.gradeSystem === '5' ? 4 : 8).map((label, idx) => (
                    <div key={idx} className="space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 block ml-1">{label}</span>
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
                        placeholder="점수"
                        className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs focus:border-zinc-900 focus:outline-none transition-all"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400 ml-1">
                  각 등급의 최저 기준 점수를 입력하면 등급이 자동 계산됩니다.
                  {form.gradeSystem === '5'
                    ? ' 4등급 컷까지 입력 — 미만은 5등급. (고1·2 / 22개정)'
                    : ' 8등급 컷까지 입력 — 미만은 9등급. (현 고3 / 15개정)'}
                </p>
              </div>

              {/* 등수 입력 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="block text-xs font-bold text-zinc-900 uppercase tracking-widest">
                    등수 (선택)
                  </label>
                  <label className="ml-auto flex items-center gap-1.5 text-xs text-zinc-500">
                    <input
                      type="checkbox"
                      className="accent-zinc-900"
                      checked={form.autoRank}
                      onChange={(e) => setForm((f) => ({ ...f, autoRank: e.target.checked }))}
                    />
                    자동 산정 (저장 후 그룹 내 자동 계산)
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <InputField
                    label="등수"
                    type="number"
                    min={1}
                    value={form.rankInExam}
                    onChange={(e) => setForm((f) => ({ ...f, rankInExam: e.target.value }))}
                    placeholder="예: 3"
                    disabled={form.autoRank}
                  />
                  <InputField
                    label="전체 인원"
                    type="number"
                    min={1}
                    value={form.totalInExam}
                    onChange={(e) => setForm((f) => ({ ...f, totalInExam: e.target.value }))}
                    placeholder="예: 30"
                    disabled={form.autoRank}
                  />
                </div>
              </div>

              {/* 학습 제안 */}
              <TextareaField
                label="학습 제안 및 피드백"
                value={form.studySuggestion}
                onChange={(e) => setForm((f) => ({ ...f, studySuggestion: e.target.value }))}
                placeholder="학생의 강점과 약점, 향후 학습 방향에 대한 구체적인 피드백을 남겨주세요."
                rows={4}
              />

              {error && (
                <div className="flex items-center gap-2 p-4 bg-red-50 rounded-2xl text-red-600">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-2xl bg-zinc-950 py-4 text-sm font-bold text-white shadow-xl transition-all hover:bg-zinc-800 hover:shadow-zinc-950/20 disabled:bg-zinc-200 disabled:text-zinc-400 active:scale-[0.98]"
              >
                {isPending ? '시험 결과 저장 중...' : '시험 결과 등록하기'}
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
              {detailResult.rankInExam != null && (
                <Row
                  label="등수"
                  value={`${detailResult.rankInExam} / ${detailResult.totalInExam ?? '?'}등${detailResult.autoRank ? ' (자동)' : ''}`}
                />
              )}
              {Object.keys(detailResult.gradeCuts).length > 0 && (
                <Row
                  label="등급"
                  value={gradeFromScore(detailResult.score, detailResult.gradeCuts) ?? '—'}
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
              {detailResult.estimatedGrade && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-3.5 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-amber-800">예상 등급 (추정치)</p>
                    <p className="text-sm font-bold text-amber-800">
                      {detailResult.estimatedGrade}
                      {detailResult.estimatedPercentile != null && (
                        <span className="ml-1 text-xs font-normal text-amber-600">
                          상위 {detailResult.estimatedPercentile}%
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-amber-700">
                    학원 내 등수는 실제 등급의 기준인 전국·학교 단위 모집단과 다릅니다. 이 값은
                    응시자 집단의 점수 분포(평균·표준편차)를 정규분포로 근사해 추정한 것으로,
                    실제 등급과 다를 수 있습니다.
                  </p>
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
