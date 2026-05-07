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
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const START_HOUR = 9
const END_HOUR   = 22
const PX_PER_MIN = 1.0
const TOTAL_H    = (END_HOUR - START_HOUR) * 60 * PX_PER_MIN
const TIME_W     = 28
const COL_W      = 68

const DAY_LABELS = ['월', '화', '수', '목', '금']
const DOW_LIST   = [1, 2, 3, 4, 5]

type WorkStatus = 'online' | 'busy' | 'offline'

const WORK_STATUSES: { key: WorkStatus; label: string }[] = [
  { key: 'online',  label: '근무중'   },
  { key: 'busy',    label: '바쁨'     },
  { key: 'offline', label: '오프라인' },
]

type ClassRow = {
  id: string
  name: string
  subject: string
  start_time: string | null
  end_time: string | null
  day_of_week: number[] | null
}

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function minToTop(min: number) {
  return (min - START_HOUR * 60) * PX_PER_MIN
}

function getClassColor(idx: number) {
  const hue = Math.round((idx * 137.508) % 360)
  return {
    bg:     `hsl(${hue}, 62%, 88%)` as string,
    text:   `hsl(${hue}, 60%, 20%)` as string,
    border: `hsl(${hue}, 62%, 68%)` as string,
  }
}

function getWeekDates() {
  const today = new Date()
  const day   = today.getDay()
  const diff  = day === 0 ? -6 : 1 - day
  const mon   = new Date(today)
  mon.setDate(today.getDate() + diff)
  return DOW_LIST.map((_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d
  })
}

function ClassCard({
  cls,
  color,
  isActive,
}: {
  cls: ClassRow
  color: ReturnType<typeof getClassColor>
  isActive: boolean
}) {
  const startMin = timeToMin(cls.start_time!)
  const endMin   = timeToMin(cls.end_time!)
  const top      = minToTop(startMin)
  const height   = Math.max((endMin - startMin) * PX_PER_MIN, 22)

  return (
    <View
      style={[
        styles.classCard,
        {
          top,
          height,
          backgroundColor: color.bg,
          borderLeftColor: color.border,
        },
        isActive && styles.classCardActive,
      ]}
    >
      <Text style={[styles.classCardName, { color: color.text }]} numberOfLines={1}>
        {cls.name}
      </Text>
      {height >= 34 && (
        <Text style={[styles.classCardTime, { color: color.text }]} numberOfLines={1}>
          {cls.start_time!.slice(0, 5)}–{cls.end_time!.slice(0, 5)}
        </Text>
      )}
    </View>
  )
}

