'use client'

import { useState, useTransition } from 'react'
import { requestPasswordReset } from '@/lib/actions/password'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      const res = await requestPasswordReset(email)
      if (!res.success) { setError(res.error); return }
      setSent(true)
    })
  }

  if (sent) {
    return (
      <p className="rounded-2xl bg-zinc-50 px-5 py-4 text-sm text-zinc-600 text-center leading-relaxed">
        입력하신 이메일로 재설정 링크를 보냈어요.
        <br />
        메일함(스팸함 포함)을 확인해주세요.
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-zinc-600">이메일 주소</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="teacher@teamdj.com"
          required
          autoComplete="email"
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
        {isPending ? '전송 중…' : '재설정 링크 받기'}
      </button>
    </form>
  )
}
