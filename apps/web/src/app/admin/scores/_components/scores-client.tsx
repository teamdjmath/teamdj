'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Modal } from '@/components/ui/modal'
import { InputField, SelectField } from '@/components/ui/form-field'
import { createScore, bulkCreateScores, deleteScore } from '@/lib/actions/scores'
import type { ScoreBulkRow, BulkResult } from '@/lib/actions/scores'

type ClassOption = { id: string; name: string }
type Student = { id: string; name: string }

type Score = {
  id: string
  score: number
  total_q: number | null
  obj_q: number | null
  subj_q: number | null
  difficulty: string
  test_date: string
  input_method: string
  student_id: string
  class_id: string
  studentName: string
  className: string
}

const DIFFICULTIES = ['상', '중', '하']
const TODAY = new Date().toISOString().split('T')[0]

interface Props {
  classOptions: ClassOption[]
  classStudentsMap: Record<string, Student[]>
  selectedClassId: string | null
  selectedDate: string | null
  scores: Score[]
}

type OmrState =
  | { step: 'form' }
  | { step: 'preview'; rows: ScoreBulkRow[]; classId: string; date: string }
  | { step: 'result'; result: BulkResult }

export function ScoresClient({ classOptions, classStudentsMap, selectedClassId, selectedDate, scores }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  // Create modal
  const [createOpen, setCreateOpen] = useState(false)
  const [createErr, setCreateErr] = useState('')
  const [createForm, setCreateForm] = useState({
    classId: selectedClassId ?? classOptions[0]?.id ?? '',
    studentId: '',
    testDate: TODAY,
    score: '',
    totalQ: '',
    objQ: '',
    subjQ: '',
    difficulty: '',
  })

  // OMR modal
  const [omrOpen, setOmrOpen] = useState(false)
  const [omrState, setOmrState] = useState<OmrState>({ step: 'form' })
  const [omrForm, setOmrForm] = useState({ classId: selectedClassId ?? classOptions[0]?.id ?? '', date: TODAY })
  const [omrErr, setOmrErr] = useState('')

  const studentsForCreate = classStudentsMap[createForm.classId] ?? []
  const studentsForOmr = classStudentsMap[omrForm.classId] ?? []

  // Filters
  function applyFilter(classId: string, date: string) {
    const p = new URLSearchParams()
    if (classId) p.set('classId', classId)
    if (date) p.set('date', date)
    router.push(`/admin/scores?${p.toString()}`)
  }

  // Create submit
  function handleCreate() {
    if (!createForm.classId) { setCreateErr('분반을 선택하세요.'); return }
    if (!createForm.studentId) { setCreateErr('학생을 선택하세요.'); return }
    if (!createForm.score) { setCreateErr('점수를 입력하세요.'); return }
    setCreateErr('')
    startTransition(async () => {
      const result = await createScore({
        classId: createForm.classId,
        studentId: createForm.studentId,
        testDate: createForm.testDate,
        score: parseFloat(createForm.score),
        totalQ: createForm.totalQ ? parseInt(createForm.totalQ) : undefined,
        objQ: createForm.objQ ? parseInt(createForm.objQ) : undefined,
        subjQ: createForm.subjQ ? parseInt(createForm.subjQ) : undefined,
        difficulty: createForm.difficulty || undefined,
      })
      if (!result.success) { setCreateErr(result.error); return }
      setCreateOpen(false)
      router.refresh()
    })
  }

  // OMR: parse xlsx
  async function handleOmrFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setOmrErr('')
    const buf = await file.arrayBuffer()
    const XLSX = await import('xlsx')
    const wb = XLSX.read(buf, { type: 'array' })
    const ws = wb.Sheets[wb.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws)

    const rows: ScoreBulkRow[] = raw
      .map((r) => ({
        name: String(r['이름'] ?? '').trim(),
        score: Number(r['점수'] ?? 0),
        total_q: r['총문항'] != null ? Number(r['총문항']) : undefined,
        obj_q: r['객관식'] != null ? Number(r['객관식']) : undefined,
        subj_q: r['주관식'] != null ? Number(r['주관식']) : undefined,
        difficulty: r['난이도'] != null ? String(r['난이도']).trim() : undefined,
      }))
      .filter((r) => r.name)

    if (rows.length === 0) {
      setOmrErr('유효한 데이터가 없습니다. 이름, 점수 컬럼을 확인하세요.')
      return
    }
    setOmrState({ step: 'preview', rows, classId: omrForm.classId, date: omrForm.date })
  }

  function handleOmrSave() {
    if (omrState.step !== 'preview') return
    const { rows, classId, date } = omrState
    startTransition(async () => {
      const result = await bulkCreateScores(classId, date, rows)
      setOmrState({ step: 'result', result })
      router.refresh()
    })
  }

  function closeOmr() {
    setOmrOpen(false)
    setOmrState({ step: 'form' })
    setOmrErr('')
  }

  // Delete
  function handleDelete(id: string) {
    if (!confirm('점수를 삭제하시겠습니까?')) return
    startTransition(async () => {
      await deleteScore(id)
      router.refresh()
    })
  }

  // Stats
  const avg = scores.length > 0 ? scores.reduce((s, r) => s + r.score, 0) / scores.length : null
  const max = scores.length > 0 ? Math.max(...scores.map((r) => r.score)) : null
  const min = scores.length > 0 ? Math.min(...scores.map((r) => r.score)) : null

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-950">테스트 점수</h1>
        <div className="flex gap-2">
          <button
            onClick={() => { setOmrForm({ classId: selectedClassId ?? classOptions[0]?.id ?? '', date: TODAY }); setOmrOpen(true) }}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            OMR 일괄 등록
          </button>
          <button
            onClick={() => { setCreateForm((f) => ({ ...f, classId: selectedClassId ?? classOptions[0]?.id ?? '', studentId: '', score: '' })); setCreateErr(''); setCreateOpen(true) }}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            개별 등록
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={selectedClassId ?? ''}
          onChange={(e) => applyFilter(e.target.value, selectedDate ?? '')}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:border-zinc-400"
        >
          <option value="">전체 분반</option>
          {classOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={selectedDate ?? ''}
          onChange={(e) => applyFilter(selectedClassId ?? '', e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:border-zinc-400"
        />
        {(selectedClassId || selectedDate) && (
          <button
            onClick={() => applyFilter('', '')}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* 통계 */}
      {scores.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-4 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm">
          <span className="text-zinc-500">평균 <span className="font-bold text-zinc-900">{avg!.toFixed(1)}</span></span>
          <span className="text-zinc-300">|</span>
          <span className="text-zinc-500">최고 <span className="font-bold text-zinc-900">{max}</span></span>
          <span className="text-zinc-300">|</span>
          <span className="text-zinc-500">최저 <span className="font-bold text-zinc-900">{min}</span></span>
          <span className="text-zinc-300">|</span>
          <span className="text-zinc-500">총 <span className="font-bold text-zinc-900">{scores.length}</span>건</span>
        </div>
      )}

      {/* 목록 */}
      {scores.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center text-sm text-zinc-400">
          등록된 점수가 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                <th className="px-4 py-3 font-medium">학생</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">분반</th>
                <th className="px-4 py-3 font-medium">점수</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">총문항</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">객관식</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">주관식</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">난이도</th>
                <th className="px-4 py-3 font-medium">시험일</th>
                <th className="px-4 py-3 font-medium hidden lg:table-cell">입력방식</th>
                <th className="px-4 py-3 font-medium text-right">삭제</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {scores.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-900">{s.studentName}</td>
                  <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">{s.className}</td>
                  <td className="px-4 py-3 font-semibold text-zinc-950">{s.score}</td>
                  <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">{s.total_q ?? '-'}</td>
                  <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">{s.obj_q ?? '-'}</td>
                  <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">{s.subj_q ?? '-'}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {s.difficulty ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">{s.difficulty}</span>
                    ) : <span className="text-zinc-300">-</span>}
                  </td>
                  <td className="px-4 py-3 text-zinc-500">{s.test_date}</td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${s.input_method === 'omr' ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                      {s.input_method === 'omr' ? 'OMR' : '수기'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={pending}
                      className="rounded-md px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors"
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 개별 등록 모달 */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="점수 개별 등록" size="md">
        <div className="space-y-4">
          <SelectField
            label="분반"
            required
            value={createForm.classId}
            onChange={(e) => setCreateForm((f) => ({ ...f, classId: e.target.value, studentId: '' }))}
          >
            <option value="">선택하세요</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectField>

          <SelectField
            label="학생"
            required
            value={createForm.studentId}
            onChange={(e) => setCreateForm((f) => ({ ...f, studentId: e.target.value }))}
            disabled={!createForm.classId}
          >
            <option value="">{createForm.classId ? '선택하세요' : '분반을 먼저 선택하세요'}</option>
            {studentsForCreate.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </SelectField>

          <InputField
            label="시험일"
            type="date"
            required
            value={createForm.testDate}
            onChange={(e) => setCreateForm((f) => ({ ...f, testDate: e.target.value }))}
          />

          <InputField
            label="점수"
            type="number"
            required
            value={createForm.score}
            onChange={(e) => setCreateForm((f) => ({ ...f, score: e.target.value }))}
            placeholder="예: 85"
          />

          <div className="grid grid-cols-3 gap-3">
            <InputField
              label="총문항"
              type="number"
              value={createForm.totalQ}
              onChange={(e) => setCreateForm((f) => ({ ...f, totalQ: e.target.value }))}
              placeholder="전체"
            />
            <InputField
              label="객관식"
              type="number"
              value={createForm.objQ}
              onChange={(e) => setCreateForm((f) => ({ ...f, objQ: e.target.value }))}
              placeholder="객관식"
            />
            <InputField
              label="주관식"
              type="number"
              value={createForm.subjQ}
              onChange={(e) => setCreateForm((f) => ({ ...f, subjQ: e.target.value }))}
              placeholder="주관식"
            />
          </div>

          <SelectField
            label="난이도"
            value={createForm.difficulty}
            onChange={(e) => setCreateForm((f) => ({ ...f, difficulty: e.target.value }))}
          >
            <option value="">선택 안 함</option>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </SelectField>

          {createErr && <p className="text-sm text-red-500">{createErr}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setCreateOpen(false)}
              className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleCreate}
              disabled={pending}
              className="flex-1 rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {pending ? '저장 중...' : '등록'}
            </button>
          </div>
        </div>
      </Modal>

      {/* OMR 일괄 등록 모달 */}
      <Modal open={omrOpen} onClose={closeOmr} title="OMR 일괄 등록" size="lg">
        {omrState.step === 'form' && (
          <div className="space-y-4">
            <SelectField
              label="분반"
              required
              value={omrForm.classId}
              onChange={(e) => setOmrForm((f) => ({ ...f, classId: e.target.value }))}
            >
              <option value="">선택하세요</option>
              {classOptions.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </SelectField>

            <InputField
              label="시험일"
              type="date"
              required
              value={omrForm.date}
              onChange={(e) => setOmrForm((f) => ({ ...f, date: e.target.value }))}
            />

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700">
                엑셀 파일 <span className="text-red-500">*</span>
              </label>
              <p className="mb-2 text-xs text-zinc-400">컬럼: 이름, 점수, 총문항, 객관식, 주관식, 난이도</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleOmrFile}
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 file:mr-3 file:rounded file:border-0 file:bg-zinc-200 file:px-2 file:py-1 file:text-xs file:text-zinc-700"
              />
              {omrErr && <p className="mt-1 text-sm text-red-500">{omrErr}</p>}
            </div>

            {/* 분반 학생 안내 */}
            {omrForm.classId && studentsForOmr.length > 0 && (
              <div className="rounded-lg bg-zinc-50 px-3 py-2 text-xs text-zinc-500">
                {studentsForOmr.length}명 등록됨: {studentsForOmr.slice(0, 5).map((s) => s.name).join(', ')}{studentsForOmr.length > 5 ? ` 외 ${studentsForOmr.length - 5}명` : ''}
              </div>
            )}

            <button
              onClick={closeOmr}
              className="w-full rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              취소
            </button>
          </div>
        )}

        {omrState.step === 'preview' && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">{omrState.rows.length}건 미리보기</p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-zinc-200">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-zinc-50">
                  <tr className="border-b border-zinc-200 text-left text-zinc-500">
                    <th className="px-3 py-2 font-medium">이름</th>
                    <th className="px-3 py-2 font-medium">점수</th>
                    <th className="px-3 py-2 font-medium">총문항</th>
                    <th className="px-3 py-2 font-medium">난이도</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {omrState.rows.map((r, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2">{r.name}</td>
                      <td className="px-3 py-2 font-semibold">{r.score}</td>
                      <td className="px-3 py-2">{r.total_q ?? '-'}</td>
                      <td className="px-3 py-2">{r.difficulty ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setOmrState({ step: 'form' })}
                className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleOmrSave}
                disabled={pending}
                className="flex-1 rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {pending ? '저장 중...' : '일괄 저장'}
              </button>
            </div>
          </div>
        )}

        {omrState.step === 'result' && (
          <div className="space-y-4">
            <div className="rounded-lg bg-zinc-50 p-4 text-sm">
              <p className="font-medium text-zinc-900">저장 완료</p>
              <p className="mt-1 text-zinc-600">성공: {omrState.result.succeeded}건</p>
              {omrState.result.failed.length > 0 && (
                <p className="mt-0.5 text-red-500">실패: {omrState.result.failed.length}건</p>
              )}
            </div>
            {omrState.result.failed.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-lg border border-red-100 bg-red-50">
                {omrState.result.failed.map((f, i) => (
                  <div key={i} className="flex justify-between border-b border-red-100 px-3 py-2 text-xs last:border-b-0">
                    <span className="text-zinc-700">{f.name}</span>
                    <span className="text-red-500">{f.reason}</span>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={closeOmr}
              className="w-full rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
            >
              닫기
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
