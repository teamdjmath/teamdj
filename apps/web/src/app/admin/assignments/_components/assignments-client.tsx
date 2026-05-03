'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Modal } from '@/components/ui/modal'
import { InputField, SelectField } from '@/components/ui/form-field'
import { createAssignment, updateAssignment, deleteAssignment } from '@/lib/actions/assignments'

type ClassOption = { id: string; name: string }

type Assignment = {
  id: string
  title: string
  category: string
  due_date: string
  week_num: number | null
  class_id: string
  className: string
}

const CATEGORIES = ['매월승리', 'KBS', 'EB-Schema', '기타']

const TODAY = new Date().toISOString().split('T')[0]

function isOverdue(due_date: string) {
  return due_date && due_date < TODAY
}

interface Props {
  classOptions: ClassOption[]
  selectedClassId: string | null
  assignments: Assignment[]
}

type ModalState =
  | { type: 'create' }
  | { type: 'edit'; assignment: Assignment }
  | null

export function AssignmentsClient({ classOptions, selectedClassId, assignments }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalState>(null)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState('')

  // Form state
  const [form, setForm] = useState({
    classId: selectedClassId ?? classOptions[0]?.id ?? '',
    title: '',
    category: CATEGORIES[0],
    dueDate: '',
    weekNum: '',
  })

  function openCreate() {
    setForm({ classId: selectedClassId ?? classOptions[0]?.id ?? '', title: '', category: CATEGORIES[0], dueDate: '', weekNum: '' })
    setErr('')
    setModal({ type: 'create' })
  }

  function openEdit(a: Assignment) {
    setForm({ classId: a.class_id, title: a.title, category: a.category || CATEGORIES[0], dueDate: a.due_date, weekNum: a.week_num?.toString() ?? '' })
    setErr('')
    setModal({ type: 'edit', assignment: a })
  }

  function handleClassFilter(classId: string) {
    const params = new URLSearchParams()
    if (classId) params.set('classId', classId)
    router.push(`/admin/assignments?${params.toString()}`)
  }

  function handleSubmit() {
    if (!form.title.trim()) { setErr('과제명을 입력하세요.'); return }
    if (!form.classId) { setErr('분반을 선택하세요.'); return }
    setErr('')
    startTransition(async () => {
      const data = {
        classId: form.classId,
        title: form.title.trim(),
        category: form.category,
        dueDate: form.dueDate,
        weekNum: form.weekNum ? parseInt(form.weekNum) : null,
      }
      const result =
        modal?.type === 'edit'
          ? await updateAssignment(modal.assignment.id, data)
          : await createAssignment(data)
      if (!result.success) { setErr(result.error); return }
      setModal(null)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('과제를 삭제하시겠습니까?')) return
    startTransition(async () => {
      await deleteAssignment(id)
      router.refresh()
    })
  }

  // Group assignments by week_num
  const grouped = new Map<string, Assignment[]>()
  for (const a of assignments) {
    const key = a.week_num != null ? `${a.week_num}주차` : '미분류'
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(a)
  }

  // Sort groups: numbered weeks first (ascending), then '미분류'
  const sortedKeys = [...grouped.keys()].sort((a, b) => {
    if (a === '미분류') return 1
    if (b === '미분류') return -1
    return parseInt(a) - parseInt(b)
  })

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-zinc-950">과제 관리</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3.5 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          과제 등록
        </button>
      </div>

      {/* 분반 필터 */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => handleClassFilter('')}
          className={[
            'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
            !selectedClassId ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
          ].join(' ')}
        >
          전체
        </button>
        {classOptions.map((c) => (
          <button
            key={c.id}
            onClick={() => handleClassFilter(c.id)}
            className={[
              'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
              selectedClassId === c.id ? 'bg-zinc-950 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
            ].join(' ')}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* 과제 목록 */}
      {assignments.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white py-16 text-center text-sm text-zinc-400">
          등록된 과제가 없습니다.
        </div>
      ) : (
        <div className="space-y-6">
          {sortedKeys.map((weekKey) => (
            <div key={weekKey}>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">{weekKey}</h2>
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-100 text-left text-xs text-zinc-400">
                      <th className="px-4 py-3 font-medium">과제명</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">카테고리</th>
                      <th className="px-4 py-3 font-medium hidden md:table-cell">분반</th>
                      <th className="px-4 py-3 font-medium">마감일</th>
                      <th className="px-4 py-3 font-medium text-right">액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {grouped.get(weekKey)!.map((a) => (
                      <tr key={a.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-zinc-900">{a.title}</td>
                        <td className="px-4 py-3 text-zinc-500 hidden sm:table-cell">
                          {a.category ? (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs">{a.category}</span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-zinc-500 hidden md:table-cell">{a.className}</td>
                        <td className="px-4 py-3">
                          {a.due_date ? (
                            <span className={isOverdue(a.due_date) ? 'text-red-500 font-medium' : 'text-zinc-500'}>
                              {a.due_date}
                              {isOverdue(a.due_date) && ' (마감)'}
                            </span>
                          ) : (
                            <span className="text-zinc-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/assignments/${a.id}`}
                              className="rounded-md bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200 transition-colors"
                            >
                              진행률
                            </Link>
                            <button
                              onClick={() => openEdit(a)}
                              className="rounded-md px-2.5 py-1 text-xs text-zinc-500 hover:bg-zinc-100 transition-colors"
                            >
                              수정
                            </button>
                            <button
                              onClick={() => handleDelete(a.id)}
                              disabled={pending}
                              className="rounded-md px-2.5 py-1 text-xs text-red-500 hover:bg-red-50 transition-colors"
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
            </div>
          ))}
        </div>
      )}

      {/* 등록/수정 모달 */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal?.type === 'edit' ? '과제 수정' : '과제 등록'}
        size="md"
      >
        <div className="space-y-4">
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

          <InputField
            label="과제명"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="과제 제목을 입력하세요"
          />

          <SelectField
            label="카테고리"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </SelectField>

          <InputField
            label="마감일"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
          />

          <InputField
            label="주차"
            type="number"
            value={form.weekNum}
            onChange={(e) => setForm((f) => ({ ...f, weekNum: e.target.value }))}
            placeholder="예: 1"
          />

          {err && <p className="text-sm text-red-500">{err}</p>}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setModal(null)}
              className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              disabled={pending}
              className="flex-1 rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {pending ? '저장 중...' : modal?.type === 'edit' ? '수정' : '등록'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
