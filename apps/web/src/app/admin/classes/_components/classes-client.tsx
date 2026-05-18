'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal } from '@/components/ui/modal'
import { InputField } from '@/components/ui/form-field'
import { createClass, updateClass, deleteClass, hardDeleteClass } from '@/lib/actions/classes'

const DAYS = [
  { label: '월', value: 1 },
  { label: '화', value: 2 },
  { label: '수', value: 3 },
  { label: '목', value: 4 },
  { label: '금', value: 5 },
  { label: '토', value: 6 },
  { label: '일', value: 0 },
]

type TaInfo = { id: string; name: string; role: string }

type ClassRow = {
  id: string
  name: string
  subject: string
  grade: string
  schedule: string | null
  start_time: string | null
  end_time: string | null
  day_of_week: number[] | null
  is_active: boolean
  studentCount: number
  tas: TaInfo[]
}

function roleLabel(role: string) {
  if (role === 'ta_admin') return '사무'
  if (role === 'ta_assistant') return '첨삭'
  return role
}

function DayCheckboxes({ defaultDays }: { defaultDays?: number[] | null }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-600">수업 요일</label>
      <div className="flex gap-3 flex-wrap">
        {DAYS.map(({ label, value }) => (
          <label key={value} className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              name="day_of_week"
              value={value}
              defaultChecked={defaultDays?.includes(value) ?? false}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
            />
            <span className="text-sm text-zinc-700">{label}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function TimeFields({ defaultStart, defaultEnd }: { defaultStart?: string | null; defaultEnd?: string | null }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <InputField
        label="시작 시간"
        name="start_time"
        type="time"
        defaultValue={defaultStart?.slice(0, 5) ?? ''}
      />
      <InputField
        label="종료 시간"
        name="end_time"
        type="time"
        defaultValue={defaultEnd?.slice(0, 5) ?? ''}
      />
    </div>
  )
}

function TaCheckboxes({ allTas, assignedIds }: { allTas: TaInfo[]; assignedIds?: string[] }) {
  if (allTas.length === 0) return null
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-zinc-600">담당 조교</label>
      <div className="max-h-40 overflow-y-auto rounded-xl border border-zinc-200 divide-y divide-zinc-100">
        {allTas.map((ta) => (
          <label
            key={ta.id}
            className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-zinc-50 transition-colors"
          >
            <input
              type="checkbox"
              name="taIds"
              value={ta.id}
              defaultChecked={assignedIds?.includes(ta.id) ?? false}
              className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
            />
            <span className="flex-1 text-sm text-zinc-800">{ta.name}</span>
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
              {roleLabel(ta.role)}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

function TaTags({ tas }: { tas: TaInfo[] }) {
  if (tas.length === 0) return <span className="text-zinc-300">—</span>
  const visible = tas.slice(0, 2)
  const rest = tas.length - 2
  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((ta) => (
        <span key={ta.id} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600">
          {ta.name}
        </span>
      ))}
      {rest > 0 && (
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-400">+{rest}</span>
      )}
    </div>
  )
}

export function ClassesClient({ classes, allTas }: { classes: ClassRow[]; allTas: TaInfo[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ClassRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ClassRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createClass(fd)
      if (!res.success) { setError(res.error); return }
      setCreateOpen(false)
      router.refresh()
    })
  }

  function handleEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updateClass(fd)
      if (!res.success) { setError(res.error); return }
      setEditTarget(null)
      router.refresh()
    })
  }

  function handleSoftDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const res = await deleteClass(deleteTarget.id)
      if (!res.success) { alert(res.error); return }
      setDeleteTarget(null)
      router.refresh()
    })
  }

  function handleHardDelete() {
    if (!deleteTarget) return
    startTransition(async () => {
      const res = await hardDeleteClass(deleteTarget.id)
      if (!res.success) { alert(res.error); return }
      setDeleteTarget(null)
      router.refresh()
    })
  }

  return (
    <>
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-zinc-950">분반 관리</h1>
          <p className="mt-0.5 text-sm text-zinc-400">총 {classes.length}개 반</p>
        </div>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
        >
          + 새 분반
        </button>
      </div>

      {/* 테이블 */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50">
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">반 이름</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500">과목</th>
              <th className="hidden sm:table-cell px-5 py-3 text-left text-xs font-semibold text-zinc-500">학년</th>
              <th className="hidden md:table-cell px-5 py-3 text-left text-xs font-semibold text-zinc-500">수업 일정</th>
              <th className="hidden lg:table-cell px-5 py-3 text-left text-xs font-semibold text-zinc-500">담당 조교</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500">학생 수</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500">상태</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {classes.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <EmptyState message="등록된 분반이 없습니다." description="분반 추가 버튼으로 새 반을 만드세요." />
                </td>
              </tr>
            ) : (
              classes.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/classes/${c.id}`} className="font-medium text-zinc-900 hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-zinc-600">{c.subject}</td>
                  <td className="hidden sm:table-cell px-5 py-3.5 text-zinc-600">{c.grade}</td>
                  <td className="hidden md:table-cell px-5 py-3.5 text-zinc-500">{c.schedule ?? '—'}</td>
                  <td className="hidden lg:table-cell px-5 py-3.5">
                    <TaTags tas={c.tas} />
                  </td>
                  <td className="px-5 py-3.5 text-center text-zinc-700">{c.studentCount}명</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      c.is_active ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400'
                    }`}>
                      {c.is_active ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => { setError(null); setEditTarget(c) }}
                        className="text-xs text-zinc-500 hover:text-zinc-900 transition-colors"
                      >
                        수정
                      </button>
                      <span className="text-zinc-200">|</span>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(c)}
                        disabled={isPending}
                        className="text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 생성 모달 */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setError(null) }} title="새 분반 만들기">
        <form onSubmit={handleCreate} className="space-y-4">
          <InputField label="반 이름" name="name" placeholder="예: 고1 수학 목반" required />
          <InputField label="과목"   name="subject" placeholder="예: 공통수학1" required />
          <InputField label="학년"   name="grade"   placeholder="예: 고1" required />
          <DayCheckboxes />
          <TimeFields />
          <TaCheckboxes allTas={allTas} />
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
              취소
            </button>
            <button type="submit" disabled={isPending} className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
              {isPending ? '생성 중…' : '생성'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 수정 모달 — key로 re-mount해 defaultChecked 초기화 */}
      <Modal open={!!editTarget} onClose={() => { setEditTarget(null); setError(null) }} title="분반 수정">
        {editTarget && (
          <form key={editTarget.id} onSubmit={handleEdit} className="space-y-4">
            <input type="hidden" name="classId" value={editTarget.id} />
            <input type="hidden" name="is_active" value={String(editTarget.is_active)} />
            <InputField label="반 이름" name="name"    defaultValue={editTarget.name}    required />
            <InputField label="과목"   name="subject" defaultValue={editTarget.subject} required />
            <InputField label="학년"   name="grade"   defaultValue={editTarget.grade}   required />
            <DayCheckboxes defaultDays={editTarget.day_of_week} />
            <TimeFields defaultStart={editTarget.start_time} defaultEnd={editTarget.end_time} />
            <TaCheckboxes allTas={allTas} assignedIds={editTarget.tas.map((t) => t.id)} />
            <div className="flex items-center gap-2">
              <input
                id="is_active_toggle"
                type="checkbox"
                name="is_active"
                defaultChecked={editTarget.is_active}
                onChange={(e) => setEditTarget((prev) => prev ? { ...prev, is_active: e.target.checked } : prev)}
                className="h-4 w-4 rounded border-zinc-300 accent-zinc-900"
              />
              <label htmlFor="is_active_toggle" className="text-sm text-zinc-700">활성 상태</label>
            </div>
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setEditTarget(null)} className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50">
                취소
              </button>
              <button type="submit" disabled={isPending} className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50">
                {isPending ? '저장 중…' : '저장'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* 삭제 확인 모달 */}
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="분반 삭제" size="sm">
        {deleteTarget && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-700">
              <span className="font-semibold">{deleteTarget.name}</span> 분반을 어떻게 처리하시겠습니까?
            </p>

            {deleteTarget.studentCount > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                이 분반에 학생 {deleteTarget.studentCount}명이 있습니다.
                완전 삭제하려면 먼저 모든 학생을 제거해주세요.
              </div>
            )}

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleSoftDelete}
                disabled={isPending}
                className="w-full rounded-lg border border-zinc-200 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
              >
                비활성화 (숨김 처리)
              </button>
              <button
                type="button"
                onClick={handleHardDelete}
                disabled={isPending || deleteTarget.studentCount > 0}
                title={deleteTarget.studentCount > 0 ? '학생이 있는 분반은 완전 삭제 불가' : undefined}
                className="w-full rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                완전 삭제 (복구 불가)
              </button>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="w-full rounded-lg py-2 text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
