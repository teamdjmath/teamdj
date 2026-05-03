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

    const inTabs = segments[0] === '(tabs)'

    if (!session && inTabs) {
      router.replace('/login')
    } else if (session && !inTabs && segments[0] !== '(tabs)') {
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
