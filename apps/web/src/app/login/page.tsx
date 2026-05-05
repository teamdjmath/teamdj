"use client"

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { signIn, type AuthState } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'
import { ChevronLeft } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

const initial: AuthState = { error: null }

export default function LoginPage() {
  const [tab, setTab] = useState<'student' | 'staff'>('student')
  const [state, action, pending] = useActionState(signIn, initial)

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#09090b] px-4 font-sans selection:bg-white selection:text-black">
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] bg-size-[24px_24px] mask-[radial-gradient(ellipse_50%_50%_at_50%_50%,#000_70%,transparent_100%)]" />
      
      <div className="relative z-10 w-full max-w-[400px]">
        {/* 뒤로가기 */}
        <div className="mb-8">
          <Link 
            href="/" 
            className="inline-flex items-center text-sm text-zinc-500 hover:text-white transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 mr-1 transition-transform group-hover:-translate-x-0.5" />
            홈으로 돌아가기
          </Link>
        </div>

        {/* 로고 및 안내 */}
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-black tracking-tighter text-white">
            TeamDJ
          </h1>
          <p className="mt-2 text-sm text-zinc-500 font-medium">
            Road To 1
          </p>
        </div>

        {/* 로그인 카드 */}
        <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-zinc-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          
          {/* 프리미엄 탭 */}
          <div className="relative flex p-1.5 bg-zinc-200/50 border-b border-zinc-200">
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

          {/* 폼 영역 */}
          <form action={action} className="p-8 space-y-6">
            <input type="hidden" name="tab" value={tab} />

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="identity" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                  {tab === 'student' ? '전화번호 (ID)' : '이메일 주소'}
                </label>
                <input
                  id="identity"
                  name="identity"
                  type={tab === 'student' ? 'tel' : 'email'}
                  placeholder={tab === 'student' ? '01012345678' : 'teacher@teamdj.com'}
                  required
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-0 outline-none transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 ml-1">
                  비밀번호
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-0 outline-none transition-all"
                />
              </div>
            </div>

            {/* 에러 피드백 (애니메이션 적용) */}
            <AnimatePresence mode="wait">
              {state.error && (
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="rounded-xl bg-red-50 px-4 py-3 text-xs font-medium text-red-600 border border-red-100"
                >
                  {state.error}
                </motion.p>
              )}
            </AnimatePresence>

            <Button
              type="submit"
              disabled={pending}
              className="w-full h-12 rounded-2xl bg-zinc-950 text-white font-bold transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50"
            >
              {pending ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  로그인 중...
                </span>
              ) : '로그인'}
            </Button>

            {tab === 'staff' && (
              <div className="pt-2 text-center">
                <p className="text-xs text-zinc-500">
                  아직 계정이 없으신가요?{' '}
                  <Link
                    href="/register"
                    className="font-bold text-zinc-950 hover:underline underline-offset-4"
                  >
                    회원가입
                  </Link>
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
