'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signIn, type AuthState } from '@/lib/actions/auth'

const initial: AuthState = { error: null }

export default function LoginPage() {
  const [tab, setTab] = useState<'student' | 'staff'>('student')
  const [state, action, pending] = useActionState(signIn, initial)

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm">

        {/* 로고 */}
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-zinc-950">
            TeamDJ
          </span>
          <p className="mt-1 text-sm text-zinc-500">학원 관리 시스템</p>
        </div>

        {/* 카드 */}
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">

          {/* 탭 */}
          <div className="flex border-b border-zinc-200">
            <button
              type="button"
              onClick={() => setTab('student')}
              className={[
                'flex-1 py-3.5 text-sm font-medium transition-colors rounded-tl-2xl',
                tab === 'student'
                  ? 'bg-white text-zinc-950'
                  : 'bg-zinc-50 text-zinc-400 hover:text-zinc-600',
              ].join(' ')}
            >
              학생 · 학부모
            </button>
            <button
              type="button"
              onClick={() => setTab('staff')}
              className={[
                'flex-1 py-3.5 text-sm font-medium transition-colors border-l border-zinc-200 rounded-tr-2xl',
                tab === 'staff'
                  ? 'bg-white text-zinc-950'
                  : 'bg-zinc-50 text-zinc-400 hover:text-zinc-600',
              ].join(' ')}
            >
              선생님 · 조교
            </button>
          </div>

          {/* 폼 */}
          <form action={action} className="p-6 space-y-4">
            {/* 탭 값 hidden 전달 */}
            <input type="hidden" name="tab" value={tab} />

            {/* 아이디 (전화번호 or 이메일) */}
            <div className="space-y-1.5">
              <label
                htmlFor="identity"
                className="block text-xs font-medium text-zinc-600"
              >
                {tab === 'student' ? '전화번호 (ID)' : '이메일'}
              </label>
              <input
                id="identity"
                name="identity"
                type={tab === 'student' ? 'tel' : 'email'}
                autoComplete={tab === 'student' ? 'tel' : 'email'}
                placeholder={tab === 'student' ? '01012345678' : 'teacher@example.com'}
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
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            {/* 에러 메시지 */}
            {state.error && (
              <p className="rounded-lg bg-red-50 px-3.5 py-2.5 text-xs text-red-600">
                {state.error}
              </p>
            )}

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-zinc-950 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? '로그인 중…' : '로그인'}
            </button>

            {/* 선생님·조교 탭에만 회원가입 링크 */}
            {tab === 'staff' && (
              <p className="text-center text-xs text-zinc-400">
                계정이 없으신가요?{' '}
                <Link
                  href="/register"
                  className="font-medium text-zinc-700 underline underline-offset-2 hover:text-zinc-950"
                >
                  회원가입
                </Link>
              </p>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
