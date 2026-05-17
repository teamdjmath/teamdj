'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { InputField, SelectField } from '@/components/ui/form-field'
import { Card, CardHeader } from '@/components/ui/card'
import { DatePicker } from '@/components/ui/date-picker'
import {
  updateStudent,
  addStudentToClass,
  removeStudentFromClass,
  linkParent,
  unlinkParent,
  resetStudentPassword,
  setSuspension,
  clearSuspension,
  deleteStudent,
} from '@/lib/actions/students'

type ClassOption = { id: string; label: string }

type ClassMembership = {
  memberId:   string
  classId:    string
  className:  string
  subject:    string
  grade:      string
  enrolledAt: string
}

type StudentDetailClientProps = {
  student: {
    id: string
    name: string
    phone: string | null
    school: string | null
    grade: string | null
    is_active: boolean
    createdAt: string
    suspendedFrom: string | null
    suspendedUntil: string | null
  }
  currentClasses: ClassMembership[]
  parents: Array<{ linkId: string; id: string; name: string; phone: string }>
  classOptions: ClassOption[]
}

export function StudentDetailClient({
  student,
  currentClasses,
  parents,
  classOptions,
}: StudentDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // 비밀번호 초기화
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)
  const [resetSuccess, setResetSuccess] = useState(false)

  function handleResetPassword() {
    setResetError(null)
    setResetSuccess(false)
    startTransition(async () => {
      const res = await resetStudentPassword(student.id)
      if (!res.success) { setResetError(res.error); return }
      setResetSuccess(true)
      setResetConfirmOpen(false)
    })
  }

  // 기본 정보 수정
  const [infoError, setInfoError] = useState<string | null>(null)

  function handleInfoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setInfoError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updateStudent(fd)
      if (!res.success) setInfoError(res.error)
      else router.refresh()
    })
  }

  // 분반 추가
  const [classError, setClassError] = useState<string | null>(null)

  function handleAddClass(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setClassError(null)
    const fd = new FormData(e.currentTarget)
    const newClassId = fd.get('newClassId') as string
    if (!newClassId) return
    startTransition(async () => {
      const res = await addStudentToClass(student.id, newClassId)
      if (!res.success) setClassError(res.error)
      else { (e.target as HTMLFormElement).reset(); router.refresh() }
    })
  }

  function handleRemoveClass(classId: string, className: string) {
    if (!confirm(`${className} 분반에서 제거하시겠습니까?`)) return
    startTransition(async () => {
      const res = await removeStudentFromClass(student.id, classId)
      if (!res.success) alert(res.error)
      else router.refresh()
    })
  }

  // 학부모 연결
  const [parentOpen, setParentOpen] = useState(false)
  const [parentError, setParentError] = useState<string | null>(null)

  function handleLinkParent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setParentError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await linkParent(fd)
      if (!res.success) { setParentError(res.error); return }
      setParentOpen(false)
      router.refresh()
    })
  }

  // 휴원 설정
  const [suspendFrom, setSuspendFrom] = useState(student.suspendedFrom ?? '')
  const [suspendUntil, setSuspendUntil] = useState(student.suspendedUntil ?? '')
  const [suspendError, setSuspendError] = useState<string | null>(null)

  function handleSetSuspension(e: React.FormEvent) {
    e.preventDefault()
    setSuspendError(null)
    if (!suspendFrom || !suspendUntil) { setSuspendError('기간을 모두 입력하세요.'); return }
    if (suspendFrom > suspendUntil) { setSuspendError('시작일이 종료일보다 늦을 수 없습니다.'); return }
    startTransition(async () => {
      const res = await setSuspension(student.id, suspendFrom, suspendUntil)
      if (!res.success) { setSuspendError(res.error); return }
      router.refresh()
    })
  }

  function handleClearSuspension() {
    if (!confirm('휴원을 해제하시겠습니까?')) return
    startTransition(async () => {
      const res = await clearSuspension(student.id)
      if (!res.success) alert(res.error)
      else { setSuspendFrom(''); setSuspendUntil(''); router.refresh() }
    })
  }

  // 삭제
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleDelete() {
    setDeleteError(null)
    startTransition(async () => {
      const res = await deleteStudent(student.id)
      if (!res.success) { setDeleteError(res.error); return }
      router.push('/admin/students')
    })
  }

  function handleUnlink(linkId: string, name: string) {
    if (!confirm(`${name} 학부모 연결을 해제하시겠습니까?`)) return
    startTransition(async () => {
      const res = await unlinkParent(linkId, student.id)
      if (!res.success) alert(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">

      {/* 왼쪽 — 기본 정보 */}
      <div className="lg:col-span-2 space-y-5">

        {/* 기본 정보 카드 */}
        <Card>
          <CardHeader title="기본 정보" />
          <form onSubmit={handleInfoSubmit} className="px-5 pb-5 space-y-4">
            <input type="hidden" name="studentId" value={student.id} />
            <div className="grid grid-cols-2 gap-4">
              <InputField label="이름" name="name" defaultValue={student.name} required />
              <InputField label="전화번호" name="phone" type="tel" defaultValue={student.phone ?? ''} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="학교명" name="school" defaultValue={student.school ?? ''} placeholder="OO고 또는 OO중" required />
              <InputField label="학년" name="grade" defaultValue={student.grade ?? ''} placeholder="1" required />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs font-medium text-zinc-600 mb-0.5">등록일</p>
                <p className="text-sm text-zinc-700">
                  {new Date(student.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-600 mb-0.5">로그인 ID</p>
                <p className="font-mono text-xs text-zinc-600">
                  {(student.phone ?? '').replace(/\D/g, '')}@teamdj.com
                </p>
              </div>
            </div>
            {infoError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{infoError}</p>
            )}
            {resetError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{resetError}</p>
            )}
            {resetSuccess && (
              <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600">
                비밀번호가 초기화되었습니다. 학생이 다음 로그인 시 비밀번호를 변경해야 합니다.
              </p>
            )}
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={isPending}
                onClick={() => { setResetError(null); setResetSuccess(false); setResetConfirmOpen(true) }}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 disabled:opacity-50 transition-colors"
              >
                비밀번호 초기화
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
              >
                {isPending ? '저장 중…' : '저장'}
              </button>
            </div>
          </form>
        </Card>

        {/* 소속 분반 카드 */}
        <Card>
          <CardHeader title="소속 분반" />
          <div className="px-5 pb-5 space-y-3">
            {currentClasses.length === 0 ? (
              <p className="text-sm text-zinc-400">소속 반 없음</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {currentClasses.map((m) => (
                  <li key={m.memberId} className="flex items-center justify-between py-2.5">
                    <div>
                      <Link
                        href={`/admin/classes/${m.classId}`}
                        className="font-medium text-zinc-900 hover:underline text-sm"
                      >
                        {m.className}
                      </Link>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {m.subject} · {m.grade} · {new Date(m.enrolledAt).toLocaleDateString('ko-KR')} 등록
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemoveClass(m.classId, m.className)}
                      className="text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      제거
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <form onSubmit={handleAddClass} className="flex gap-2 items-end">
              <div className="flex-1">
                <SelectField label="분반 추가" name="newClassId">
                  <option value="">선택하세요</option>
                  {classOptions
                    .filter((c) => !currentClasses.some((m) => m.classId === c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                </SelectField>
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="shrink-0 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                추가
              </button>
            </form>
            {classError && (
              <p className="text-xs text-red-500">{classError}</p>
            )}
          </div>
        </Card>
      </div>

      {/* 오른쪽 — 학부모 연결 + 휴원 */}
      <div className="space-y-5">
        <Card>
          <CardHeader
            title="학부모 연결"
            action={
              <button
                type="button"
                onClick={() => { setParentError(null); setParentOpen(true) }}
                className="hover:text-zinc-700 transition-colors"
              >
                + 연결
              </button>
            }
          />
          <div className="px-5 pb-5">
            {parents.length === 0 ? (
              <p className="py-4 text-center text-xs text-zinc-400">연결된 학부모가 없습니다.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {parents.map((p) => (
                  <li key={p.linkId} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-800">{p.name}</p>
                      <p className="text-xs text-zinc-400">{p.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleUnlink(p.linkId, p.name)}
                      disabled={isPending}
                      className="text-xs text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      해제
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* 회원 삭제 */}
        <button
          type="button"
          onClick={() => { setDeleteError(null); setDeleteConfirmOpen(true) }}
          className="w-full rounded-xl border border-red-200 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          회원 정보 삭제
        </button>

        {/* 휴원 설정 카드 */}
        <Card>
          <CardHeader title="휴원 설정" />
          <div className="px-5 pb-5 space-y-3">
            {student.suspendedFrom && student.suspendedUntil && (
              <div className="rounded-xl bg-amber-50 px-4 py-3">
                <p className="text-xs font-medium text-amber-700">현재 휴원 중</p>
                <p className="text-sm text-amber-900 mt-0.5">
                  {student.suspendedFrom} ~ {student.suspendedUntil}
                </p>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleClearSuspension}
                  className="mt-2 text-xs text-amber-600 hover:text-amber-900 disabled:opacity-50"
                >
                  휴원 해제
                </button>
              </div>
            )}
            <form onSubmit={handleSetSuspension} className="space-y-3">
              <div className="space-y-2.5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">시작일</label>
                  <DatePicker value={suspendFrom} onChange={setSuspendFrom} placeholder="시작일 선택" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">종료일</label>
                  <DatePicker value={suspendUntil} onChange={setSuspendUntil} placeholder="종료일 선택" />
                </div>
              </div>
              {suspendError && <p className="text-xs text-red-500">{suspendError}</p>}
              <button
                type="submit"
                disabled={isPending}
                className="w-full rounded-lg border border-zinc-200 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
              >
                {isPending ? '저장 중…' : '휴원 설정'}
              </button>
            </form>
          </div>
        </Card>
      </div>

      {/* 비밀번호 초기화 확인 모달 */}
      <Modal open={resetConfirmOpen} onClose={() => setResetConfirmOpen(false)} title="비밀번호 초기화" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-zinc-600">
            <span className="font-semibold text-zinc-900">{student.name}</span> 학생의 비밀번호를 초기 비밀번호로 재설정합니다.
            <br />
            학생이 다음 로그인 시 비밀번호를 변경해야 합니다.
          </p>
          {resetError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{resetError}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setResetConfirmOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              취소
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleResetPassword}
              className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {isPending ? '초기화 중…' : '초기화'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 학부모 연결 모달 */}
      <Modal open={parentOpen} onClose={() => setParentOpen(false)} title="학부모 연결" size="sm">
        <form onSubmit={handleLinkParent} className="space-y-4">
          <input type="hidden" name="studentId" value={student.id} />
          <InputField
            label="학부모 전화번호"
            name="parentPhone"
            type="tel"
            placeholder="01012345678"
            required
          />
          <p className="text-[11px] text-zinc-400">
            이미 등록된 학부모 계정의 전화번호를 입력하세요.
          </p>
          {parentError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{parentError}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setParentOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {isPending ? '연결 중…' : '연결'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 회원 삭제 확인 모달 */}
      <Modal open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} title="회원 정보 삭제" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-zinc-700">
            <span className="font-semibold text-zinc-950">{student.name}</span> 학생의 모든 정보가 삭제됩니다.
            <br />
            출석, QnA, 점수 등 연관된 데이터가 함께 삭제되며, 이 작업은 되돌릴 수 없습니다.
          </p>
          <p className="text-sm font-medium text-red-600">계속하시겠습니까?</p>
          {deleteError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{deleteError}</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              취소
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {isPending ? '삭제 중…' : '삭제'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
