import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

// 시간표 상수 — 클릭하면 상세 팝업이 나오므로 카드는 작게 유지
const PX_PER_MIN = 0.40
const TIME_W     = 18
const COL_W      = 38

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']
const DOW_LIST   = [1, 2, 3, 4, 5, 6, 0]

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

type ExtraSchedule = {
  id: string
  title: string
  scheduled_date: string
  start_time: string
  end_time: string
  note: string | null
}

type StaffMember = {
  userId: string
  name: string
  role: string
  status: WorkStatus
}

type PopupData =
  | { kind: 'class'; cls: ClassRow; color: ReturnType<typeof getClassColor> }
  | { kind: 'extra'; es: ExtraSchedule }

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

function getClassColor(idx: number) {
  const hue = Math.round((idx * 137.508) % 360)
  return {
    bg:     `hsl(${hue}, 62%, 88%)` as string,
    text:   `hsl(${hue}, 60%, 20%)` as string,
    border: `hsl(${hue}, 62%, 68%)` as string,
  }
}

function localDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getWeekDates() {
  const today = new Date()
  const day   = today.getDay()
  const diff  = day === 0 ? -6 : 1 - day
  const mon   = new Date(today)
  mon.setDate(today.getDate() + diff)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon)
    d.setDate(mon.getDate() + i)
    return d
  })
}

function getWeekRange() {
  const dates = getWeekDates()
  return { start: localDateStr(dates[0]), end: localDateStr(dates[6]) }
}

function ClassCard({
  cls, color, top, height, onPress,
}: {
  cls: ClassRow; color: ReturnType<typeof getClassColor>
  top: number; height: number; onPress: () => void
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.classCard, { top, height, backgroundColor: color.bg, borderLeftColor: color.border }]}
    >
      <Text style={[styles.classCardName, { color: color.text }]} numberOfLines={1}>
        {cls.name}
      </Text>
      {height >= 26 && (
        <Text style={[styles.classCardTime, { color: color.text }]} numberOfLines={1}>
          {cls.start_time!.slice(0, 5)}–{cls.end_time!.slice(0, 5)}
        </Text>
      )}
    </TouchableOpacity>
  )
}

function ExtraCard({
  es, top, height, onPress,
}: {
  es: ExtraSchedule; top: number; height: number; onPress: () => void
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[styles.extraCard, { top, height }]}
    >
      <Text style={styles.extraCardName} numberOfLines={1}>{es.title}</Text>
      {height >= 26 && (
        <Text style={styles.extraCardTime} numberOfLines={1}>
          {es.start_time.slice(0, 5)}–{es.end_time.slice(0, 5)}
        </Text>
      )}
    </TouchableOpacity>
  )
}

