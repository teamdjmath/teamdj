import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack, router, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const segments = useSegments()

  useEffect(() => {
    // 초기 세션 로드
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    // 인증 상태 변화 구독
    const { data: listener } = supabase.auth.onAuthStateChange((_, newSession) => {
      setSession(newSession)
    })

    return () => { listener.subscription.unsubscribe() }
  }, [])

  // 세션 상태에 따른 리다이렉트
  useEffect(() => {
    if (session === undefined) return

    const rootSegment = segments[0] as string
    const inTabs = rootSegment === '(tabs)'
    const isLogin = rootSegment === 'login'

    if (!session && !isLogin) {
      // 세션 없는데 로그인이 아니면 로그인으로
      router.replace('/login')
    } else if (session && isLogin) {
      // 세션 있는데 로그인이면 메인으로
      router.replace('/')
    } else if (session && !inTabs && rootSegment !== '(tabs)') {
      // 세션 있는데 탭 외부(루트 등)면 메인으로
      router.replace('/')
    }
  }, [session, segments])

  // 세션 초기화 중 로딩
  if (session === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' }}>
        <ActivityIndicator color="#09090b" />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
      </Stack>
    </>
  )
}