export default function WorkScreen() {
  const { user, role } = useAuth()
  const [workStatus, setWorkStatus] = useState<WorkStatus>('offline')
  const [classes, setClasses]       = useState<ClassRow[]>([])
  const [loading, setLoading]       = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [now, setNow]               = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const load = useCallback(async () => {
    if (!user) return
    try {
      const { data: statusRow } = await supabase
        .from('staff_status')
        .select('status')
        .eq('user_id', user.id)
        .single()
      if (statusRow?.status) setWorkStatus(statusRow.status as WorkStatus)

      const { data: classRows } = await supabase
        .from('class_groups')
        .select('id, name, subject, start_time, end_time, day_of_week')
        .order('name')
      let allClasses = (classRows ?? []) as ClassRow[]

      if (role === 'ta') {
        const { data: access } = await supabase
          .from('ta_class_access')
          .select('class_id, is_all_classes')
          .eq('ta_id', user.id)
        const hasAll = (access ?? []).some((a) => a.is_all_classes)
        if (!hasAll) {
          const allowed = new Set(
            (access ?? []).map((a) => a.class_id as string).filter(Boolean),
          )
          allClasses = allClasses.filter((c) => allowed.has(c.id))
        }
      }

      setClasses(allClasses)
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user, role])

  useEffect(() => { load() }, [load])

  async function handleStatusChange(s: WorkStatus) {
    setWorkStatus(s)
    if (!user) return
    await supabase.from('staff_status').upsert(
      { user_id: user.id, status: s, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  }

  const onRefresh = () => { setRefreshing(true); load() }

  const weekDates  = getWeekDates()
  const todayDow   = now.getDay()
  const nowMin     = now.getHours() * 60 + now.getMinutes()
  const nowTop     = minToTop(nowMin)
  const sorted     = [...classes].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
  const colorMap   = Object.fromEntries(sorted.map((c, i) => [c.id, getClassColor(i)]))
  const hours      = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)

  function isActive(cls: ClassRow) {
    if (!cls.day_of_week?.includes(todayDow)) return false
    if (!cls.start_time || !cls.end_time) return false
    return nowMin >= timeToMin(cls.start_time) && nowMin < timeToMin(cls.end_time)
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#09090b" />
        }
      >
        {/* 근무 상태 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>근무 상태</Text>
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

        {/* 주간 시간표 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>주간 시간표</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* 요일 헤더 */}
              <View style={styles.ttHeaderRow}>
                <View style={{ width: TIME_W }} />
                {weekDates.map((d, i) => {
                  const isToday = DOW_LIST[i] === todayDow
                  return (
                    <View key={i} style={[styles.ttDayHeader, { width: COL_W }]}>
                      <Text style={[styles.ttDayLabel, isToday && styles.ttDayLabelToday]}>
                        {DAY_LABELS[i]}
                      </Text>
                      <Text style={[styles.ttDayDate, isToday && styles.ttDayDateToday]}>
                        {d.getMonth() + 1}/{d.getDate()}
                      </Text>
                    </View>
                  )
                })}
              </View>

              {/* 그리드 */}
              <View style={styles.ttBody}>
                {/* 시간 축 */}
                <View style={{ width: TIME_W, height: TOTAL_H }}>
                  {hours.map((h) => (
                    <Text
                      key={h}
                      style={[styles.ttHourLabel, { top: minToTop(h * 60) - 6 }]}
                    >
                      {h}
                    </Text>
                  ))}
                </View>

                {/* 요일 컬럼 */}
                {DOW_LIST.map((dow, colIdx) => {
                  const isToday    = dow === todayDow
                  const dayClasses = classes.filter(
                    (c) => c.day_of_week?.includes(dow) && c.start_time && c.end_time,
                  )
                  return (
                    <View
                      key={dow}
                      style={[
                        styles.ttDayCol,
                        { width: COL_W, height: TOTAL_H },
                        isToday && styles.ttDayColToday,
                      ]}
                    >
                      {hours.map((h) => (
                        <View
                          key={h}
                          style={[styles.ttGridLine, { top: minToTop(h * 60) }]}
                        />
                      ))}

                      {isToday && nowMin >= START_HOUR * 60 && nowMin < END_HOUR * 60 && (
                        <View style={[styles.ttNowLine, { top: nowTop }]} />
                      )}

                      {dayClasses.map((cls) => (
                        <ClassCard
                          key={cls.id}
                          cls={cls}
                          color={colorMap[cls.id]}
                          isActive={isActive(cls)}
                        />
                      ))}
                    </View>
                  )
                })}
              </View>
            </View>
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#ffffff' },
  center:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  scroll:  { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 40 },

  card: { backgroundColor: '#f8f8fa', borderRadius: 20, padding: 16, gap: 12 },
  sectionLabel: {
    fontSize: 11, fontWeight: '600', color: '#a1a1aa',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  statusRow: { flexDirection: 'row', gap: 8 },
  statusBtn: {
    flex: 1, paddingVertical: 11, borderRadius: 14,
    backgroundColor: '#ffffff', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e4e4e7',
  },
  statusBtnActive:     { backgroundColor: '#09090b', borderColor: '#09090b' },
  statusBtnText:       { fontSize: 13, fontWeight: '600', color: '#71717a' },
  statusBtnTextActive: { color: '#ffffff' },

  ttHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e4e7',
    paddingBottom: 4,
    marginBottom: 0,
  },
  ttDayHeader:      { alignItems: 'center', paddingVertical: 4 },
  ttDayLabel:       { fontSize: 11, fontWeight: '600', color: '#a1a1aa' },
  ttDayLabelToday:  { color: '#09090b' },
  ttDayDate:        { fontSize: 9, color: '#d4d4d8', marginTop: 1 },
  ttDayDateToday:   { color: '#71717a', fontWeight: '600' },

  ttBody:     { flexDirection: 'row' },
  ttHourLabel: {
    position: 'absolute',
    right: 2,
    fontSize: 9,
    color: '#d4d4d8',
    lineHeight: 12,
  },
  ttDayCol: {
    position: 'relative',
    borderLeftWidth: 1,
    borderLeftColor: '#f1f1f4',
  },
  ttDayColToday:   { backgroundColor: 'rgba(9,9,11,0.025)' },
  ttGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#f1f1f4',
  },
  ttNowLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 2,
    borderTopColor: '#ef4444',
    zIndex: 20,
  },

  classCard: {
    position: 'absolute',
    left: 2,
    right: 2,
    borderRadius: 4,
    borderLeftWidth: 2,
    paddingHorizontal: 3,
    paddingVertical: 2,
    overflow: 'hidden',
    zIndex: 1,
  },
  classCardActive: {
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  classCardName: { fontSize: 8, fontWeight: '700', lineHeight: 11 },
  classCardTime: { fontSize: 7, lineHeight: 10, opacity: 0.7, marginTop: 1 },
})
