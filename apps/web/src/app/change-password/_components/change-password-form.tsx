'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { changePassword } from '@/lib/actions/password'

export function ChangePasswordForm({ role }: { role: string }) {
  const router = useRouter()
  const [newPassword, setNewPassword]     = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError]   = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (newPassword.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    startTransition(async () => {
      const res = await changePassword(newPassword)
      if (!res.success) { setError(res.error); return }
      const dest = ['teacher', 'ta_desk', 'ta_assistant'].includes(role) ? '/admin/dashboard' : '/dashboard'
      router.replace(dest)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-600">새 비밀번호</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="8자 이상"
          minLength={8}
          required
          autoComplete="new-password"
          className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-3.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:border-zinc-900 focus:bg-white focus:outline-none transition-all"
        />
      </div>
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-600">새 비밀번호 확인</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="동일한 비밀번호 입력"
          minLength={8}
          required
          autoComplete="new-password"
          className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/50 px-5 py-3.5 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 placeholder:font-normal focus:border-zinc-900 focus:bg-white focus:outline-none transition-all"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-2xl bg-zinc-950 py-3.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 transition-colors mt-2"
      >
        {isPending ? '변경 중…' : '비밀번호 변경'}
      </button>
    </form>
  )
}
