import { Tabs, useRouter } from 'expo-router'
import { Text, View, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native'
import { useEffect, useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  return (
    <Ionicons 
      name={focused ? (name as any) : (`${name}-outline` as any)} 
      size={22} 
      color={focused ? '#09090b' : '#a1a1aa'} 
    />
  )
}

export default function TabLayout() {
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      setRole(user.user_metadata?.role || 'student')
      setUserName(user.user_metadata?.name || user.email?.split('@')[0] || '')

      const { data: memberships } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', user.id)
        .eq('is_active', true)
      
      const classIds = (memberships ?? []).map(m => m.class_id)
      
      const { count } = await supabase
        .from('push_messages')
        .select('*', { count: 'exact', head: true })
        .or(`student_id.eq.${user.id}${classIds.length > 0 ? `,class_id.in.(${classIds.join(',')})` : ''}`)
        .eq('is_read', false)

      setUnreadCount(count ?? 0)
      setLoading(false)
    }
    init()
  }, [])

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator color="#09090b" />
      </View>
    )
  }

  const isStaff = role === 'teacher' || role === 'ta'

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }} edges={['top']}>
      {/* Global Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logoText}>TeamDJ</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.msgBtn}
            onPress={() => router.push('/(tabs)/messages')}
          >
            <Text style={styles.msgIcon}>✉</Text>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <Text style={styles.userName}>{userName}</Text>
        </View>
      </View>

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#09090b',
          tabBarInactiveTintColor: '#a1a1aa',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#f4f4f5',
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 8,
            elevation: 0,
            shadowOpacity: 0,
          },
          tabBarItemStyle: { flex: 1 },
        }}
      >
        {/* 학생 전용 탭 */}
        <Tabs.Screen
          name="index"
          options={{
            title: '홈',
            tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="learning/index"
          options={{
            title: '학습',
            tabBarIcon: ({ focused }) => <TabIcon name="book" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="qna/index"
          options={{
            title: 'Q&A',
            tabBarIcon: ({ focused }) => <TabIcon name="chatbubble-ellipses" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="report"
          options={{
            title: '리포트',
            tabBarIcon: ({ focused }) => <TabIcon name="bar-chart" focused={focused} />,
          }}
        />

        {/* 공통 탭 */}
        <Tabs.Screen
          name="more"
          options={{
            title: '더보기',
            tabBarIcon: ({ focused }) => <TabIcon name="ellipsis-horizontal" focused={focused} />,
          }}
        />

        {/* 숨겨진 탭 (네비게이션용) */}
        <Tabs.Screen name="learning/[courseName]" options={{ href: null }} />
        <Tabs.Screen name="qna/new" options={{ href: null }} />
        <Tabs.Screen name="qna/[id]" options={{ href: null }} />
        <Tabs.Screen name="messages" options={{ href: null }} />
        <Tabs.Screen name="work" options={{ href: null }} />
        <Tabs.Screen name="notices" options={{ href: null }} />
      </Tabs>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f5',
  },
  headerLeft: {
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 16,
    fontWeight: '900',
    fontStyle: 'italic',
    color: '#09090b',
    textTransform: 'uppercase',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  msgBtn: {
    position: 'relative',
    padding: 4,
    backgroundColor: '#f8f8fa',
    borderRadius: 12,
  },
  msgIcon: {
    fontSize: 18,
    color: '#09090b',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#52525b',
  },
})
