import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function WorkScreen() {
  const [name, setName] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setName(data.user.user_metadata?.name || data.user.email?.split('@')[0] || '')
      }
    })
  }, [])

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.welcome}>안녕하세요 {name}님</Text>
        <Text style={styles.pageTitle}>근무 현황</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderText}>근무 관련 기능이 곧 추가될 예정입니다.</Text>
        </View>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  header: { padding: 24, paddingBottom: 16 },
  welcome: { fontSize: 14, color: '#71717a', marginBottom: 4 },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#09090b' },
  content: { padding: 16 },
  placeholderCard: {
    backgroundColor: '#f4f4f5',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e4e4e7',
  },
  placeholderText: { fontSize: 14, color: '#a1a1aa', textAlign: 'center' },
})
