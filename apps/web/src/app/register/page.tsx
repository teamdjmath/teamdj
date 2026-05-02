'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp, type AuthState } from '@/lib/actions/auth'

const initial: AuthState = { error: null }

export default function RegisterPage() {
  const [state, action, pending] = useActionState(signUp, initial)

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-zinc-950">
            TeamDJ
          </span>
          <p className="mt-1 text-sm text-zinc-500">선생님 · 조교 회원가입</p>
        </div>

        {/* 카드 */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="p-6">
            <h2 className="mb-1 text-base font-semibold text-zinc-950">
              계정 만들기
            </h2>
            <p className="mb-6 text-xs text-zinc-400">
              관리자에게 받은 초대 코드가 필요합니다.
            </p>

            <form action={action} className="space-y-4">

              {/* 이름 */}
              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="block text-xs font-medium text-zinc-600"
                >
                  이름
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  placeholder="홍길동"
                  required
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              {/* 이메일 */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="block text-xs font-medium text-zinc-600"
                >
                  이메일
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="teacher@example.com"
                  required
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              {/* 비밀번호 */}
              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-zinc-600"
                >
                  비밀번호
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="8자 이상"
                  required
                  minLength={8}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none transition-colors"
                />
              </div>

              {/* 초대 코드 */}
              <div className="space-y-1.5">
                <label
                  htmlFor="inviteCode"
                  className="block text-xs font-medium text-zinc-600"
                >
                  초대 코드
                </label>
                <input
                  id="inviteCode"
                  name="inviteCode"
                  type="text"
                  placeholder="관리자에게 받은 코드 입력"
                  required
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-zinc-400">
                  선생님용 / 조교용 코드에 따라 역할이 자동 설정됩니다.
                </p>
              </div>

              {/* 에러 메시지 */}
              {state.error && (
                <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
                  {state.error}
                </p>
              )}

              {/* 가입 버튼 */}
              <button
                type="submit"
                disabled={pending}
                className="w-full rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? '처리 중…' : '회원가입'}
              </button>

              <p className="text-center text-xs text-zinc-400">
                이미 계정이 있으신가요?{' '}
                <Link
                  href="/login"
                  className="font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-950"
                >
                  로그인
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
