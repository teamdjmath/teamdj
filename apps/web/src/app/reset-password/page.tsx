'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [checking, setChecking] = useState(true)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // 이메일의 재설정 링크를 타고 들어오면 Supabase JS가 URL의 코드를 읽어 임시 복구 세션을
  // 만들고 PASSWORD_RECOVERY 이벤트를 발생시킨다 — 그 이벤트가 와야 새 비밀번호 폼을 연다.
  useEffect(() => {
    const supabase = createClient()
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { setReady(true); setChecking(false) }
    })
    // 이미 세션이 처리된 뒤 마운트된 경우(뒤로가기 등) 대비 — 잠시 후에도 신호가 없으면 만료로 간주
    const timeout = setTimeout(() => setChecking(false), 3000)
    return () => { listener.subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) { setError('비밀번호가 일치하지 않습니다.'); return }
    if (newPassword.length < 8) { setError('비밀번호는 8자 이상이어야 합니다.'); return }

    startTransition(async () => {
      const supabase = createClient()
      const { error: pwErr } = await supabase.auth.updateUser({ password: newPassword })
      if (pwErr) { setError(pwErr.message); return }
      await supabase.auth.signOut()
      router.replace('/login')
    })
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-zinc-950 tracking-tight">새 비밀번호 설정</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {ready ? '새로 사용할 비밀번호를 입력해주세요.' : '링크를 확인하고 있어요…'}
          </p>
        </div>

        {!ready && !checking && (
          <p className="rounded-2xl bg-red-50 px-5 py-4 text-sm text-red-600 text-center leading-relaxed">
            링크가 만료되었거나 올바르지 않아요.
            <br />
            비밀번호 찾기를 다시 시도해주세요.
          </p>
        )}

        {ready && (
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
        )}
      </div>
    </div>
  )
}
