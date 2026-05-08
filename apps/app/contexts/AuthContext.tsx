import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  role: string | null
  userName: string
  isStaff: boolean
  isLoading: boolean
  signOut: () => void
}

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  userName: '',
  isStaff: false,
  isLoading: true,
  signOut: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // 앱 시작 시 세션 복구 실패는 조용히 처리 (에러 콘솔 없음)
    supabase.auth.getSession().then(({ data, error }) => {
      if (!error) {
        setUser(data.session?.user ?? null)
      } else {
        setUser(null)
      }
      setIsLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        // Invalid Refresh Token 포함 — 모든 로그아웃 이벤트 처리
        // setUser(null) → (tabs)/_layout.tsx useEffect가 /login으로 이동시킴
        setUser(null)
      } else {
        setUser(session?.user ?? null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // user를 즉시 null로 세팅하고 Supabase 세션은 백그라운드에서 정리한다.
  // await로 블로킹하면 네트워크가 느리거나 실패할 때 navigation이 막힌다.
  function signOut() {
    setUser(null)
    supabase.auth.signOut().catch(() => {})
  }

  const role = (user?.user_metadata?.role as string) ?? null
  const userName = (user?.user_metadata?.name as string) || user?.email?.split('@')[0] || ''
  const isStaff = role === 'teacher' || role === 'ta'

  return (
    <AuthContext.Provider value={{ user, role, userName, isStaff, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
