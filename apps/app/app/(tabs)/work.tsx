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
const END_HOUR   = 21
const PX_PER_MIN = 0.65
const TOTAL_H    = (END_HOUR - START_HOUR) * 60 * PX_PER_MIN
const TIME_W     = 22
const COL_W      = 52

const DAY_LABELS = ['월', '화', '수', '목', '금']
const DOW_LIST   = [1, 2, 3, 4, 5]

type WorkStatus = 'online' | 'busy' | 'offline'

const WORK_STATUSES: { key: WorkStatus; label: string }[] = [
  { key: 'online',  label: '근무중'   },
  { key: 'busy',    label: '바쁨'     },
  { key: 'offline', label: '오프라인' },
]

const STATUS_DOT: Record<WorkStatus, string> = {
  online:  '#34d399',
  busy:    '#fbbf24',
  offline: '#d4d4d8',
}

const STATUS_LABEL: Record<WorkStatus, string> = {
  online:  '근무중',
  busy:    '바쁨',
  offline: '오프라인',
}

function toWorkStatus(s: string | null): WorkStatus {
  if (s === 'online' || s === 'busy' || s === 'offline') return s
  return 'offline'
}

type ClassRow = {
  id: string
  name: string
  subject: string
  start_time: string | null
  end_time: string | null
  day_of_week: number[] | null
}

type StaffMember = {
  userId: string
  name: string
  role: string
  status: WorkStatus
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
  const height   = Math.max((endMin - startMin) * PX_PER_MIN, 18)

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
      {height >= 28 && (
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
  const [staffList, setStaffList]   = useState<StaffMember[]>([])
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
      // 내 근무 상태
      const { data: statusRow } = await supabase
        .from('staff_status')
        .select('status')
        .eq('user_id', user.id)
        .single()
      if (statusRow?.status) setWorkStatus(toWorkStatus(statusRow.status))

      // 시간표
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

      // 스태프 현황
      const { data: staffUsers } = await supabase
        .from('users')
        .select('id, name, role')
        .in('role', ['teacher', 'ta'])
        .eq('is_active', true)
        .order('role')
        .order('name')

      const staffIds = (staffUsers ?? []).map((u) => u.id as string)
      const statusMap: Record<string, string> = {}
      if (staffIds.length > 0) {
        const { data: statusRows } = await supabase
          .from('staff_status')
          .select('user_id, status')
          .in('user_id', staffIds)
        for (const row of statusRows ?? []) {
          statusMap[row.user_id as string] = row.status as string
        }
      }

      setStaffList(
        (staffUsers ?? []).map((u) => ({
          userId: u.id as string,
          name:   u.name as string,
          role:   u.role as string,
          status: toWorkStatus(statusMap[u.id as string] ?? null),
        })),
      )
    } catch {
      // silent
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user, role])

  useEffect(() => { load() }, [load])

  // 스태프 상태 실시간 업데이트
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('staff_status_work')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_status' },
        (payload) => {
          const row = payload.new as { user_id: string; status: string } | undefined
          if (!row) return
          setStaffList((prev) =>
            prev.map((s) =>
              s.userId === row.user_id
                ? { ...s, status: toWorkStatus(row.status) }
                : s,
            ),
          )
          if (row.user_id === user.id) {
            setWorkStatus(toWorkStatus(row.status))
          }
        },
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

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
                      style={[styles.ttHourLabel, { top: minToTop(h * 60) - 5 }]}
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

        {/* 스태프 현황 */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>스태프 현황</Text>
          {staffList.length === 0 ? (
            <Text style={styles.staffEmpty}>등록된 스태프가 없습니다.</Text>
          ) : (
            staffList.map((member, i) => {
              const isMe = member.userId === user?.id
              return (
                <View
                  key={member.userId}
                  style={[
                    styles.staffRow,
                    i < staffList.length - 1 && styles.staffRowBorder,
                  ]}
                >
                  <View style={[styles.staffDot, { backgroundColor: STATUS_DOT[member.status] }]} />
                  <View style={styles.staffInfo}>
                    <Text style={styles.staffName}>
                      {member.name}
                      {isMe && <Text style={styles.staffMe}> (나)</Text>}
                    </Text>
                    <Text style={styles.staffRole}>
                      {member.role === 'teacher' ? '선생님' : '조교'}
                    </Text>
                  </View>
                  <View style={[styles.staffBadge, { backgroundColor: member.status === 'online' ? '#ecfdf5' : member.status === 'busy' ? '#fffbeb' : '#f4f4f5' }]}>
                    <Text style={[styles.staffBadgeText, { color: member.status === 'online' ? '#059669' : member.status === 'busy' ? '#d97706' : '#a1a1aa' }]}>
                      {STATUS_LABEL[member.status]}
                    </Text>
                  </View>
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
  },
  ttDayHeader:      { alignItems: 'center', paddingVertical: 3 },
  ttDayLabel:       { fontSize: 10, fontWeight: '600', color: '#a1a1aa' },
  ttDayLabelToday:  { color: '#09090b' },
  ttDayDate:        { fontSize: 8, color: '#d4d4d8', marginTop: 1 },
  ttDayDateToday:   { color: '#71717a', fontWeight: '600' },

  ttBody:     { flexDirection: 'row' },
  ttHourLabel: {
    position: 'absolute',
    right: 1,
    fontSize: 8,
    color: '#d4d4d8',
    lineHeight: 11,
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
    left: 1,
    right: 1,
    borderRadius: 3,
    borderLeftWidth: 2,
    paddingHorizontal: 2,
    paddingVertical: 1,
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
  classCardName: { fontSize: 7, fontWeight: '700', lineHeight: 10 },
  classCardTime: { fontSize: 6, lineHeight: 9, opacity: 0.7, marginTop: 1 },

  staffEmpty: { fontSize: 13, color: '#a1a1aa', textAlign: 'center', paddingVertical: 8 },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  staffRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f1f4' },
  staffDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  staffInfo: { flex: 1 },
  staffName: { fontSize: 13, fontWeight: '500', color: '#09090b' },
  staffMe:   { fontSize: 11, fontWeight: '400', color: '#a1a1aa' },
  staffRole: { fontSize: 11, color: '#a1a1aa', marginTop: 1 },
  staffBadge: {
    borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3,
  },
  staffBadgeText: { fontSize: 11, fontWeight: '500' },
})
