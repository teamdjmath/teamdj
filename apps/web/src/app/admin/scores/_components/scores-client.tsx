'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui/modal'
import { InputField, SelectField } from '@/components/ui/form-field'
import { createTest, deleteTest } from '@/lib/actions/scores'
import type { GradeCuts } from '@/lib/actions/scores'

const EXAM_TYPES = ['일반', '모의고사', '중간고사', '기말고사', '기타'] as const
type ExamType = (typeof EXAM_TYPES)[number]
const GRADE_EXAM_TYPES: ExamType[] = ['모의고사', '중간고사', '기말고사']
const GRADE_NUMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const EXAM_TYPE_BADGE: Record<string, string> = {
  일반: 'bg-zinc-100 text-zinc-600',
  모의고사: 'bg-zinc-900 text-white',
  중간고사: 'bg-zinc-700 text-white',
  기말고사: 'bg-zinc-700 text-white',
  기타: 'bg-zinc-100 text-zinc-600',
}

type ClassOption = { id: string; name: string }
type Test = {
  id: string
  title: string
  examType: string
  testDate: string
  totalQ: number | null
  objQ: number | null
  subjQ: number | null
  difficulty: string
  maxScore: number
  gradeCuts: Record<string, number> | null
  classId: string
  className: string
}

interface Props {
  classOptions: ClassOption[]
  selectedClassId: string | null
  selectedDate: string | null
  tests: Test[]
}

type GradeCutForm = Record<(typeof GRADE_NUMS)[number], string>

const TODAY = new Date().toISOString().split('T')[0]
const emptyGradeCuts = (): GradeCutForm =>
  Object.fromEntries(GRADE_NUMS.map((g) => [g, ''])) as GradeCutForm

