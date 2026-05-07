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

    const rootSegment = segments[0] as string
    const inTabs = rootSegment === '(tabs)'
    const isLogin = rootSegment === 'login'

    if (!user && !isLogin) {
      router.replace('/login')
    } else if (user && isLogin) {
      router.replace('/')
    } else if (user && !inTabs) {
      router.replace('/')
    }
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
