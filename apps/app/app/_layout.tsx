import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { Stack, router, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

function RootLayoutNav() {
  const { user, isLoading } = useAuth()
  const segments = useSegments()

  useEffect(() => {
    if (isLoading) return

    const isLogin = (segments[0] as string) === 'login'

    // 비로그인 상태인데 로그인 화면이 아니면 → 로그인으로
    if (!user && !isLogin) {
      router.replace('/login')
    }
    // 로그인 화면에서 user && isLogin 으로 되돌리는 가드를 제거한다.
    // 로그인 성공 후 이동은 login.tsx 자체에서 router.replace('/')로 처리한다.
    // 이 가드가 남아 있으면 로그아웃 직후 race condition으로 다시 탭으로 튕겨 나간다.
  }, [user, isLoading, segments])

  if (isLoading) {
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

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  )
}