export default function WorkScreen() {
  const { user, role } = useAuth()
  const [workStatus, setWorkStatus]       = useState<WorkStatus>('offline')
  const [classes, setClasses]             = useState<ClassRow[]>([])
  const [extraSchedules, setExtraSchedules] = useState<ExtraSchedule[]>([])
  const [staffList, setStaffList]         = useState<StaffMember[]>([])
  const [loading, setLoading]             = useState(true)
  const [refreshing, setRefreshing]       = useState(false)
  const [now, setNow]                     = useState(new Date())
  const [popup, setPopup]                 = useState<PopupData | null>(null)

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const load = useCallback(async () => {
    if (!user) return
    try {
      // 내 근무 상태
      const { data: statusRow } = await supabase
        .from('staff_status').select('status').eq('user_id', user.id).single()
      if (statusRow?.status) setWorkStatus(toWorkStatus(statusRow.status))

      // 시간표
      const { data: classRows } = await supabase
        .from('class_groups')
        .select('id, name, subject, start_time, end_time, day_of_week')
        .order('name')
      let allClasses = (classRows ?? []) as ClassRow[]

      if (role === 'ta') {
        const { data: access } = await supabase
          .from('ta_class_access').select('class_id, is_all_classes').eq('ta_id', user.id)
        const hasAll = (access ?? []).some((a) => a.is_all_classes)
        if (!hasAll) {
          const allowed = new Set((access ?? []).map((a) => a.class_id as string).filter(Boolean))
          allClasses = allClasses.filter((c) => allowed.has(c.id))
        }
      }
      setClasses(allClasses)

      // 이번 주 추가 근무
      const { start, end } = getWeekRange()
      const { data: extraRows } = await supabase
        .from('extra_schedules')
        .select('id, title, scheduled_date, start_time, end_time, note')
        .eq('user_id', user.id)
        .gte('scheduled_date', start)
        .lte('scheduled_date', end)
        .order('scheduled_date').order('start_time')
      setExtraSchedules((extraRows ?? []) as ExtraSchedule[])

      // 스태프 현황
      const { data: staffUsers } = await supabase
        .from('users').select('id, name, role')
        .in('role', ['teacher', 'ta']).eq('is_active', true).order('role').order('name')

      const staffIds = (staffUsers ?? []).map((u) => u.id as string)
      const statusMap: Record<string, string> = {}
      if (staffIds.length > 0) {
        const { data: statusRows } = await supabase
          .from('staff_status').select('user_id, status').in('user_id', staffIds)
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

  // 스태프 상태 실시간
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('staff_status_work')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_status' }, (payload) => {
        const row = payload.new as { user_id: string; status: string } | undefined
        if (!row) return
        setStaffList((prev) =>
          prev.map((s) => s.userId === row.user_id ? { ...s, status: toWorkStatus(row.status) } : s),
        )
        if (row.user_id === user.id) setWorkStatus(toWorkStatus(row.status))
      })
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

  const weekDates = useMemo(() => getWeekDates(), [])
  const todayDow  = now.getDay()
  const nowMin    = now.getHours() * 60 + now.getMinutes()

  const sorted   = useMemo(() => [...classes].sort((a, b) => a.name.localeCompare(b.name, 'ko')), [classes])
  const colorMap = useMemo(
    () => Object.fromEntries(sorted.map((c, i) => [c.id, getClassColor(i)])),
    [sorted],
  )

  // 버퍼 없이 실제 수업/추가 근무 시간에 딱 맞게 범위 계산
  const { dynStart, dynEnd } = useMemo(() => {
    const mins = [
      ...classes.filter((c) => c.start_time && c.end_time).flatMap((c) => [
        timeToMin(c.start_time!), timeToMin(c.end_time!),
      ]),
      ...extraSchedules.flatMap((es) => [timeToMin(es.start_time), timeToMin(es.end_time)]),
    ]
    if (mins.length === 0) return { dynStart: 9, dynEnd: 21 }
    return {
      dynStart: Math.max(7,  Math.floor(Math.min(...mins) / 60)),
      dynEnd:   Math.min(24, Math.ceil(Math.max(...mins)  / 60)),
    }
  }, [classes, extraSchedules])

  const totalH   = (dynEnd - dynStart) * 60 * PX_PER_MIN
  const minToTop = (min: number) => (min - dynStart * 60) * PX_PER_MIN
  const hours    = Array.from({ length: dynEnd - dynStart }, (_, i) => dynStart + i)
  const nowTop   = minToTop(nowMin)

  // 날짜별 추가 근무 인덱스
  const extraByDate = useMemo(() => {
    const map: Record<string, ExtraSchedule[]> = {}
    for (const es of extraSchedules) {
      if (!map[es.scheduled_date]) map[es.scheduled_date] = []
      map[es.scheduled_date].push(es)
    }
    return map
  }, [extraSchedules])

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
                  const isToday   = DOW_LIST[i] === todayDow
                  const isWeekend = i >= 5
                  return (
                    <View key={i} style={[styles.ttDayHeader, { width: COL_W }]}>
                      <Text style={[
                        styles.ttDayLabel,
                        isToday   && styles.ttDayLabelToday,
                        isWeekend && !isToday && styles.ttDayLabelWeekend,
                      ]}>
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
                <View style={{ width: TIME_W, height: totalH }}>
                  {hours.map((h) => (
                    <Text key={h} style={[styles.ttHourLabel, { top: minToTop(h * 60) - 5 }]}>
                      {h}
                    </Text>
                  ))}
                </View>

                {DOW_LIST.map((dow, colIdx) => {
                  const colDate    = weekDates[colIdx]
                  const colDateStr = localDateStr(colDate)
                  const isToday    = dow === todayDow
                  const dayClasses = classes.filter(
                    (c) => c.day_of_week?.includes(dow) && c.start_time && c.end_time,
                  )
                  const dayExtra = extraByDate[colDateStr] ?? []

                  return (
                    <View
                      key={dow}
                      style={[
                        styles.ttDayCol,
                        { width: COL_W, height: totalH },
                        isToday && styles.ttDayColToday,
                      ]}
                    >
                      {hours.map((h) => (
                        <View key={h} style={[styles.ttGridLine, { top: minToTop(h * 60) }]} />
                      ))}

                      {isToday && nowMin >= dynStart * 60 && nowMin < dynEnd * 60 && (
                        <View style={[styles.ttNowLine, { top: nowTop }]} />
                      )}

                      {dayClasses.map((cls) => {
                        const top    = minToTop(timeToMin(cls.start_time!))
                        const height = Math.max(
                          (timeToMin(cls.end_time!) - timeToMin(cls.start_time!)) * PX_PER_MIN, 16,
                        )
                        const active = isActive(cls)
                        return (
                          <ClassCard
                            key={cls.id}
                            cls={cls}
                            color={colorMap[cls.id]}
                            top={top}
                            height={height}
                            onPress={() => setPopup({ kind: 'class', cls, color: colorMap[cls.id] })}
                          />
                        )
                      })}

                      {dayExtra.map((es) => {
                        const top    = minToTop(timeToMin(es.start_time))
                        const height = Math.max(
                          (timeToMin(es.end_time) - timeToMin(es.start_time)) * PX_PER_MIN, 16,
                        )
                        return (
                          <ExtraCard
                            key={es.id}
                            es={es}
                            top={top}
                            height={height}
                            onPress={() => setPopup({ kind: 'extra', es })}
                          />
                        )
                      })}
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
                  style={[styles.staffRow, i < staffList.length - 1 && styles.staffRowBorder]}
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
                  <View style={[
                    styles.staffBadge,
                    {
                      backgroundColor:
                        member.status === 'online' ? '#ecfdf5'
                        : member.status === 'busy'  ? '#fffbeb'
                        : '#f4f4f5',
                    },
                  ]}>
                    <Text style={[
                      styles.staffBadgeText,
                      {
                        color:
                          member.status === 'online' ? '#059669'
                          : member.status === 'busy'  ? '#d97706'
                          : '#a1a1aa',
                      },
                    ]}>
                      {STATUS_LABEL[member.status]}
                    </Text>
                  </View>
                </View>
              )
            })
          )}
        </View>
      </ScrollView>

      {/* 카드 클릭 팝업 */}
      <Modal
        visible={!!popup}
        transparent
        animationType="fade"
        onRequestClose={() => setPopup(null)}
      >
        <TouchableOpacity
          style={styles.popupOverlay}
          activeOpacity={1}
          onPress={() => setPopup(null)}
        >
          <View
            style={[
              styles.popupCard,
              popup?.kind === 'class'
                ? { borderLeftColor: popup.color.border }
                : { borderLeftColor: '#fbbf24' },
            ]}
          >
            {popup?.kind === 'class' ? (
              <>
                <Text style={styles.popupName}>{popup.cls.name}</Text>
                {popup.cls.subject ? (
                  <Text style={styles.popupSubject}>{popup.cls.subject}</Text>
                ) : null}
                <Text style={styles.popupTime}>
                  {popup.cls.start_time?.slice(0, 5)} – {popup.cls.end_time?.slice(0, 5)}
                </Text>
              </>
            ) : popup?.kind === 'extra' ? (
              <>
                <Text style={styles.popupName}>{popup.es.title}</Text>
                <Text style={styles.popupSubject}>추가 근무</Text>
                <Text style={styles.popupTime}>
                  {popup.es.start_time.slice(0, 5)} – {popup.es.end_time.slice(0, 5)}
                </Text>
                {popup.es.note ? (
                  <Text style={styles.popupNote}>{popup.es.note}</Text>
                ) : null}
              </>
            ) : null}
          </View>
        </TouchableOpacity>
      </Modal>
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
    borderBottomWidth: 1, borderBottomColor: '#e4e4e7',
    paddingBottom: 4,
  },
  ttDayHeader:       { alignItems: 'center', paddingVertical: 3 },
  ttDayLabel:        { fontSize: 10, fontWeight: '600', color: '#a1a1aa' },
  ttDayLabelToday:   { color: '#09090b' },
  ttDayLabelWeekend: { color: '#d4d4d8' },
  ttDayDate:         { fontSize: 8, color: '#d4d4d8', marginTop: 1 },
  ttDayDateToday:    { color: '#71717a', fontWeight: '600' },

  ttBody:      { flexDirection: 'row' },
  ttHourLabel: { position: 'absolute', right: 1, fontSize: 8, color: '#d4d4d8', lineHeight: 11 },
  ttDayCol:    { position: 'relative', borderLeftWidth: 1, borderLeftColor: '#f1f1f4' },
  ttDayColToday: { backgroundColor: 'rgba(9,9,11,0.025)' },
  ttGridLine: {
    position: 'absolute', left: 0, right: 0,
    borderTopWidth: 1, borderTopColor: '#f1f1f4',
  },
  ttNowLine: {
    position: 'absolute', left: 0, right: 0,
    borderTopWidth: 2, borderTopColor: '#ef4444', zIndex: 20,
  },

  classCard: {
    position: 'absolute', left: 1, right: 1,
    borderRadius: 3, borderLeftWidth: 2,
    paddingHorizontal: 2, paddingVertical: 1,
    overflow: 'hidden', zIndex: 1,
  },
  classCardName: { fontSize: 7, fontWeight: '700', lineHeight: 10 },
  classCardTime: { fontSize: 6, lineHeight: 9, opacity: 0.7, marginTop: 1 },

  extraCard: {
    position: 'absolute', left: 1, right: 1,
    borderRadius: 3, borderLeftWidth: 2, borderLeftColor: '#fbbf24',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 2, paddingVertical: 1,
    overflow: 'hidden', zIndex: 2,
  },
  extraCardName: { fontSize: 7, fontWeight: '700', lineHeight: 10, color: '#92400e' },
  extraCardTime: { fontSize: 6, lineHeight: 9, opacity: 0.7, color: '#92400e', marginTop: 1 },

  staffEmpty: { fontSize: 13, color: '#a1a1aa', textAlign: 'center', paddingVertical: 8 },
  staffRow:   { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  staffRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f1f1f4' },
  staffDot:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  staffInfo:  { flex: 1 },
  staffName:  { fontSize: 13, fontWeight: '500', color: '#09090b' },
  staffMe:    { fontSize: 11, fontWeight: '400', color: '#a1a1aa' },
  staffRole:  { fontSize: 11, color: '#a1a1aa', marginTop: 1 },
  staffBadge: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  staffBadgeText: { fontSize: 11, fontWeight: '500' },

  popupOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  popupCard: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 20, minWidth: 200,
    borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  popupName:    { fontSize: 16, fontWeight: '700', color: '#09090b' },
  popupSubject: { fontSize: 12, color: '#a1a1aa', marginTop: 2 },
  popupTime:    { fontSize: 14, fontWeight: '600', color: '#52525b', marginTop: 10 },
  popupNote:    { fontSize: 12, color: '#a1a1aa', marginTop: 4 },
})
