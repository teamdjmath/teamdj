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
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'

const TODAY = new Date().toISOString().split('T')[0]
const LS_WORK_STATUS = 'teamdj_work_status'

type WorkStatus = 'online' | 'busy' | 'offline'

const WORK_STATUSES: { key: WorkStatus; label: string }[] = [
  { key: 'online', label: '근무중' },
  { key: 'busy',   label: '바쁨'   },
  { key: 'offline', label: '오프라인' },
]

interface ClassAttendance {
  classId: string
  className: string
  subject: string
  present: number
  late: number
  absent: number
  total: number
}

export default function WorkScreen() {
  const [workStatus, setWorkStatus] = useState<WorkStatus>('online')
  const [classes, setClasses] = useState<ClassAttendance[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    AsyncStorage.getItem(LS_WORK_STATUS).then((v) => {
      if (v) setWorkStatus(v as WorkStatus)
    })
  }, [])

  const load = useCallback(async () => {
    try {
      const { data: classRows } = await supabase
        .from('class_groups')
        .select('id, name, subject')
        .order('name')

      if (!classRows?.length) {
        setClasses([])
        return
      }

      const classIds = classRows.map((c) => c.id as string)

      const [{ data: logs }, { data: members }] = await Promise.all([
        supabase
          .from('attendance_logs')
          .select('class_id, student_id, status')
          .in('class_id', classIds)
          .eq('session_date', TODAY),
        supabase
          .from('class_members')
          .select('class_id')
          .in('class_id', classIds)
          .eq('is_active', true),
      ])

      // 분반별 집계
      const statsMap: Record<string, { present: number; late: number; absent: number; total: number }> = {}
      for (const c of classRows) {
        statsMap[c.id as string] = { present: 0, late: 0, absent: 0, total: 0 }
      }
      for (const m of members ?? []) {
        statsMap[m.class_id as string].total++
      }
      for (const l of logs ?? []) {
        const s = statsMap[l.class_id as string]
        if (!s) continue
        if (l.status === 'present')     s.present++
        else if (l.status === 'late')   s.late++
        else if (l.status === 'absent') s.absent++
      }

      setClasses(
        classRows.map((c) => ({
          classId:   c.id as string,
          className: c.name as string,
          subject:   c.subject as string,
          ...statsMap[c.id as string],
        })),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function handleStatusChange(s: WorkStatus) {
    setWorkStatus(s)
    AsyncStorage.setItem(LS_WORK_STATUS, s)
  }

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const today = new Date().toLocaleDateString('ko-KR', {
    month: 'long', day: 'numeric', weekday: 'short',
  })

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#09090b" />
        }
      >
        {/* 근무 상태 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>근무 상태</Text>
          <View style={styles.statusRow}>
            {WORK_STATUSES.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                style={[styles.statusBtn, workStatus === key && styles.statusBtnActive]}
                onPress={() => handleStatusChange(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.statusBtnText, workStatus === key && styles.statusBtnTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 오늘 출결 현황 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>오늘 출결 현황</Text>
            <Text style={styles.cardDate}>{today}</Text>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {classes.length === 0 ? (
            <Text style={styles.empty}>등록된 분반이 없습니다.</Text>
          ) : (
            classes.map((c, i) => {
              const checked = c.present + c.late + c.absent
              const pct = c.total > 0 ? Math.round((checked / c.total) * 100) : 0
              return (
                <View
                  key={c.classId}
                  style={[styles.classItem, i < classes.length - 1 && styles.classBorder]}
                >
                  <View style={styles.classTop}>
                    <Text style={styles.className}>{c.className}</Text>
                    <Text style={styles.classSubject}>{c.subject}</Text>
                  </View>

                  <View style={styles.statsRow}>
                    <View style={styles.statChip}>
                      <Text style={styles.statCount}>{c.present}</Text>
                      <Text style={styles.statLabel}>출석</Text>
                    </View>
                    <View style={[styles.statChip, styles.statLate]}>
                      <Text style={[styles.statCount, styles.statCountLate]}>{c.late}</Text>
                      <Text style={styles.statLabel}>지각</Text>
                    </View>
                    <View style={[styles.statChip, styles.statAbsent]}>
                      <Text style={[styles.statCount, styles.statCountAbsent]}>{c.absent}</Text>
                      <Text style={styles.statLabel}>결석</Text>
                    </View>
                    <Text style={styles.statTotal}>/ {c.total}명</Text>
                  </View>

                  <View style={styles.progressBg}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${pct}%` as `${number}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressLabel}>{checked}/{c.total} 체크됨</Text>
                </View>
              )
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 40 },

  card: { backgroundColor: '#f8f8fa', borderRadius: 24, padding: 20, gap: 14 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: {
    fontSize: 12, fontWeight: '600', color: '#a1a1aa',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  cardDate: { fontSize: 12, color: '#a1a1aa' },
  empty:     { fontSize: 14, color: '#a1a1aa', textAlign: 'center', paddingVertical: 12 },
  errorText: { fontSize: 12, color: '#ef4444', textAlign: 'center' },

  // 근무 상태
  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 16,
    backgroundColor: '#ffffff', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e4e4e7',
  },
  statusBtnActive:     { backgroundColor: '#09090b', borderColor: '#09090b' },
  statusBtnText:       { fontSize: 13, fontWeight: '600', color: '#71717a' },
  statusBtnTextActive: { color: '#ffffff' },

  // 분반 출결
  classItem:  { gap: 10, paddingVertical: 14 },
  classBorder:{ borderBottomWidth: 1, borderBottomColor: '#f1f1f4' },
  classTop:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  className:  { fontSize: 15, fontWeight: '600', color: '#09090b' },
  classSubject: { fontSize: 12, color: '#a1a1aa' },

  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ffffff', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6,
  },
  statLate:         { backgroundColor: '#fef3c7' },
  statAbsent:       { backgroundColor: '#fee2e2' },
  statCount:        { fontSize: 15, fontWeight: '700', color: '#09090b' },
  statCountLate:    { color: '#d97706' },
  statCountAbsent:  { color: '#dc2626' },
  statLabel:        { fontSize: 11, color: '#a1a1aa' },
  statTotal:        { fontSize: 13, color: '#a1a1aa', marginLeft: 'auto' },

  progressBg:    { height: 3, borderRadius: 99, backgroundColor: '#e4e4e7', overflow: 'hidden' },
  progressFill:  { height: 3, borderRadius: 99, backgroundColor: '#09090b' },
  progressLabel: { fontSize: 11, color: '#a1a1aa', textAlign: 'right' },
})
