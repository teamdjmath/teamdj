"use client"

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signIn, type AuthState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'motion/react'

const initial: AuthState = { error: null }

export default function LoginPage() {
  const [tab, setTab] = useState<'student' | 'staff'>('student')
  const [state, action, pending] = useActionState(signIn, initial)

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans selection:bg-zinc-950 selection:text-white">
      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <motion.div
          className="w-full max-w-[400px]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* 브랜딩 */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-950 mb-5 shadow-lg">
              <span className="text-white text-lg font-black tracking-tighter italic">D</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-zinc-950">
              TeamDJ
            </h1>
            <p className="mt-1.5 text-sm font-medium text-zinc-400 tracking-widest uppercase">
              Road To 1
            </p>
          </motion.div>

          {/* 로그인 카드 */}
          <motion.div
            className="rounded-3xl border border-zinc-200 bg-white shadow-xl shadow-zinc-100/80 overflow-hidden"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            {/* 탭 */}
            <div className="relative flex p-1.5 bg-zinc-100 border-b border-zinc-200">
              <div
                className={`absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] bg-white rounded-2xl shadow-sm transition-transform duration-300 ease-out ${
                  tab === 'staff' ? 'translate-x-[calc(100%+6px)]' : 'translate-x-0'
                }`}
              />
              <button
                type="button"
                onClick={() => setTab('student')}
                className={`relative flex-1 py-2.5 text-sm font-bold transition-colors z-10 ${
                  tab === 'student' ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                학생 · 학부모
              </button>
              <button
                type="button"
                onClick={() => setTab('staff')}
                className={`relative flex-1 py-2.5 text-sm font-bold transition-colors z-10 ${
                  tab === 'staff' ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-600'
                }`}
              >
                선생님 · 조교
              </button>
            </div>

            {/* 폼 */}
            <form action={action} className="p-7 space-y-5">
              <input type="hidden" name="tab" value={tab} />

              <AnimatePresence mode="wait">
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, x: tab === 'staff' ? 8 : -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="space-y-1.5">
                    <label htmlFor="identity" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 ml-0.5">
                      {tab === 'student' ? '전화번호 (ID)' : '이메일 주소'}
                    </label>
                    <input
                      id="identity"
                      name="identity"
                      type={tab === 'student' ? 'tel' : 'email'}
                      placeholder={tab === 'student' ? '01012345678' : 'teacher@teamdj.com'}
                      required
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-950 focus:ring-0 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 ml-0.5">
                      비밀번호
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:bg-white focus:border-zinc-950 focus:ring-0 outline-none transition-all"
                    />
                  </div>
                </motion.div>
              </AnimatePresence>

              <AnimatePresence mode="wait">
                {state.error && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-600 border border-red-100 flex items-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                    {state.error}
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                disabled={pending}
                className="w-full h-12 rounded-xl bg-zinc-950 text-white text-sm font-bold transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 shadow-sm"
              >
                {pending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    로그인 중...
                  </span>
                ) : '로그인'}
              </Button>

              {tab === 'staff' && (
                <p className="text-center text-xs text-zinc-400">
                  계정이 없으신가요?{' '}
                  <Link
                    href="/register"
                    className="font-bold text-zinc-950 hover:underline underline-offset-4"
                  >
                    회원가입
                  </Link>
                </p>
              )}
            </form>
          </motion.div>

          {/* 홈으로 돌아가기 */}
          <motion.div
            className="mt-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
              </svg>
              홈으로 돌아가기
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}
