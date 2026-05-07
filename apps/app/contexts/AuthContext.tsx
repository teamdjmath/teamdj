import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  role: string | null
  userName: string
  isStaff: boolean
  isLoading: boolean
}

const AuthContext = createContext<AuthState>({
  user: null,
  role: null,
  userName: '',
  isStaff: false,
  isLoading: true,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const role = (user?.user_metadata?.role as string) ?? null
  const userName = (user?.user_metadata?.name as string) || user?.email?.split('@')[0] || ''
  const isStaff = role === 'teacher' || role === 'ta'

  return (
    <AuthContext.Provider value={{ user, role, userName, isStaff, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
