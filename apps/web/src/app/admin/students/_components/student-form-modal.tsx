'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/modal'
import { InputField } from '@/components/ui/form-field'
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
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])

  function toggleClass(id: string) {
    setSelectedClassIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    // 체크박스 선택 분반 추가
    selectedClassIds.forEach((id) => fd.append('classId', id))
    startTransition(async () => {
      const res = await createStudent(fd)
      if (!res.success) { setError(res.error); return }
      setSelectedClassIds([])
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

        {/* 다중 분반 선택 */}
        <div>
          <p className="mb-1.5 text-xs font-medium text-zinc-700">
            소속 반{' '}
            <span className="text-zinc-400 font-normal">
              {selectedClassIds.length > 0 ? `${selectedClassIds.length}개 선택됨` : '(선택 사항)'}
            </span>
          </p>
          <div className="max-h-36 overflow-y-auto rounded-xl border border-zinc-200 divide-y divide-zinc-100">
            {classOptions.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-zinc-400">등록된 분반이 없습니다.</p>
            ) : (
              classOptions.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-zinc-50"
                >
                  <input
                    type="checkbox"
                    className="accent-zinc-900"
                    checked={selectedClassIds.includes(c.id)}
                    onChange={() => toggleClass(c.id)}
                  />
                  <span className="text-sm text-zinc-700">{c.label}</span>
                </label>
              ))
            )}
          </div>
        </div>

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