export function ScoresClient({ classOptions, selectedClassId, selectedDate, tests }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [err, setErr] = useState('')

  const [form, setForm] = useState({
    classId:    classOptions[0]?.id ?? '',
    title:      '',
    examType:   '일반' as ExamType,
    testDate:   TODAY,
    totalQ:     '',
    objQ:       '',
    subjQ:      '',
    difficulty: '',
    maxScore:   '100',
    gradeCuts:  emptyGradeCuts(),
  })

  const needsGradeCuts = GRADE_EXAM_TYPES.includes(form.examType as ExamType)

  function applyFilter(classId: string, date: string) {
    const p = new URLSearchParams()
    if (classId) p.set('classId', classId)
    if (date)    p.set('date', date)
    router.push(`/admin/scores?${p.toString()}`)
  }

  function openCreate() {
    setErr('')
    setForm({
      classId:    classOptions[0]?.id ?? '',
      title:      '',
      examType:   '일반',
      testDate:   TODAY,
      totalQ:     '',
      objQ:       '',
      subjQ:      '',
      difficulty: '',
      maxScore:   '100',
      gradeCuts:  emptyGradeCuts(),
    })
    setCreateOpen(true)
  }

  function handleCreate() {
    if (!form.classId)        { setErr('분반을 선택하세요.');     return }
    if (!form.title.trim())   { setErr('테스트명을 입력하세요.'); return }
    if (!form.testDate)       { setErr('날짜를 선택하세요.');     return }
    setErr('')

    startTransition(async () => {
      const gradeCuts = needsGradeCuts
        ? (Object.fromEntries(
            GRADE_NUMS.map((g) => [g, form.gradeCuts[g] ? parseFloat(form.gradeCuts[g]) : 0]),
          ) as GradeCuts)
        : undefined

      const result = await createTest({
        classId:    form.classId,
        title:      form.title.trim(),
        examType:   form.examType,
        testDate:   form.testDate,
        totalQ:     form.totalQ    ? parseInt(form.totalQ)    : undefined,
        objQ:       form.objQ      ? parseInt(form.objQ)      : undefined,
        subjQ:      form.subjQ     ? parseInt(form.subjQ)     : undefined,
        difficulty: form.difficulty || undefined,
        maxScore:   form.maxScore  ? parseFloat(form.maxScore) : 100,
        gradeCuts,
      })

      if (!result.success) { setErr(result.error); return }
      setCreateOpen(false)
      router.refresh()
    })
  }

  function handleDelete(id: string, title: string) {
    if (!confirm(`"${title}" 테스트와 모든 점수를 삭제하시겠습니까?`)) return
    startTransition(async () => {
      const result = await deleteTest(id)
      if (!result.success) alert(result.error)
      else router.refresh()
    })
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-950">테스트 점수</h1>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          테스트 생성
        </button>
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
            type="button"
            onClick={() => applyFilter('', '')}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-500 hover:bg-zinc-50 transition-colors"
          >
            초기화
          </button>
        )}
      </div>

      {/* 테스트 목록 */}
      {tests.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center text-sm text-zinc-400">
          등록된 테스트가 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">테스트명</th>
                <th className="hidden sm:table-cell px-5 py-3 text-left text-xs font-semibold text-zinc-500">분반</th>
                <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500">유형</th>
                <th className="hidden md:table-cell px-5 py-3 text-left text-xs font-semibold text-zinc-500">날짜</th>
                <th className="hidden md:table-cell px-5 py-3 text-center text-xs font-semibold text-zinc-500">총문항</th>
                <th className="hidden lg:table-cell px-5 py-3 text-center text-xs font-semibold text-zinc-500">난이도</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {tests.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/admin/scores/${t.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {t.title}
                    </Link>
                  </td>
                  <td className="hidden sm:table-cell px-5 py-3.5 text-zinc-500">{t.className}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${EXAM_TYPE_BADGE[t.examType] ?? 'bg-zinc-100 text-zinc-600'}`}>
                      {t.examType}
                    </span>
                  </td>
                  <td className="hidden md:table-cell px-5 py-3.5 text-zinc-500">{t.testDate}</td>
                  <td className="hidden md:table-cell px-5 py-3.5 text-center text-zinc-500">
                    {t.totalQ ?? '—'}
                  </td>
                  <td className="hidden lg:table-cell px-5 py-3.5 text-center text-zinc-500">
                    {t.difficulty || '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/admin/scores/${t.id}`}
                        className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                      >
                        상세
                      </Link>
                      <span className="text-zinc-200">|</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(t.id, t.title)}
                        disabled={pending}
                        className="text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 테스트 생성 모달 */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="테스트 생성" size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <SelectField
            label="분반"
            required
            value={form.classId}
            onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
          >
            <option value="">선택하세요</option>
            {classOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </SelectField>

          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="테스트명"
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="예: 6월 모의고사"
            />
            <SelectField
              label="유형"
              required
              value={form.examType}
              onChange={(e) => setForm((f) => ({ ...f, examType: e.target.value as ExamType }))}
            >
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </SelectField>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InputField
              label="날짜"
              type="date"
              required
              value={form.testDate}
              onChange={(e) => setForm((f) => ({ ...f, testDate: e.target.value }))}
            />
            <InputField
              label="만점"
              type="number"
              value={form.maxScore}
              onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))}
              placeholder="100"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <InputField
              label="총문항"
              type="number"
              value={form.totalQ}
              onChange={(e) => setForm((f) => ({ ...f, totalQ: e.target.value }))}
              placeholder="전체"
            />
            <InputField
              label="객관식"
              type="number"
              value={form.objQ}
              onChange={(e) => setForm((f) => ({ ...f, objQ: e.target.value }))}
              placeholder="객관식"
            />
            <InputField
              label="주관식"
              type="number"
              value={form.subjQ}
              onChange={(e) => setForm((f) => ({ ...f, subjQ: e.target.value }))}
              placeholder="주관식"
            />
          </div>

          <SelectField
            label="난이도"
            value={form.difficulty}
            onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
          >
            <option value="">선택 안 함</option>
            {['상', '중', '하'].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </SelectField>

          {needsGradeCuts && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-600">
                등급컷 <span className="text-zinc-400 font-normal">(각 등급 최저 점수)</span>
              </p>
              <div className="grid grid-cols-9 gap-1.5">
                {GRADE_NUMS.map((g) => (
                  <div key={g}>
                    <p className="text-center text-[11px] text-zinc-400 mb-1">{g}등급</p>
                    <input
                      type="number"
                      min={0}
                      max={200}
                      value={form.gradeCuts[g]}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          gradeCuts: { ...f.gradeCuts, [g]: e.target.value },
                        }))
                      }
                      className="w-full rounded border border-zinc-200 bg-zinc-50 px-1 py-1.5 text-center text-xs focus:outline-none focus:border-zinc-400"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {err && <p className="text-sm text-red-500">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              취소
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={pending}
              className="flex-1 rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {pending ? '생성 중…' : '생성'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
