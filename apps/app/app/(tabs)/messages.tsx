import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'

type TargetType = 'class' | 'student'

interface Message {
  id: string
  content: string
  sentAt: string
  targetLabel: string
}

interface ClassOption {
  id: string
  name: string
  subject: string
}

interface StudentOption {
  id: string
  name: string
  className: string
}

export default function MessagesScreen() {
  const [messages, setMessages]             = useState<Message[]>([])
  const [classes, setClasses]               = useState<ClassOption[]>([])
  const [students, setStudents]             = useState<StudentOption[]>([])
  const [loading, setLoading]               = useState(true)
  const [refreshing, setRefreshing]         = useState(false)
  const [composeOpen, setComposeOpen]       = useState(false)

  // 작성 폼 상태
  const [targetType, setTargetType]         = useState<TargetType>('class')
  const [selectedClassId, setSelectedClassId]     = useState('')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [content, setContent]               = useState('')
  const [sending, setSending]               = useState(false)

  const load = useCallback(async () => {
    try {
      const [msgRes, classRes, memberRes] = await Promise.all([
        supabase
          .from('push_messages')
          .select('id, content, created_at, class_id, student_id, class_groups(name), users!student_id(name)')
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('class_groups')
          .select('id, name, subject')
          .order('name'),
        supabase
          .from('class_members')
          .select('class_id, class_groups(name), users!student_id(id, name)')
          .eq('is_active', true),
      ])

      const classOptions: ClassOption[] = (classRes.data ?? []).map((c) => ({
        id:      c.id as string,
        name:    c.name as string,
        subject: c.subject as string,
      }))
      setClasses(classOptions)
      if (classOptions.length > 0 && !selectedClassId) {
        setSelectedClassId(classOptions[0].id)
      }

      const seen = new Set<string>()
      const studentOptions: StudentOption[] = []
      for (const m of memberRes.data ?? []) {
        const u = m.users as any
        if (!u?.id || seen.has(u.id)) continue
        seen.add(u.id)
        studentOptions.push({
          id:        u.id as string,
          name:      u.name as string,
          className: (m.class_groups as any)?.name ?? '',
        })
      }
      studentOptions.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      setStudents(studentOptions)
      if (studentOptions.length > 0 && !selectedStudentId) {
        setSelectedStudentId(studentOptions[0].id)
      }

      setMessages(
        (msgRes.data ?? []).map((m) => {
          const className   = (m.class_groups as any)?.name as string | undefined
          const studentName = (m.users as any)?.name    as string | undefined
          return {
            id:          m.id as string,
            content:     m.content as string,
            sentAt:      m.created_at as string,
            targetLabel: className   ? `분반: ${className}`
                       : studentName ? studentName
                       : '전체',
          }
        }),
      )
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const onRefresh = () => { setRefreshing(true); load() }

  async function handleSend() {
    if (!content.trim()) return
    setSending(true)
    try {
      const payload: Record<string, string> = { content: content.trim() }
      if (targetType === 'class' && selectedClassId) {
        payload.class_id = selectedClassId
      } else if (targetType === 'student' && selectedStudentId) {
        payload.student_id = selectedStudentId
      }

      const { error } = await supabase.from('push_messages').insert(payload)
      if (error) throw error

      setContent('')
      setComposeOpen(false)
      load()
    } catch {
      Alert.alert('오류', '쪽지를 발송하지 못했습니다.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#09090b" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* 상단 바 */}
      <View style={styles.topBar}>
        <Text style={styles.pageTitle}>쪽지 발송</Text>
        <TouchableOpacity
          style={styles.composeBtn}
          onPress={() => setComposeOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.composeBtnText}>+ 작성</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#09090b" />
        }
      >
        {messages.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>발송된 쪽지가 없습니다.</Text>
          </View>
        ) : (
          messages.map((m, i) => (
            <View key={m.id} style={[styles.msgItem, i < messages.length - 1 && styles.msgBorder]}>
              <View style={styles.msgTop}>
                <View style={styles.targetBadge}>
                  <Text style={styles.targetBadgeText}>{m.targetLabel}</Text>
                </View>
                <Text style={styles.msgDate}>
                  {new Date(m.sentAt).toLocaleDateString('ko-KR', {
                    month: 'short', day: 'numeric',
                  })}
                </Text>
              </View>
              <Text style={styles.msgContent} numberOfLines={2}>{m.content}</Text>
            </View>
          ))
        )}
      </ScrollView>

      {/* 쪽지 작성 모달 */}
      <Modal
        visible={composeOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setComposeOpen(false)}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <SafeAreaView style={styles.modalSafe}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>쪽지 작성</Text>
              <TouchableOpacity onPress={() => setComposeOpen(false)}>
                <Text style={styles.modalClose}>취소</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
            >
              {/* 발송 대상 타입 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>발송 대상</Text>
                <View style={styles.segmentRow}>
                  {(['class', 'student'] as TargetType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.segmentBtn, targetType === t && styles.segmentBtnActive]}
                      onPress={() => setTargetType(t)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.segmentText, targetType === t && styles.segmentTextActive]}>
                        {t === 'class' ? '분반 전체' : '개인'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 분반 선택 */}
              {targetType === 'class' && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>분반 선택</Text>
                  <View style={styles.optionList}>
                    {classes.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[
                          styles.optionItem,
                          selectedClassId === c.id && styles.optionItemActive,
                        ]}
                        onPress={() => setSelectedClassId(c.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.optionText,
                          selectedClassId === c.id && styles.optionTextActive,
                        ]}>
                          {c.name} · {c.subject}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* 학생 선택 */}
              {targetType === 'student' && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>학생 선택</Text>
                  <View style={styles.optionList}>
                    {students.map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.optionItem,
                          selectedStudentId === s.id && styles.optionItemActive,
                        ]}
                        onPress={() => setSelectedStudentId(s.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.optionText,
                          selectedStudentId === s.id && styles.optionTextActive,
                        ]}>
                          {s.name}{s.className ? ` (${s.className})` : ''}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* 내용 */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>내용</Text>
                <TextInput
                  style={styles.textArea}
                  value={content}
                  onChangeText={setContent}
                  placeholder="쪽지 내용을 입력하세요."
                  placeholderTextColor="#a1a1aa"
                  multiline
                  numberOfLines={5}
                  textAlignVertical="top"
                />
              </View>

              <TouchableOpacity
                style={[styles.sendBtn, (!content.trim() || sending) && styles.sendBtnDisabled]}
                onPress={handleSend}
                disabled={!content.trim() || sending}
                activeOpacity={0.85}
              >
                <Text style={styles.sendBtnText}>{sending ? '발송 중...' : '쪽지 발송'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f4f4f5',
  },
  pageTitle:      { fontSize: 18, fontWeight: '700', color: '#09090b' },
  composeBtn:     { backgroundColor: '#09090b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  composeBtnText: { fontSize: 13, fontWeight: '600', color: '#ffffff' },

  scroll:   { flex: 1 },
  content:  { paddingHorizontal: 20, paddingVertical: 8, paddingBottom: 40 },
  emptyWrap:{ paddingTop: 60, alignItems: 'center' },
  empty:    { fontSize: 14, color: '#a1a1aa' },

  msgItem:   { paddingVertical: 16, gap: 8 },
  msgBorder: { borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  msgTop:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  targetBadge: {
    backgroundColor: '#f4f4f5', borderRadius: 6,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  targetBadgeText: { fontSize: 11, fontWeight: '600', color: '#52525b' },
  msgDate:    { fontSize: 12, color: '#a1a1aa', marginLeft: 'auto' },
  msgContent: { fontSize: 14, color: '#3f3f46', lineHeight: 20 },

  // 모달
  modalSafe: { flex: 1, backgroundColor: '#ffffff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#f4f4f5',
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#09090b' },
  modalClose: { fontSize: 14, color: '#a1a1aa' },
  modalBody:  { padding: 20, gap: 20 },

  formGroup: { gap: 8 },
  formLabel: {
    fontSize: 12, fontWeight: '600', color: '#a1a1aa',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  segmentRow: { flexDirection: 'row', gap: 8 },
  segmentBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 14,
    backgroundColor: '#f4f4f5', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'transparent',
  },
  segmentBtnActive:  { backgroundColor: '#09090b', borderColor: '#09090b' },
  segmentText:       { fontSize: 13, fontWeight: '600', color: '#71717a' },
  segmentTextActive: { color: '#ffffff' },

  optionList: { gap: 6 },
  optionItem: {
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12,
    backgroundColor: '#f8f8fa', borderWidth: 1.5, borderColor: 'transparent',
  },
  optionItemActive: { borderColor: '#09090b', backgroundColor: '#ffffff' },
  optionText:       { fontSize: 14, fontWeight: '500', color: '#52525b' },
  optionTextActive: { color: '#09090b' },

  textArea: {
    minHeight: 120, borderWidth: 1.5, borderColor: '#e4e4e7', borderRadius: 16,
    padding: 14, fontSize: 14, color: '#09090b', backgroundColor: '#fafafa',
  },
  sendBtn: {
    backgroundColor: '#09090b', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  sendBtnDisabled: { backgroundColor: '#d4d4d8' },
  sendBtnText:     { fontSize: 15, fontWeight: '600', color: '#ffffff' },
})
