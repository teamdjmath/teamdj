import { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'

export default function NewQuestionScreen() {
  const router = useRouter()
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('알림', '질문 내용을 입력해주세요.')
      return
    }

    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('인증 정보가 없습니다.')

      // class_id를 가져오기 위해 현재 활성화된 첫 번째 반을 선택
      const { data: membership } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('student_id', user.id)
        .eq('is_active', true)
        .limit(1)
        .single()

      const { error } = await supabase
        .from('qna_questions')
        .insert({
          student_id: user.id,
          class_id: membership?.class_id || null,
          title: content.trim().substring(0, 20) + '...', // 제목은 내용 일부로 자동 생성
          content: content.trim(),
          status: 'open',
        })

      if (error) throw error

      Alert.alert('완료', '질문이 등록되었습니다.', [
        { text: '확인', onPress: () => router.back() }
      ])
    } catch (e) {
      Alert.alert('오류', '질문을 등록하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen options={{ title: '새 질문 작성', headerShown: true, headerBackTitle: '뒤로' }} />
      
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.inputCard}>
          <Text style={styles.label}>질문 내용</Text>
          <TextInput
            style={styles.input}
            value={content}
            onChangeText={setContent}
            placeholder="궁금한 내용을 상세히 적어주세요. 수학 문제라면 어느 부분에서 막혔는지 구체적으로 적어주시면 더 정확한 답변이 가능합니다."
            placeholderTextColor="#a1a1aa"
            multiline
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, (!content.trim() || submitting) && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!content.trim() || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>질문 등록하기</Text>
          )}
        </TouchableOpacity>
        
        <Text style={styles.info}>
          * 선생님이나 조교가 확인 후 순차적으로 답변을 드릴 예정입니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 20 },
  inputCard: { backgroundColor: '#f8f8fa', borderRadius: 24, padding: 20, gap: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#a1a1aa', textTransform: 'uppercase' },
  input: { fontSize: 16, color: '#09090b', minHeight: 240, lineHeight: 24 },
  submitBtn: { 
    backgroundColor: '#09090b', borderRadius: 18, height: 56, 
    justifyContent: 'center', alignItems: 'center' 
  },
  submitBtnDisabled: { backgroundColor: '#e4e4e7' },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  info: { fontSize: 12, color: '#a1a1aa', textAlign: 'center', lineHeight: 18 },
})
