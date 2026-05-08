import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'

interface Question {
  id: string
  title: string
  status: 'open' | 'in_progress' | 'answered'
  created_at: string
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: '미답변', bg: '#f4f4f5', text: '#71717a' },
  in_progress: { label: '답변중', bg: '#09090b', text: '#ffffff' },
  answered: { label: '답변완료', bg: '#e4e4e7', text: '#52525b' },
}

export default function QnaListScreen() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error: qError } = await supabase
        .from('qna_questions')
        .select('id, title, status, created_at')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false })

      if (qError) throw qError
      setQuestions(data || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#09090b" />
      </View>
    )
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Q&A</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => {
            // @ts-ignore
            router.push('/(tabs)/qna/new')
          }}
        >
          <Text style={styles.newBtnText}>질문하기</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error && <Text style={styles.error}>{error}</Text>}
        
        {questions.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>아직 등록된 질문이 없습니다.</Text>
            <Text style={styles.emptySub}>궁금한 내용을 질문해보세요.</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {questions.map((q) => {
              const st = STATUS_MAP[q.status] || STATUS_MAP.open
              return (
                <TouchableOpacity
                  key={q.id}
                  style={styles.item}
                  activeOpacity={0.7}
                  onPress={() => {
                    // @ts-ignore
                    router.push(`/(tabs)/qna/${q.id}`)
                  }}
                >
                  <View style={styles.itemHeader}>
                    <View style={[styles.badge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.badgeText, { color: st.text }]}>
                        {st.label}
                      </Text>
                    </View>
                    <Text style={styles.date}>
                      {new Date(q.created_at).toLocaleDateString('ko-KR', {
                        month: 'short', day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <Text style={styles.itemContent} numberOfLines={2}>
                    {q.title}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' 
  },
  title: { fontSize: 22, fontWeight: '700', color: '#09090b', letterSpacing: -0.5 },
  newBtn: { backgroundColor: '#09090b', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  newBtnText: { fontSize: 13, fontWeight: '700', color: '#ffffff' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  error: { color: '#ef4444', textAlign: 'center', marginBottom: 20 },
  emptyWrap: { alignItems: 'center', marginTop: 60, gap: 8 },
  empty: { fontSize: 15, fontWeight: '600', color: '#09090b' },
  emptySub: { fontSize: 13, color: '#a1a1aa' },
  list: { gap: 12 },
  item: { backgroundColor: '#f8f8fa', borderRadius: 20, padding: 20, gap: 10 },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  date: { fontSize: 11, color: '#a1a1aa' },
  itemContent: { fontSize: 14, color: '#27272a', lineHeight: 20, fontWeight: '500' },
})
