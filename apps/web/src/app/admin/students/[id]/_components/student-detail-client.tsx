'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { InputField, SelectField } from '@/components/ui/form-field'
import { Card, CardHeader } from '@/components/ui/card'
import {
  updateStudent,
  changeStudentClass,
  linkParent,
  unlinkParent,
} from '@/lib/actions/students'

type ClassOption = { id: string; label: string }

type StudentDetailClientProps = {
  student: {
    id: string
    name: string
    phone: string
    is_active: boolean
    createdAt: string
  }
  currentClass: {
    memberId:   string
    classId:    string
    className:  string
    subject:    string
    grade:      string
    enrolledAt: string
  } | null
  parents: Array<{ linkId: string; id: string; name: string; phone: string }>
  classOptions: ClassOption[]
}

export function StudentDetailClient({
  student,
  currentClass,
  parents,
  classOptions,
}: StudentDetailClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // 기본 정보 수정
  const [infoError, setInfoError] = useState<string | null>(null)

  function handleInfoSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setInfoError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await updateStudent(fd)
      if (res.error) setInfoError(res.error)
      else router.refresh()
    })
  }

  // 분반 변경
  const [classError, setClassError] = useState<string | null>(null)

  function handleClassChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setClassError(null)
    const fd = new FormData(e.currentTarget)
    const newClassId = fd.get('newClassId') as string
    startTransition(async () => {
      const res = await changeStudentClass(
        student.id,
        currentClass?.classId ?? null,
        newClassId,
      )
      if (res.error) setClassError(res.error)
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
      if (res.error) { setParentError(res.error); return }
      setParentOpen(false)
      router.refresh()
    })
  }

  function handleUnlink(linkId: string, name: string) {
    if (!confirm(`${name} 학부모 연결을 해제하시겠습니까?`)) return
    startTransition(async () => {
      const res = await unlinkParent(linkId, student.id)
      if (res.error) alert(res.error)
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
              <InputField label="전화번호" name="phone" type="tel" defaultValue={student.phone} required />
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-0.5">등록일</p>
                <p className="text-sm text-zinc-700">
                  {new Date(student.createdAt).toLocaleDateString('ko-KR')}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 mb-0.5">로그인 ID</p>
                <p className="font-mono text-xs text-zinc-500">
                  {student.phone.replace(/\D/g, '')}@teamdj.com
                </p>
              </div>
            </div>
            {infoError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{infoError}</p>
            )}
            <div className="flex justify-end">
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

        {/* 분반 변경 카드 */}
        <Card>
          <CardHeader title="소속 분반" />
          <div className="px-5 pb-5 space-y-3">
            {currentClass ? (
              <div className="rounded-xl bg-zinc-50 px-4 py-3 flex items-start justify-between">
                <div>
                  <Link
                    href={`/admin/classes/${currentClass.classId}`}
                    className="font-medium text-zinc-900 hover:underline"
                  >
                    {currentClass.className}
                  </Link>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {currentClass.subject} · {currentClass.grade} ·&nbsp;
                    {new Date(currentClass.enrolledAt).toLocaleDateString('ko-KR')} 등록
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">소속 반 없음</p>
            )}

            <form onSubmit={handleClassChange} className="flex gap-2 items-end">
              <div className="flex-1">
                <SelectField label="새 분반으로 변경" name="newClassId" required>
                  <option value="">선택하세요</option>
                  {classOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </SelectField>
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="shrink-0 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                변경
              </button>
            </form>
            {classError && (
              <p className="text-xs text-red-500">{classError}</p>
            )}
          </div>
        </Card>
      </div>

      {/* 오른쪽 — 학부모 연결 */}
      <div>
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
      </div>

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
    </div>
  )
}
