import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]
const CSAT_DEFAULT = '2026-11-19'
const LS_DDAY = 'teamdj_dday_target'

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  '매월승리': { bg: '#09090b', text: '#fff' },
  'KBS':      { bg: '#3f3f46', text: '#fff' },
  'EB-Schema':{ bg: '#a1a1aa', text: '#fff' },
}

const QNA_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  open:        { label: '미답변', bg: '#f4f4f5', text: '#71717a' },
  in_progress: { label: '답변중', bg: '#09090b', text: '#fff' },
  answered:    { label: '답변완료', bg: '#e4e4e7', text: '#52525b' },
}

function diffDays(targetDate: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(targetDate); target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - today.getTime()) / 86400000)
}

export default function HomeScreen() {
  const [targetDate, setTargetDate] = useState(CSAT_DEFAULT)
  const [editingDday, setEditingDday] = useState(false)
  const [ddayInput, setDdayInput] = useState(CSAT_DEFAULT)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [assignments, setAssignments] = useState<{
    id: string; title: string; category: string | null; due_date: string | null; pct: number
  }[]>([])
  const [notices, setNotices] = useState<{
    id: string; title: string; is_pinned: boolean; created_at: string
  }[]>([])
  const [questions, setQuestions] = useState<{
    id: string; content: string; status: string
  }[]>([])

  // D-day 로드
  useEffect(() => {
    AsyncStorage.getItem(LS_DDAY).then((v) => {
      if (v) { setTargetDate(v); setDdayInput(v) }
    })
  }, [])

  // 데이터 fetch
  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        const userId = user.id

        const { data: memberships } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('student_id', userId)
          .eq('is_active', true)

        const classIds = (memberships ?? []).map((m) => m.class_id as string)

        const [{ data: asgn }, { data: prog }, noticeRes, { data: qna }] = await Promise.all([
          classIds.length
            ? supabase
                .from('assignments')
                .select('id, title, category, due_date')
                .in('class_id', classIds)
                .gte('due_date', TODAY)
                .order('due_date')
                .limit(5)
            : { data: [] },
          classIds.length
            ? supabase
                .from('assignment_progress')
                .select('assignment_id, completion_pct')
                .eq('student_id', userId)
            : { data: [] },
          classIds.length
            ? supabase
                .from('notices')
                .select('id, title, is_pinned, created_at')
                .or(`class_id.is.null,class_id.in.(${classIds.join(',')})`)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(3)
            : supabase
                .from('notices')
                .select('id, title, is_pinned, created_at')
                .is('class_id', null)
                .order('is_pinned', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(3),
          supabase
            .from('qna_questions')
            .select('id, content, status')
            .eq('student_id', userId)
            .order('created_at', { ascending: false })
            .limit(3),
        ])

        const progressMap: Record<string, number> = {}
        for (const p of prog ?? []) {
          progressMap[p.assignment_id as string] = (p.completion_pct as number) ?? 0
        }

        setAssignments(
          (asgn ?? []).map((a) => ({
            id: a.id as string,
            title: a.title as string,
            category: a.category as string | null,
            due_date: a.due_date as string | null,
            pct: progressMap[a.id as string] ?? 0,
          })),
        )
        setNotices(noticeRes.data ?? [])
        setQuestions(
          (qna ?? []).map((q) => ({
            id: q.id as string,
            content: q.content as string,
            status: q.status as string,
          })),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : '오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function saveDday() {
    setTargetDate(ddayInput)
    AsyncStorage.setItem(LS_DDAY, ddayInput)
    setEditingDday(false)
  }

  const diff = diffDays(targetDate)
  const ddayLabel = diff > 0 ? `D-${diff}` : diff === 0 ? 'D-DAY' : `D+${Math.abs(diff)}`

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#09090b" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* D-day 카드 */}
        <View style={[styles.card, styles.ddayCard]}>
          <View style={styles.ddayRow}>
            <View>
              <Text style={styles.ddayLabel}>수능까지</Text>
              <Text style={styles.ddayCount}>{ddayLabel}</Text>
              <Text style={styles.ddaySub}>
                {new Date(targetDate).toLocaleDateString('ko-KR', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.ddayEditBtn}
              onPress={() => setEditingDday((v) => !v)}
              activeOpacity={0.8}
            >
              <Text style={styles.ddayEditText}>{editingDday ? '닫기' : '변경'}</Text>
            </TouchableOpacity>
          </View>
          {editingDday && (
            <View style={styles.ddayEditRow}>
              <TextInput
                style={styles.ddayInput}
                value={ddayInput}
                onChangeText={setDdayInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#a1a1aa"
                keyboardType="numbers-and-punctuation"
              />
              <TouchableOpacity style={styles.ddaySaveBtn} onPress={saveDday} activeOpacity={0.85}>
                <Text style={styles.ddaySaveBtnText}>저장</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* 오늘의 학습 계획 */}
        <Card title="오늘의 학습 계획">
          {assignments.length === 0 ? (
            <Text style={styles.empty}>오늘 마감인 과제가 없습니다.</Text>
          ) : (
            assignments.map((a) => {
              const isOverdue = a.due_date && a.due_date < TODAY && a.pct < 100
              const catColor = a.category ? (CAT_COLORS[a.category] ?? { bg: '#f4f4f5', text: '#52525b' }) : { bg: '#f4f4f5', text: '#52525b' }
              return (
                <View key={a.id} style={styles.asgnItem}>
                  <View style={styles.asgnRow}>
                    <View style={[styles.catBadge, { backgroundColor: catColor.bg }]}>
                      <Text style={[styles.catBadgeText, { color: catColor.text }]}>
                        {a.category ?? '기타'}
                      </Text>
                    </View>
                    <Text
                      style={[styles.asgnTitle, isOverdue && styles.overdueText]}
                      numberOfLines={1}
                    >
                      {a.title}
                    </Text>
                    <Text style={styles.pctText}>{a.pct}%</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${a.pct}%` as `${number}%`,
                          backgroundColor: a.pct === 100 ? '#09090b' : isOverdue ? '#f87171' : '#52525b',
                        },
                      ]}
                    />
                  </View>
                  {a.due_date && (
                    <Text style={[styles.dueDateText, isOverdue && styles.overdueDue]}>
                      마감 {new Date(a.due_date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      {isOverdue ? ' · 밀린 과제' : ''}
                    </Text>
                  )}
                </View>
              )
            })
          )}
        </Card>

        {/* 공지사항 */}
        <Card title="공지사항">
          {notices.length === 0 ? (
            <Text style={styles.empty}>공지사항이 없습니다.</Text>
          ) : (
            notices.map((n, i) => (
              <View key={n.id} style={[styles.listItem, i < notices.length - 1 && styles.listBorder]}>
                {n.is_pinned && (
                  <View style={styles.pinBadge}>
                    <Text style={styles.pinBadgeText}>고정</Text>
                  </View>
                )}
                <Text style={styles.listItemTitle} numberOfLines={1}>{n.title}</Text>
                <Text style={styles.listItemDate}>
                  {new Date(n.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                </Text>
              </View>
            ))
          )}
        </Card>

        {/* 질의응답 */}
        <Card title="질의응답">
          {questions.length === 0 ? (
            <Text style={styles.empty}>아직 질문이 없습니다.</Text>
          ) : (
            questions.map((q, i) => {
              const s = QNA_STATUS[q.status] ?? QNA_STATUS.open
              return (
                <View key={q.id} style={[styles.listItem, i < questions.length - 1 && styles.listBorder]}>
                  <Text style={styles.listItemTitle} numberOfLines={1}>
                    {q.content.slice(0, 50)}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: s.text }]}>{s.label}</Text>
                  </View>
                </View>
              )
            })
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e4e4e7',
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#09090b',
    marginBottom: 4,
  },

  // D-day 카드
  ddayCard: { gap: 12 },
  ddayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ddayLabel: { fontSize: 12, color: '#a1a1aa' },
  ddayCount: { fontSize: 40, fontWeight: '800', color: '#09090b', letterSpacing: -1, marginTop: 2 },
  ddaySub: { fontSize: 12, color: '#71717a', marginTop: 2 },
  ddayEditBtn: {
    borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  ddayEditText: { fontSize: 12, color: '#71717a' },
  ddayEditRow: { flexDirection: 'row', gap: 8 },
  ddayInput: {
    flex: 1, height: 40, borderWidth: 1, borderColor: '#e4e4e7',
    borderRadius: 10, paddingHorizontal: 12, fontSize: 14, color: '#09090b',
    backgroundColor: '#f4f4f5',
  },
  ddaySaveBtn: {
    backgroundColor: '#09090b', borderRadius: 10, paddingHorizontal: 14,
    justifyContent: 'center',
  },
  ddaySaveBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },

  // 과제
  asgnItem: { gap: 6 },
  asgnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  catBadgeText: { fontSize: 10, fontWeight: '600' },
  asgnTitle: { flex: 1, fontSize: 13, color: '#09090b' },
  overdueText: { color: '#dc2626' },
  pctText: { fontSize: 12, fontWeight: '600', color: '#3f3f46' },
  progressBg: { height: 4, borderRadius: 99, backgroundColor: '#f4f4f5', overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 99 },
  dueDateText: { fontSize: 10, color: '#a1a1aa' },
  overdueDue: { color: '#f87171' },

  // 리스트
  listItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 8,
  },
  listBorder: { borderBottomWidth: 1, borderBottomColor: '#f4f4f5' },
  listItemTitle: { flex: 1, fontSize: 13, color: '#09090b' },
  listItemDate: { fontSize: 10, color: '#a1a1aa' },
  pinBadge: { backgroundColor: '#09090b', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  pinBadgeText: { fontSize: 9, color: '#fff', fontWeight: '600' },
  statusBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },

  empty: { fontSize: 13, color: '#a1a1aa', textAlign: 'center', paddingVertical: 8 },
  errorText: { fontSize: 12, color: '#ef4444', textAlign: 'center' },
})
