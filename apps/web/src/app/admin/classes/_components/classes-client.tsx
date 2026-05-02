'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { InputField } from '@/components/ui/form-field'
import { createClass, updateClass, deleteClass } from '@/lib/actions/classes'

type ClassRow = {
  id: string
  name: string
  subject: string
  grade: string
  schedule: string | null
  is_active: boolean
  studentCount: number
}

export function ClassesClient({ classes }: { classes: ClassRow[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ClassRow | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createClass(fd)
      if (res.error) { setError(res.error); return }
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
      if (res.error) { setError(res.error); return }
      setEditTarget(null)
      router.refresh()
    })
  }

  function handleDelete(classId: string, name: string) {
    if (!confirm(`"${name}" 분반을 비활성화하시겠습니까?`)) return
    startTransition(async () => {
      const res = await deleteClass(classId)
      if (res.error) alert(res.error)
      else router.refresh()
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
              <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500">학생 수</th>
              <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500">상태</th>
              <th className="px-5 py-3 text-right text-xs font-semibold text-zinc-500">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {classes.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-sm text-zinc-400">
                  등록된 분반이 없습니다.
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
                        onClick={() => handleDelete(c.id, c.name)}
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
          <InputField label="반 이름" name="name" placeholder="예: 수학 A반" required />
          <InputField label="과목"   name="subject" placeholder="예: 수학" required />
          <InputField label="학년"   name="grade"   placeholder="예: 고2" required />
          <InputField label="수업 일정" name="schedule" placeholder="예: 월수 18:00~20:00" />
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

      {/* 수정 모달 */}
      <Modal open={!!editTarget} onClose={() => { setEditTarget(null); setError(null) }} title="분반 수정">
        {editTarget && (
          <form onSubmit={handleEdit} className="space-y-4">
            <input type="hidden" name="classId" value={editTarget.id} />
            <input type="hidden" name="is_active" value={String(editTarget.is_active)} />
            <InputField label="반 이름" name="name"     defaultValue={editTarget.name}     required />
            <InputField label="과목"   name="subject"  defaultValue={editTarget.subject}  required />
            <InputField label="학년"   name="grade"    defaultValue={editTarget.grade}    required />
            <InputField label="수업 일정" name="schedule" defaultValue={editTarget.schedule ?? ''} />
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
    </>
  )
}
