import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'

interface Question {
  id: string
  content: string
  status: string
  created_at: string
  assignedTaName: string | null
}

interface Answer {
  id: string
  content: string
  media_urls: string[]
  answered_at: string
  taName: string
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: '미답변', bg: '#f4f4f5', text: '#71717a' },
  in_progress: { label: '답변중', bg: '#09090b', text: '#ffffff' },
  answered: { label: '답변완료', bg: '#e4e4e7', text: '#52525b' },
}

export default function QnaDetailScreen() {
  const { id } = useLocalSearchParams()
  const router = useRouter()
  
  const [question, setQuestion] = useState<Question | null>(null)
  const [answers, setAnswers] = useState<Answer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: qData, error: qError } = await supabase
          .from('qna_questions')
          .select('*, ta:users!qna_questions_assigned_ta_id_fkey(name)')
          .eq('id', id)
          .single()

        if (qError || !qData) throw new Error('질문을 찾을 수 없습니다.')

        setQuestion({
          id: qData.id,
          content: qData.content,
          status: qData.status,
          created_at: qData.created_at,
          assignedTaName: qData.ta?.name || null,
        })

        const { data: aData } = await supabase
          .from('qna_answers')
          .select('*, ta:users!qna_answers_ta_id_fkey(name)')
          .eq('question_id', id)
          .order('answered_at', { ascending: true })

        setAnswers((aData || []).map((a: any) => ({
          id: a.id,
          content: a.content,
          media_urls: a.media_urls || [],
          answered_at: a.answered_at,
          taName: a.ta?.name || 'TA',
        })))
      } catch (e) {
        setError(e instanceof Error ? e.message : '데이터를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#09090b" />
      </View>
    )
  }

  if (error || !question) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.error}>{error || '질문을 불러오지 못했습니다.'}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>뒤로 가기</Text>
        </TouchableOpacity>
      </SafeAreaView>
    )
  }

  const st = STATUS_MAP[question.status] || STATUS_MAP.open

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: '질문 상세', headerShown: true, headerBackTitle: '뒤로' }} />
      
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* 질문 카드 */}
        <View style={styles.qCard}>
          <View style={styles.qHeader}>
            <View style={[styles.badge, { backgroundColor: st.bg }]}>
              <Text style={[styles.badgeText, { color: st.text }]}>{st.label}</Text>
            </View>
            <Text style={styles.date}>
              {new Date(question.created_at).toLocaleDateString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
              })}
            </Text>
          </View>
          <Text style={styles.qContent}>{question.content}</Text>
          {question.assignedTaName && (
            <Text style={styles.assigned}>담당 조교: {question.assignedTaName} 선생님</Text>
          )}
        </View>

        {/* 답변 섹션 */}
        <View style={styles.aSection}>
          <Text style={styles.sectionTitle}>답변 {answers.length}</Text>
          
          {answers.length === 0 ? (
            <View style={styles.waiting}>
              <ActivityIndicator color="#a1a1aa" size="small" />
              <Text style={styles.waitingText}>선생님이 질문을 확인하고 있습니다...</Text>
            </View>
          ) : (
            <View style={styles.aList}>
              {answers.map((a) => (
                <View key={a.id} style={styles.aCard}>
                  <View style={styles.aHeader}>
                    <Text style={styles.taName}>{a.taName} 선생님의 답변</Text>
                    <Text style={styles.date}>
                      {new Date(a.answered_at).toLocaleDateString('ko-KR', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <Text style={styles.aContent}>{a.content}</Text>
                  
                  {a.media_urls.length > 0 && (
                    <View style={styles.mediaList}>
                      {a.media_urls.map((url, idx) => (
                        <Image key={idx} source={{ uri: url }} style={styles.media} resizeMode="contain" />
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  qCard: { backgroundColor: '#f8f8fa', borderRadius: 24, padding: 24, gap: 16 },
  qHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  date: { fontSize: 12, color: '#a1a1aa' },
  qContent: { fontSize: 16, color: '#09090b', lineHeight: 26, fontWeight: '500' },
  assigned: { fontSize: 12, color: '#71717a', fontWeight: '600' },
  
  aSection: { gap: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 1 },
  aList: { gap: 16 },
  aCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, gap: 16, borderWidth: 1, borderColor: '#f4f4f5' },
  aHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taName: { fontSize: 14, fontWeight: '700', color: '#09090b' },
  aContent: { fontSize: 15, color: '#27272a', lineHeight: 24 },
  mediaList: { gap: 12, marginTop: 4 },
  media: { width: '100%', aspectRatio: 4/3, borderRadius: 16, backgroundColor: '#f8f8fa' },
  
  waiting: { alignItems: 'center', gap: 12, marginTop: 20 },
  waitingText: { fontSize: 13, color: '#a1a1aa' },
  error: { color: '#ef4444', marginBottom: 20 },
  backBtn: { backgroundColor: '#09090b', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14 },
  backText: { color: '#ffffff', fontWeight: '600' },
})
