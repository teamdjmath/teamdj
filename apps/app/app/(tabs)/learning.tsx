import { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  '매월승리': { bg: '#09090b', text: '#fff' },
  'KBS':      { bg: '#3f3f46', text: '#fff' },
  'EB-Schema':{ bg: '#a1a1aa', text: '#fff' },
}

interface Lecture {
  id: string
  title: string
  youtubeVideoId: string
  orderNum: number
}

interface Assignment {
  id: string
  title: string
  category: string | null
  due_date: string | null
  week_num: number | null
  pct: number
}

export default function LearningScreen() {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: memberships } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('student_id', user.id)
          .eq('is_active', true)

        const classIds = (memberships ?? []).map((m) => m.class_id as string)

        const [lecRes, asgnRes] = await Promise.all([
          classIds.length
            ? supabase
                .from('lectures')
                .select('id, title, youtube_video_id, order_num')
                .in('class_id', classIds)
                .order('order_num')
                .limit(30)
            : { data: [] },
          classIds.length
            ? supabase
                .from('assignments')
                .select('id, title, category, due_date, week_num')
                .in('class_id', classIds)
                .order('week_num', { ascending: false })
                .order('due_date')
            : { data: [] },
        ])

        const asgnIds = (asgnRes.data ?? []).map((a) => a.id as string)
        const { data: prog } = asgnIds.length
          ? await supabase
              .from('assignment_progress')
              .select('assignment_id, completion_pct')
              .eq('student_id', user.id)
              .in('assignment_id', asgnIds)
          : { data: [] }

        const progressMap: Record<string, number> = {}
        for (const p of prog ?? []) {
          progressMap[p.assignment_id as string] = (p.completion_pct as number) ?? 0
        }

        setLectures(
          (lecRes.data ?? []).map((l) => ({
            id: l.id as string,
            title: l.title as string,
            youtubeVideoId: l.youtube_video_id as string,
            orderNum: l.order_num as number,
          })),
        )
        setAssignments(
          (asgnRes.data ?? []).map((a) => ({
            id: a.id as string,
            title: a.title as string,
            category: a.category as string | null,
            due_date: a.due_date as string | null,
            week_num: a.week_num as number | null,
            pct: progressMap[a.id as string] ?? 0,
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

  // 주차별 그룹핑
  const weekGroups: Record<number, Assignment[]> = {}
  for (const a of assignments) {
    const wk = a.week_num ?? 0
    if (!weekGroups[wk]) weekGroups[wk] = []
    weekGroups[wk].push(a)
  }
  const sortedWeeks = Object.keys(weekGroups).map(Number).sort((a, b) => b - a)

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
        <Text style={styles.pageTitle}>학습</Text>
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* 강의 영상 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>강의 영상</Text>
          {lectures.length === 0 ? (
            <Text style={styles.empty}>등록된 강의 영상이 없습니다.</Text>
          ) : (
            <View style={styles.lectureGrid}>
              {lectures.map((lec) => (
                <TouchableOpacity
                  key={lec.id}
                  style={styles.lectureItem}
                  activeOpacity={0.8}
                  onPress={() =>
                    Linking.openURL(`https://www.youtube.com/watch?v=${lec.youtubeVideoId}`)
                  }
                >
                  <View style={styles.thumbnailWrap}>
                    <Image
                      source={{ uri: `https://img.youtube.com/vi/${lec.youtubeVideoId}/mqdefault.jpg` }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                    <View style={styles.orderBadge}>
                      <Text style={styles.orderBadgeText}>{lec.orderNum}강</Text>
                    </View>
                    <View style={styles.playOverlay}>
                      <Text style={styles.playIcon}>▶</Text>
                    </View>
                  </View>
                  <Text style={styles.lecTitle} numberOfLines={2}>{lec.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 주간 과제 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>과제 목록</Text>
          {sortedWeeks.length === 0 ? (
            <Text style={styles.empty}>등록된 과제가 없습니다.</Text>
          ) : (
            sortedWeeks.map((wk) => (
              <View key={wk} style={styles.weekGroup}>
                <Text style={styles.weekLabel}>{wk > 0 ? `${wk}주차` : '미분류'}</Text>
                <View style={styles.asgnList}>
                  {weekGroups[wk].map((a) => {
                    const isOverdue = a.due_date && a.due_date < TODAY && a.pct < 100
                    const catColor = a.category
                      ? (CAT_COLORS[a.category] ?? { bg: '#f4f4f5', text: '#52525b' })
                      : { bg: '#f4f4f5', text: '#52525b' }
                    return (
                      <View key={a.id} style={styles.asgnItem}>
                        <View style={styles.asgnRow}>
                          <View style={[styles.catBadge, { backgroundColor: catColor.bg }]}>
                            <Text style={[styles.catText, { color: catColor.text }]}>
                              {a.category ?? '기타'}
                            </Text>
                          </View>
                          <Text
                            style={[styles.asgnTitle, isOverdue && styles.overdueText]}
                            numberOfLines={1}
                          >
                            {a.title}
                          </Text>
                          <Text style={styles.pct}>{a.pct}%</Text>
                        </View>
                        <View style={styles.progressBg}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${a.pct}%` as `${number}%`,
                                backgroundColor:
                                  a.pct === 100 ? '#09090b' : isOverdue ? '#f87171' : '#52525b',
                              },
                            ]}
                          />
                        </View>
                        {a.due_date && (
                          <Text style={[styles.dueDate, isOverdue && styles.overdueDue]}>
                            마감{' '}
                            {new Date(a.due_date).toLocaleDateString('ko-KR', {
                              month: 'short', day: 'numeric',
                            })}
                            {isOverdue ? ' · 밀린 과제' : ''}
                          </Text>
                        )}
                      </View>
                    )
                  })}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fafafa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fafafa' },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 32 },
  pageTitle: { fontSize: 20, fontWeight: '700', color: '#09090b', marginBottom: 4 },
  errorText: { fontSize: 12, color: '#ef4444', textAlign: 'center' },

  card: {
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e4e4e7', padding: 16, gap: 12,
  },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#09090b' },
  empty: { fontSize: 13, color: '#a1a1aa', textAlign: 'center', paddingVertical: 8 },

  // 강의 그리드
  lectureGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  lectureItem: { width: '47%' },
  thumbnailWrap: { borderRadius: 10, overflow: 'hidden', aspectRatio: 16 / 9, backgroundColor: '#f4f4f5', position: 'relative' },
  thumbnail: { width: '100%', height: '100%' },
  orderBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: 'rgba(0,0,0,0.65)', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  orderBadgeText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  playOverlay: {
    position: 'absolute', inset: 0 as never,
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'transparent',
  },
  playIcon: { fontSize: 22, color: 'rgba(255,255,255,0.85)' },
  lecTitle: { fontSize: 12, color: '#09090b', fontWeight: '500', marginTop: 6, lineHeight: 16 },

  // 과제
  weekGroup: { gap: 8 },
  weekLabel: { fontSize: 11, fontWeight: '600', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 0.5 },
  asgnList: { gap: 10 },
  asgnItem: { gap: 5 },
  asgnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  catText: { fontSize: 10, fontWeight: '600' },
  asgnTitle: { flex: 1, fontSize: 13, color: '#09090b' },
  overdueText: { color: '#dc2626' },
  pct: { fontSize: 12, fontWeight: '600', color: '#3f3f46' },
  progressBg: { height: 4, borderRadius: 99, backgroundColor: '#f4f4f5', overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 99 },
  dueDate: { fontSize: 10, color: '#a1a1aa' },
  overdueDue: { color: '#f87171' },
})
