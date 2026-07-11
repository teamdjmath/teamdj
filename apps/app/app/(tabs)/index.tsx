import { useEffect, useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, TextInput, Modal, Switch,
  KeyboardAvoidingView, Platform, RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker from '@react-native-community/datetimepicker'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { categoryBadgeColor } from '@/lib/category-style'

// ────── 상수 ──────
const TODAY = new Date().toISOString().split('T')[0]
const TODAY_DOW = new Date().getDay() // 0=일,1=월,...,6=토
// 수능일 3년치 — D-Day가 지나면 자동으로 다음 수능일이 기본값이 됨
const CSAT_DATES = ['2026-11-19', '2027-11-18', '2028-11-16']
const CSAT_DEFAULT = CSAT_DATES.find((d) => d >= new Date().toISOString().slice(0, 10)) ?? CSAT_DATES[CSAT_DATES.length - 1]
const LS_DDAY      = 'teamdj_dday_target'
const LS_DDAY_TITLE = 'teamdj_dday_title'

const QNA_STATUS: Record<string, { label: string; bg: string; text: string }> = {
  open:        { label: '미답변',   bg: '#f4f4f5', text: '#71717a' },
  in_progress: { label: '답변중',   bg: '#09090b', text: '#fff'    },
  answered:    { label: '답변완료', bg: '#e4e4e7', text: '#52525b' },
}

// ────── 타입 ──────
interface ClassAttendance {
  classId: string; className: string; subject: string
  present: number; late: number; absent: number; total: number
}
interface StaffNotice {
  id: string; title: string; is_pinned: boolean; created_at: string; class_id: string | null
}
interface QnaStats { open: number; in_progress: number; answered: number }
interface ClassOption { id: string; name: string }

function diffDays(t: string) {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const tgt = new Date(t);  tgt.setHours(0, 0, 0, 0)
  return Math.ceil((tgt.getTime() - now.getTime()) / 86400000)
}

// ────── 메인 컴포넌트 ──────
export default function HomeScreen() {
  const { user, isStaff, role } = useAuth()
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  // ── 학생 상태 ──
  const [targetDate, setTargetDate]         = useState(CSAT_DEFAULT)
  const [ddayTitle, setDdayTitle]           = useState('수능까지')
  const [editingDday, setEditingDday]       = useState(false)
  const [ddayInput, setDdayInput]           = useState(CSAT_DEFAULT)
  const [ddayTitleInput, setDdayTitleInput] = useState('수능까지')
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [assignments, setAssignments] = useState<{
    id: string; title: string; category: string | null; due_date: string | null; pct: number
  }[]>([])
  const [studentNotices, setStudentNotices] = useState<{
    id: string; title: string; is_pinned: boolean; created_at: string
  }[]>([])
  const [questions, setQuestions] = useState<{
    id: string; title: string; status: string
  }[]>([])

  // ── 스태프 상태 ──
  const [todayClasses, setTodayClasses]   = useState<ClassAttendance[]>([])
  const [staffNotices, setStaffNotices]   = useState<StaffNotice[]>([])
  const [qnaStats, setQnaStats]           = useState<QnaStats>({ open: 0, in_progress: 0, answered: 0 })
  const [allClasses, setAllClasses]       = useState<ClassOption[]>([])

  // 공지 작성 모달
  const [composeOpen, setComposeOpen]   = useState(false)
  const [nTitle, setNTitle]             = useState('')
  const [nContent, setNContent]         = useState('')
  const [nClassId, setNClassId]         = useState('')
  const [nPinned, setNPinned]           = useState(false)
  const [nSaving, setNSaving]           = useState(false)

  // D-day 로드 (학생만)
  useEffect(() => {
    if (isStaff) return
    AsyncStorage.getItem(LS_DDAY).then((v) => { if (v) { setTargetDate(v); setDdayInput(v) } })
    AsyncStorage.getItem(LS_DDAY_TITLE).then((v) => { if (v) { setDdayTitle(v); setDdayTitleInput(v) } })
  }, [isStaff])

  // 메인 데이터 로드
  useEffect(() => {
    if (!user) return
    run()
  }, [user, isStaff])

  async function run(refresh = false) {
    if (!refresh) setLoading(true)
    setError(null)
    try {
      if (isStaff) await loadStaff()
      else         await loadStudent()
    } catch (e) {
      setError(e instanceof Error ? e.message : '오류가 발생했습니다')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // ── 스태프 데이터 로드 ──
  async function loadStaff() {
    const [classRes, noticeRes, qnaRes] = await Promise.all([
      supabase
        .from('class_groups')
        .select('id, name, subject, day_of_week')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('notices')
        .select('id, title, is_pinned, created_at, class_id')
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3),
      supabase.from('qna_questions').select('status').limit(1000),
    ])

    const allRows = classRes.data ?? []
    setAllClasses(allRows.map((c) => ({ id: c.id as string, name: c.name as string })))

    // 오늘 수업 분반 필터 (day_of_week 배열에 TODAY_DOW 포함)
    let todayRows = allRows.filter((c) => {
      const dow = c.day_of_week as number[] | null
      return dow?.includes(TODAY_DOW)
    })

    // TA면 ta_class_access 기준 추가 필터링
    if (role === 'ta') {
      const { data: access } = await supabase
        .from('ta_class_access')
        .select('class_id, is_all_classes')
        .eq('ta_id', user!.id)
      const hasAll = (access ?? []).some((a) => a.is_all_classes)
      if (!hasAll) {
        const allowed = new Set(
          (access ?? []).map((a) => a.class_id as string).filter(Boolean),
        )
        todayRows = todayRows.filter((c) => allowed.has(c.id as string))
      }
    }

    if (todayRows.length > 0) {
      const ids = todayRows.map((c) => c.id as string)
      const [{ data: logs }, { data: members }] = await Promise.all([
        supabase.from('attendance_logs').select('class_id, status').in('class_id', ids).eq('session_date', TODAY),
        supabase.from('class_members').select('class_id').in('class_id', ids).eq('is_active', true),
      ])

      const statsMap: Record<string, ClassAttendance> = {}
      for (const c of todayRows) {
        statsMap[c.id as string] = {
          classId:   c.id as string,
          className: c.name as string,
          subject:   c.subject as string,
          present: 0, late: 0, absent: 0, total: 0,
        }
      }
      for (const m of members ?? []) statsMap[m.class_id as string].total++
      for (const l of logs ?? []) {
        const s = statsMap[l.class_id as string]
        if (!s) continue
        if (l.status === 'present')     s.present++
        else if (l.status === 'late')   s.late++
        else if (l.status === 'absent') s.absent++
      }
      setTodayClasses(Object.values(statsMap))
    } else {
      setTodayClasses([])
    }

    setStaffNotices(
      (noticeRes.data ?? []).map((n) => ({
        id:         n.id as string,
        title:      n.title as string,
        is_pinned:  n.is_pinned as boolean,
        created_at: n.created_at as string,
        class_id:   n.class_id as string | null,
      })),
    )

    const qAll = qnaRes.data ?? []
    setQnaStats({
      open:        qAll.filter((q) => q.status === 'open').length,
      in_progress: qAll.filter((q) => q.status === 'in_progress').length,
      answered:    qAll.filter((q) => q.status === 'answered').length,
    })
  }

  // ── 학생 데이터 로드 ──
  async function loadStudent() {
    const userId = user!.id
    const { data: memberships } = await supabase
      .from('class_members')
      .select('class_id')
      .eq('student_id', userId)
      .eq('is_active', true)
    const classIds = (memberships ?? []).map((m) => m.class_id as string)

    const [{ data: asgn }, { data: prog }, noticeRes, { data: qna }] = await Promise.all([
      classIds.length
        ? supabase.from('assignments').select('id, title, category, due_date')
            .in('class_id', classIds).gte('due_date', TODAY).order('due_date').limit(5)
        : { data: [] },
      classIds.length
        ? supabase.from('assignment_progress').select('assignment_id, completion_pct').eq('student_id', userId)
        : { data: [] },
      classIds.length
        ? supabase.from('notices').select('id, title, is_pinned, created_at')
            .or(`class_id.is.null,class_id.in.(${classIds.join(',')})`)
            .order('is_pinned', { ascending: false }).order('created_at', { ascending: false }).limit(3)
        : supabase.from('notices').select('id, title, is_pinned, created_at')
            .is('class_id', null).order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false }).limit(3),
      supabase.from('qna_questions').select('id, title, status')
        .eq('student_id', userId).order('created_at', { ascending: false }).limit(3),
    ])

    const progressMap: Record<string, number> = {}
    for (const p of prog ?? []) progressMap[p.assignment_id as string] = (p.completion_pct as number) ?? 0

    setAssignments((asgn ?? []).map((a) => ({
      id: a.id as string, title: a.title as string,
      category: a.category as string | null, due_date: a.due_date as string | null,
      pct: progressMap[a.id as string] ?? 0,
    })))
    setStudentNotices(noticeRes.data ?? [])
    setQuestions((qna ?? []).map((q) => ({ id: q.id as string, title: q.title as string, status: q.status as string })))
  }

  // ── 공지 저장 ──
  async function handleSaveNotice() {
    if (!nTitle.trim() || !nContent.trim()) return
    setNSaving(true)
    try {
      const { error } = await supabase.from('notices').insert({
        title:     nTitle.trim(),
        content:   nContent.trim(),
        class_id:  nClassId || null,
        is_pinned: nPinned,
        author_id: user!.id,
      })
      if (error) throw error
      setNTitle(''); setNContent(''); setNClassId(''); setNPinned(false)
      setComposeOpen(false)
      run(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장 실패')
    } finally {
      setNSaving(false)
    }
  }

  function saveDday() {
    setTargetDate(ddayInput); setDdayTitle(ddayTitleInput)
    AsyncStorage.setItem(LS_DDAY, ddayInput)
    AsyncStorage.setItem(LS_DDAY_TITLE, ddayTitleInput)
    setEditingDday(false)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator color="#09090b" />
      </SafeAreaView>
    )
  }

  // ══════════════════════ STAFF HOME ══════════════════════
  if (isStaff) {
    const todayStr = new Date().toLocaleDateString('ko-KR', {
      month: 'long', day: 'numeric', weekday: 'short',
    })
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); run(true) }}
              tintColor="#09090b"
            />
          }
        >
          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* A. 오늘 출결 현황 */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>오늘 출결 현황</Text>
              <Text style={styles.cardSub}>{todayStr}</Text>
            </View>

            {todayClasses.length === 0 ? (
              <Text style={styles.empty}>오늘 예정된 수업이 없습니다.</Text>
            ) : (
              todayClasses.map((c, i) => {
                const checked = c.present + c.late + c.absent
                const pct = c.total > 0 ? Math.round((checked / c.total) * 100) : 0
                return (
                  <View key={c.classId} style={[styles.attItem, i < todayClasses.length - 1 && styles.attBorder]}>
                    <View style={styles.attTop}>
                      <Text style={styles.attClass}>{c.className}</Text>
                      <Text style={styles.attSubject}>{c.subject}</Text>
                    </View>
                    <View style={styles.statsRow}>
                      <View style={styles.statChip}>
                        <Text style={styles.statN}>{c.present}</Text>
                        <Text style={styles.statL}>출석</Text>
                      </View>
                      <View style={[styles.statChip, styles.statLate]}>
                        <Text style={[styles.statN, styles.statNLate]}>{c.late}</Text>
                        <Text style={styles.statL}>지각</Text>
                      </View>
                      <View style={[styles.statChip, styles.statAbsent]}>
                        <Text style={[styles.statN, styles.statNAbsent]}>{c.absent}</Text>
                        <Text style={styles.statL}>결석</Text>
                      </View>
                      <View style={[styles.statChip, styles.statUnchecked]}>
                        <Text style={styles.statN}>{c.total - checked}</Text>
                        <Text style={styles.statL}>미체크</Text>
                      </View>
                    </View>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, { width: `${pct}%` as `${number}%` }]} />
                    </View>
                  </View>
                )
              })
            )}
          </View>

          {/* B. 공지사항 */}
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>공지사항</Text>
              <TouchableOpacity
                style={styles.smallBtn}
                onPress={() => setComposeOpen(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.smallBtnText}>+ 작성</Text>
              </TouchableOpacity>
            </View>
            {(() => {
              const classNameMap = Object.fromEntries(allClasses.map((c) => [c.id, c.name]))
              return staffNotices.length === 0 ? (
                <Text style={styles.empty}>등록된 공지가 없습니다.</Text>
              ) : (
                staffNotices.map((n, i) => {
                  const target = n.class_id ? (classNameMap[n.class_id] ?? '분반') : '전체'
                  return (
                    <View key={n.id} style={[styles.noticeItem, i < staffNotices.length - 1 && styles.noticeBorder]}>
                      {n.is_pinned && (
                        <View style={styles.pinBadge}>
                          <Text style={styles.pinBadgeText}>고정</Text>
                        </View>
                      )}
                      <Text style={styles.noticeTitle} numberOfLines={1}>{n.title}</Text>
                      <Text style={styles.noticeTarget}>{target}</Text>
                      <Text style={styles.noticeDate}>
                        {new Date(n.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  )
                })
              )
            })()}
          </View>

          {/* C. Q&A 현황 */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>질의응답 현황</Text>
            <View style={styles.qnaRow}>
              <View style={styles.qnaChip}>
                <Text style={styles.qnaNum}>{qnaStats.open}</Text>
                <Text style={styles.qnaLabel}>미답변</Text>
              </View>
              <View style={[styles.qnaChip, styles.qnaChipDark]}>
                <Text style={[styles.qnaNum, styles.qnaNumLight]}>{qnaStats.in_progress}</Text>
                <Text style={[styles.qnaLabel, styles.qnaLabelLight]}>답변중</Text>
              </View>
              <View style={styles.qnaChip}>
                <Text style={styles.qnaNum}>{qnaStats.answered}</Text>
                <Text style={styles.qnaLabel}>답변완료</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* 공지 작성 모달 */}
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
                <Text style={styles.modalTitle}>공지 작성</Text>
                <TouchableOpacity onPress={() => setComposeOpen(false)}>
                  <Text style={styles.modalClose}>취소</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                contentContainerStyle={styles.modalBody}
                keyboardShouldPersistTaps="handled"
              >
                {/* 제목 */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>제목</Text>
                  <TextInput
                    style={styles.formInput}
                    value={nTitle}
                    onChangeText={setNTitle}
                    placeholder="공지 제목을 입력하세요"
                    placeholderTextColor="#a1a1aa"
                  />
                </View>

                {/* 내용 */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>내용</Text>
                  <TextInput
                    style={styles.formTextArea}
                    value={nContent}
                    onChangeText={setNContent}
                    placeholder="공지 내용을 입력하세요"
                    placeholderTextColor="#a1a1aa"
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                  />
                </View>

                {/* 대상 */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>대상</Text>
                  <View style={styles.targetList}>
                    <TouchableOpacity
                      key="all"
                      style={[styles.targetItem, nClassId === '' && styles.targetItemActive]}
                      onPress={() => setNClassId('')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.targetText, nClassId === '' && styles.targetTextActive]}>
                        전체 공지
                      </Text>
                    </TouchableOpacity>
                    {allClasses.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.targetItem, nClassId === c.id && styles.targetItemActive]}
                        onPress={() => setNClassId(c.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={[styles.targetText, nClassId === c.id && styles.targetTextActive]}>
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* 고정 여부 */}
                <View style={styles.formGroup}>
                  <View style={styles.switchRow}>
                    <Text style={styles.formLabel}>상단 고정</Text>
                    <Switch
                      value={nPinned}
                      onValueChange={setNPinned}
                      trackColor={{ false: '#e4e4e7', true: '#09090b' }}
                      thumbColor="#ffffff"
                      ios_backgroundColor="#e4e4e7"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.saveBtn,
                    (!nTitle.trim() || !nContent.trim() || nSaving) && styles.saveBtnDisabled,
                  ]}
                  onPress={handleSaveNotice}
                  disabled={!nTitle.trim() || !nContent.trim() || nSaving}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveBtnText}>{nSaving ? '저장 중...' : '공지 등록'}</Text>
                </TouchableOpacity>
              </ScrollView>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    )
  }

  // ══════════════════════ STUDENT HOME ══════════════════════
  const diff = diffDays(targetDate)
  const ddayLabel = diff > 0 ? `D-${diff}` : diff === 0 ? 'D-DAY' : `D+${Math.abs(diff)}`

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
              {editingDday ? (
                <TextInput
                  style={styles.ddayTitleInput}
                  value={ddayTitleInput}
                  onChangeText={setDdayTitleInput}
                  placeholder="제목 입력"
                  placeholderTextColor="#71717a"
                  autoFocus
                />
              ) : (
                <Text style={styles.ddayLabel}>{ddayTitle}</Text>
              )}
              <Text style={styles.ddayCount}>{ddayLabel}</Text>
              <TouchableOpacity
                onPress={() => editingDday && setShowDatePicker(true)}
                disabled={!editingDday}
                activeOpacity={0.7}
              >
                <Text style={[styles.ddaySub, editingDday && styles.ddaySubHighlight]}>
                  {new Date(editingDday ? ddayInput : targetDate).toLocaleDateString('ko-KR', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.ddayEditBtn}
              onPress={() => { if (editingDday) saveDday(); else setEditingDday(true) }}
              activeOpacity={0.8}
            >
              <Text style={styles.ddayEditText}>{editingDday ? '저장' : '설정'}</Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={new Date(ddayInput)}
              mode="date"
              display="default"
              onChange={(_: any, d?: Date) => {
                setShowDatePicker(false)
                if (d) setDdayInput(d.toISOString().split('T')[0])
              }}
            />
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
              const catColor = categoryBadgeColor(a.category)
              return (
                <View key={a.id} style={styles.asgnItem}>
                  <View style={styles.asgnRow}>
                    <View style={[styles.catBadge, { backgroundColor: catColor.bg }]}>
                      <Text style={[styles.catBadgeText, { color: catColor.text }]}>{a.category ?? '기타'}</Text>
                    </View>
                    <Text style={[styles.asgnTitle, isOverdue && styles.overdueText]} numberOfLines={1}>
                      {a.title}
                    </Text>
                    <Text style={styles.pctText}>{a.pct}%</Text>
                  </View>
                  <View style={styles.progressBg}>
                    <View style={[styles.progressFill, {
                      width: `${a.pct}%` as `${number}%`,
                      backgroundColor: a.pct === 100 ? '#09090b' : isOverdue ? '#f87171' : '#52525b',
                    }]} />
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
          {studentNotices.length === 0 ? (
            <Text style={styles.empty}>공지사항이 없습니다.</Text>
          ) : (
            studentNotices.map((n, i) => (
              <View key={n.id} style={[styles.noticeItem, i < studentNotices.length - 1 && styles.noticeBorder]}>
                {n.is_pinned && (
                  <View style={styles.pinBadge}><Text style={styles.pinBadgeText}>고정</Text></View>
                )}
                <Text style={styles.noticeTitle} numberOfLines={1}>{n.title}</Text>
                <Text style={styles.noticeDate}>
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
                <View key={q.id} style={[styles.noticeItem, i < questions.length - 1 && styles.noticeBorder]}>
                  <Text style={styles.noticeTitle} numberOfLines={1}>{q.title}</Text>
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

// ────── StyleSheet ──────
const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  errorText: { fontSize: 12, color: '#ef4444', textAlign: 'center' },
  empty: { fontSize: 14, color: '#a1a1aa', textAlign: 'center', paddingVertical: 12 },

  card: { backgroundColor: '#f8f8fa', borderRadius: 24, padding: 20, gap: 12 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 12, fontWeight: '600', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 0.5 },
  cardSub:   { fontSize: 11, color: '#a1a1aa' },

  // 출결
  attItem:    { paddingVertical: 10, gap: 8 },
  attBorder:  { borderBottomWidth: 1, borderBottomColor: '#f1f1f4' },
  attTop:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attClass:   { fontSize: 15, fontWeight: '600', color: '#09090b' },
  attSubject: { fontSize: 12, color: '#a1a1aa' },
  statsRow:   { flexDirection: 'row', gap: 6 },
  statChip:   { flex: 1, backgroundColor: '#ffffff', borderRadius: 10, paddingVertical: 8, alignItems: 'center', gap: 2 },
  statLate:   { backgroundColor: '#fef3c7' },
  statAbsent: { backgroundColor: '#fee2e2' },
  statUnchecked: { backgroundColor: '#f4f4f5' },
  statN:        { fontSize: 16, fontWeight: '700', color: '#09090b' },
  statNLate:    { color: '#d97706' },
  statNAbsent:  { color: '#dc2626' },
  statL:        { fontSize: 10, color: '#a1a1aa' },

  progressBg:   { height: 3, borderRadius: 99, backgroundColor: '#e4e4e7', overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 99, backgroundColor: '#09090b' },

  // 공지
  noticeItem:  { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 8 },
  noticeBorder:{ borderBottomWidth: 1, borderBottomColor: '#f1f1f4' },
  noticeTitle:  { flex: 1, fontSize: 14, fontWeight: '500', color: '#09090b' },
  noticeTarget: { fontSize: 10, color: '#a1a1aa', backgroundColor: '#f4f4f5', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  noticeDate:   { fontSize: 11, color: '#a1a1aa' },
  pinBadge:    { backgroundColor: '#09090b', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  pinBadgeText:{ fontSize: 9, color: '#fff', fontWeight: '600' },

  // 소버튼
  smallBtn:     { backgroundColor: '#09090b', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  smallBtnText: { fontSize: 11, fontWeight: '600', color: '#ffffff' },

  // QnA
  qnaRow:      { flexDirection: 'row', gap: 8 },
  qnaChip:     { flex: 1, backgroundColor: '#ffffff', borderRadius: 16, paddingVertical: 14, alignItems: 'center', gap: 4 },
  qnaChipDark: { backgroundColor: '#09090b' },
  qnaNum:      { fontSize: 22, fontWeight: '700', color: '#09090b' },
  qnaNumLight: { color: '#ffffff' },
  qnaLabel:    { fontSize: 10, color: '#a1a1aa' },
  qnaLabelLight:{ color: 'rgba(255,255,255,0.6)' },

  // 모달
  modalSafe: { flex: 1, backgroundColor: '#ffffff' },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f4f4f5',
  },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#09090b' },
  modalClose: { fontSize: 14, color: '#a1a1aa' },
  modalBody:  { padding: 20, gap: 20 },
  formGroup:  { gap: 8 },
  formLabel:  { fontSize: 12, fontWeight: '600', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput:  {
    height: 48, borderWidth: 1.5, borderColor: '#e4e4e7', borderRadius: 14,
    paddingHorizontal: 16, fontSize: 14, color: '#09090b', backgroundColor: '#fafafa',
  },
  formTextArea: {
    minHeight: 110, borderWidth: 1.5, borderColor: '#e4e4e7', borderRadius: 14,
    padding: 14, fontSize: 14, color: '#09090b', backgroundColor: '#fafafa',
  },
  targetList:      { gap: 6 },
  targetItem:      { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, backgroundColor: '#f8f8fa', borderWidth: 1.5, borderColor: 'transparent' },
  targetItemActive:{ borderColor: '#09090b', backgroundColor: '#ffffff' },
  targetText:      { fontSize: 14, fontWeight: '500', color: '#52525b' },
  targetTextActive:{ color: '#09090b' },
  switchRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveBtn:         { backgroundColor: '#09090b', borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  saveBtnDisabled: { backgroundColor: '#d4d4d8' },
  saveBtnText:     { fontSize: 15, fontWeight: '600', color: '#ffffff' },

  // D-day (학생)
  ddayCard:       { backgroundColor: '#09090b', gap: 12 },
  ddayRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  ddayLabel:      { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  ddayTitleInput: { fontSize: 12, color: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.4)', paddingBottom: 2, minWidth: 100 },
  ddayCount:      { fontSize: 44, fontWeight: '600', color: '#ffffff', letterSpacing: -1, marginTop: 2 },
  ddaySub:        { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  ddaySubHighlight:{ color: '#ffffff', textDecorationLine: 'underline' },
  ddayEditBtn:    { borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  ddayEditText:   { fontSize: 12, color: 'rgba(255,255,255,0.6)' },

  // 과제 (학생)
  asgnItem:    { gap: 8 },
  asgnRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge:    { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  catBadgeText:{ fontSize: 10, fontWeight: '600' },
  asgnTitle:   { flex: 1, fontSize: 14, fontWeight: '500', color: '#09090b' },
  overdueText: { color: '#dc2626' },
  pctText:     { fontSize: 13, fontWeight: '600', color: '#3f3f46' },
  dueDateText: { fontSize: 11, color: '#a1a1aa' },
  overdueDue:  { color: '#f87171' },

  // 상태 뱃지 (학생 QnA)
  statusBadge:     { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3 },
  statusBadgeText: { fontSize: 10, fontWeight: '600' },
})
