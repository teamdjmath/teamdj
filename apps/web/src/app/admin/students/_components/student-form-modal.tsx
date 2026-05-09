'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { InputField, SelectField } from '@/components/ui/form-field'
import { createStudent } from '@/lib/actions/students'

type ClassOption = { id: string; label: string }

export function StudentFormModal({
  open,
  onClose,
  classOptions,
}: {
  open: boolean
  onClose: () => void
  classOptions: ClassOption[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      const res = await createStudent(fd)
      if (!res.success) { setError(res.error); return }
      onClose()
      router.refresh()
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="학생 등록">
      <form onSubmit={handleSubmit} className="space-y-4">
        <InputField
          label="이름"
          name="name"
          placeholder="홍길동"
          required
        />
        <InputField
          label="전화번호"
          name="phone"
          type="tel"
          placeholder="01012345678"
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="학교명"
            name="school"
            placeholder="OO고 또는 OO중"
            required
          />
          <InputField
            label="학년"
            name="grade"
            placeholder="1"
            required
          />
        </div>
        <SelectField label="소속 반 (선택)" name="classId">
          <option value="">반 없음</option>
          {classOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </SelectField>
        <InputField
          label="학부모 전화번호 (선택)"
          name="parentPhone"
          type="tel"
          placeholder="01012345678"
        />
        <p className="text-[11px] text-zinc-400">
          로그인 ID: <span className="font-mono text-zinc-600">전화번호@teamdj.com</span>
          &nbsp;·&nbsp;초기 비밀번호: <span className="font-mono text-zinc-600">teamdj1234</span>
        </p>
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {isPending ? '등록 중…' : '등록'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
