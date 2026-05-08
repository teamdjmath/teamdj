import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const MAX_IMAGES = 3

export default function NewQuestionScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [classId, setClassId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('class_members')
      .select('class_id')
      .eq('student_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setClassId(data?.class_id ?? null))
  }, [user])

  const pickImages = async () => {
    const remaining = MAX_IMAGES - images.length
    if (remaining <= 0) {
      Alert.alert('알림', `이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다.`)
      return
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('권한 필요', '사진 라이브러리 접근 권한이 필요합니다.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    })
    if (!result.canceled) {
      const newUris = result.assets.map((a) => a.uri)
      setImages((prev) => [...prev, ...newUris].slice(0, MAX_IMAGES))
    }
  }

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx))
  }

  const uploadImages = async (userId: string): Promise<string[]> => {
    const urls: string[] = []
    for (const uri of images) {
      const ext = (uri.split('.').pop() ?? 'jpg').toLowerCase()
      const filename = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
      const response = await fetch(uri)
      const blob = await response.blob()
      const { data, error } = await supabase.storage
        .from('qna-images')
        .upload(filename, blob, { contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}` })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('qna-images').getPublicUrl(data.path)
      urls.push(urlData.publicUrl)
    }
    return urls
  }

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert('알림', '제목을 입력해주세요.')
      return
    }
    if (!content.trim()) {
      Alert.alert('알림', '질문 내용을 입력해주세요.')
      return
    }
    if (!user) return

    setSubmitting(true)
    try {
      const imageUrls = images.length > 0 ? await uploadImages(user.id) : []

      const { error } = await supabase.from('qna_questions').insert({
        student_id: user.id,
        class_id: classId,
        title: title.trim(),
        content: content.trim(),
        status: 'open',
        image_urls: imageUrls,
      })

      if (error) throw error
      router.back()
    } catch {
      Alert.alert('오류', '질문을 등록하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !submitting

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <Stack.Screen
        options={{
          title: '새 질문 작성',
          headerShown: true,
          headerBackTitle: '뒤로',
          headerTitleStyle: { fontSize: 16, fontWeight: '600' },
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 제목 */}
        <View style={styles.fieldCard}>
          <Text style={styles.label}>제목</Text>
          <TextInput
            style={styles.titleInput}
            value={title}
            onChangeText={setTitle}
            placeholder="질문 제목을 입력하세요"
            placeholderTextColor="#a1a1aa"
            returnKeyType="next"
          />
        </View>

        {/* 내용 */}
        <View style={styles.fieldCard}>
          <Text style={styles.label}>질문 내용</Text>
          <TextInput
            style={styles.contentInput}
            value={content}
            onChangeText={setContent}
            placeholder="궁금한 내용을 상세히 적어주세요. 수학 문제라면 어느 부분에서 막혔는지 구체적으로 적어주시면 더 정확한 답변이 가능합니다."
            placeholderTextColor="#a1a1aa"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </View>

        {/* 이미지 첨부 */}
        <View style={styles.fieldCard}>
          <View style={styles.imgHeader}>
            <Text style={styles.label}>
              이미지 첨부 ({images.length}/{MAX_IMAGES})
            </Text>
            {images.length < MAX_IMAGES && (
              <TouchableOpacity style={styles.imgPickBtn} onPress={pickImages}>
                <Text style={styles.imgPickIcon}>📷</Text>
                <Text style={styles.imgPickText}>사진 추가</Text>
              </TouchableOpacity>
            )}
          </View>
          {images.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.imgScroll}
              contentContainerStyle={styles.imgScrollContent}
            >
              {images.map((uri, idx) => (
                <View key={idx} style={styles.imgWrap}>
                  <Image source={{ uri }} style={styles.imgPreview} />
                  <TouchableOpacity
                    style={styles.imgRemove}
                    onPress={() => removeImage(idx)}
                  >
                    <Text style={styles.imgRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>질문 등록하기</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.info}>
          선생님이나 조교가 확인 후 순차적으로 답변 드릴 예정입니다.
        </Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 40 },

  fieldCard: { backgroundColor: '#f8f8fa', borderRadius: 24, padding: 20, gap: 12 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#a1a1aa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleInput: {
    fontSize: 16,
    color: '#09090b',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contentInput: {
    fontSize: 15,
    color: '#09090b',
    lineHeight: 24,
    minHeight: 144,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  imgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  imgPickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  imgPickIcon: { fontSize: 16 },
  imgPickText: { fontSize: 13, fontWeight: '600', color: '#09090b' },

  imgScroll: { marginTop: 4 },
  imgScrollContent: { gap: 10, paddingRight: 4 },
  imgWrap: { position: 'relative' },
  imgPreview: {
    width: 96,
    height: 96,
    borderRadius: 14,
    backgroundColor: '#e4e4e7',
  },
  imgRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#09090b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imgRemoveText: { fontSize: 10, color: '#ffffff', fontWeight: 'bold' },

  submitBtn: {
    backgroundColor: '#09090b',
    borderRadius: 18,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#e4e4e7' },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  info: { fontSize: 12, color: '#a1a1aa', textAlign: 'center', lineHeight: 18 },
})
