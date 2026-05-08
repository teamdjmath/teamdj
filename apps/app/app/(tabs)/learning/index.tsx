import { useEffect, useState } from 'react'
import { useRouter } from 'expo-router'
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
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

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

interface Course {
  courseName: string
  lectures: Lecture[]
}

interface Todo {
  id: string
  content: string
  is_completed: boolean
}

export default function LearningScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    async function load() {
      try {
        const userId = user!.id

        const { data: memberships } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('student_id', userId)
          .eq('is_active', true)

        const classIds = (memberships ?? []).map((m) => m.class_id as string)

        let courseNames: string[] = []
        if (classIds.length > 0) {
          const { data: accessRows } = await supabase
            .from('lecture_class_access')
            .select('course_name')
            .or(`class_id.in.(${classIds.join(',')}),class_id.is.null`)
          courseNames = [...new Set((accessRows ?? []).map((r) => r.course_name as string))].sort()
        } else {
          const { data: accessRows } = await supabase
            .from('lecture_class_access')
            .select('course_name')
            .is('class_id', null)
          courseNames = [...new Set((accessRows ?? []).map((r) => r.course_name as string))].sort()
        }

        const [lecRes, asgnRes, todoRes] = await Promise.all([
          courseNames.length
            ? supabase
                .from('lectures')
                .select('id, title, youtube_video_id, order_num, course_name')
                .in('course_name', courseNames)
                .order('course_name')
                .order('order_num', { ascending: true })
            : { data: [] },
          classIds.length
            ? supabase
                .from('assignments')
                .select('id, title, category, due_date, week_num')
                .in('class_id', classIds)
                .order('week_num', { ascending: false })
                .order('due_date')
            : { data: [] },
          supabase
            .from('student_todos')
            .select('*')
            .eq('student_id', userId)
            .order('created_at', { ascending: false }),
        ])

        const courseMap: Record<string, Lecture[]> = {}
        for (const row of lecRes.data ?? []) {
          const cn = (row.course_name as string) || '기타 강좌'
          if (!courseMap[cn]) courseMap[cn] = []
          courseMap[cn].push({
            id: row.id as string,
            title: row.title as string,
            youtubeVideoId: row.youtube_video_id as string,
            orderNum: row.order_num as number,
          })
        }
        setCourses(courseNames.map((cn) => ({ courseName: cn, lectures: courseMap[cn] ?? [] })))

        const asgnIds = (asgnRes.data ?? []).map((a) => a.id as string)
        const { data: prog } = asgnIds.length
          ? await supabase
              .from('assignment_progress')
              .select('assignment_id, completion_pct')
              .eq('student_id', userId)
              .in('assignment_id', asgnIds)
          : { data: [] }

        const progressMap: Record<string, number> = {}
        for (const p of prog ?? []) {
          progressMap[p.assignment_id as string] = (p.completion_pct as number) ?? 0
        }

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
        setTodos(todoRes.data ?? [])
      } catch (e) {
        setError(e instanceof Error ? e.message : '오류가 발생했습니다')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user])

  const weekGroups: Record<number, Assignment[]> = {}
  for (const a of assignments) {
    const wk = a.week_num ?? 0
    if (!weekGroups[wk]) weekGroups[wk] = []
    weekGroups[wk].push(a)
  }
  const sortedWeeks = Object.keys(weekGroups).map(Number).sort((a, b) => b - a)

  const handleAddTodo = async () => {
    if (!newTodo.trim() || !user) return
    try {
      const { data, error } = await supabase
        .from('student_todos')
        .insert({ student_id: user.id, content: newTodo.trim() })
        .select()
        .single()
      if (error) throw error
      setTodos([data, ...todos])
      setNewTodo('')
    } catch {
      alert('할 일을 추가하지 못했습니다.')
    }
  }

  const handleToggleTodo = async (id: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('student_todos')
        .update({ is_completed: !completed })
        .eq('id', id)
      if (error) throw error
      setTodos(todos.map((t) => (t.id === id ? { ...t, is_completed: !completed } : t)))
    } catch {
      alert('상태를 변경하지 못했습니다.')
    }
  }

  const handleDeleteTodo = async (id: string) => {
    try {
      const { error } = await supabase.from('student_todos').delete().eq('id', id)
      if (error) throw error
      setTodos(todos.filter((t) => t.id !== id))
    } catch {
      alert('삭제하지 못했습니다.')
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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* 강의 영상 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>강의 영상</Text>
          {courses.length === 0 ? (
            <Text style={styles.empty}>수강 가능한 강좌가 없습니다.</Text>
          ) : (
            <View style={styles.courseList}>
              {courses.map((course) => (
                <TouchableOpacity
                  key={course.courseName}
                  style={styles.courseItemLink}
                  onPress={() => {
                    router.push({
                      pathname: '/(tabs)/learning/[courseName]',
                      params: { courseName: course.courseName },
                    } as any)
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.courseInfo}>
                    <Text style={styles.courseName}>{course.courseName}</Text>
                    <Text style={styles.lecCountBadge}>{course.lectures.length}강</Text>
                  </View>
                  <Text style={styles.chevron}>→</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 나의 할 일 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>나의 할 일</Text>
          <View style={styles.todoInputRow}>
            <TextInput
              style={styles.todoInput}
              value={newTodo}
              onChangeText={setNewTodo}
              placeholder="오늘 할 일을 계획해보세요"
              placeholderTextColor="#a1a1aa"
            />
            <TouchableOpacity
              style={[styles.todoAddBtn, !newTodo.trim() && styles.todoAddBtnDisabled]}
              onPress={handleAddTodo}
              disabled={!newTodo.trim()}
            >
              <Text style={styles.todoAddBtnText}>추가</Text>
            </TouchableOpacity>
          </View>
          {todos.length === 0 ? (
            <Text style={styles.empty}>아직 계획된 할 일이 없습니다.</Text>
          ) : (
            <View style={styles.todoList}>
              {todos.map((t) => (
                <View key={t.id} style={styles.todoItem}>
                  <TouchableOpacity
                    style={styles.todoLeft}
                    onPress={() => handleToggleTodo(t.id, t.is_completed)}
                  >
                    <View style={[styles.todoCheck, t.is_completed && styles.todoCheckActive]}>
                      {t.is_completed && <Text style={styles.todoCheckIcon}>✓</Text>}
                    </View>
                    <Text style={[styles.todoText, t.is_completed && styles.todoTextDone]}>
                      {t.content}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDeleteTodo(t.id)}>
                    <Text style={styles.todoDelete}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 과제 목록 */}
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
                      ? (CAT_COLORS[a.category] ?? { bg: '#e4e4e7', text: '#71717a' })
                      : { bg: '#e4e4e7', text: '#71717a' }
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
                                  a.pct === 100 ? '#09090b' : isOverdue ? '#f87171' : '#71717a',
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
  safe: { flex: 1, backgroundColor: '#ffffff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 40 },

  card: { backgroundColor: '#f8f8fa', borderRadius: 24, padding: 20, gap: 16, marginBottom: 4 },
  cardTitle: {
    fontSize: 12, fontWeight: '600', color: '#a1a1aa',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  empty: { fontSize: 14, color: '#a1a1aa', textAlign: 'center', paddingVertical: 12 },
  errorText: { fontSize: 12, color: '#ef4444', textAlign: 'center' },

  courseList: { gap: 12 },
  courseItemLink: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ffffff', borderRadius: 18, padding: 16,
  },
  courseInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  courseName: { fontSize: 15, fontWeight: '600', color: '#09090b' },
  lecCountBadge: { fontSize: 11, color: '#a1a1aa', fontWeight: '500' },
  chevron: { fontSize: 16, color: '#d1d1d6' },

  todoInputRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  todoInput: {
    flex: 1, height: 48, backgroundColor: '#ffffff', borderRadius: 14,
    paddingHorizontal: 16, fontSize: 14, color: '#09090b',
  },
  todoAddBtn: {
    backgroundColor: '#09090b', borderRadius: 14, paddingHorizontal: 16,
    justifyContent: 'center',
  },
  todoAddBtnDisabled: { backgroundColor: '#e4e4e7' },
  todoAddBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  todoList: { gap: 12 },
  todoItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todoLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  todoCheck: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#e4e4e7',
    justifyContent: 'center', alignItems: 'center',
  },
  todoCheckActive: { backgroundColor: '#09090b', borderColor: '#09090b' },
  todoCheckIcon: { fontSize: 12, color: '#fff', fontWeight: 'bold' },
  todoText: { fontSize: 15, fontWeight: '500', color: '#09090b' },
  todoTextDone: { color: '#d1d1d6', textDecorationLine: 'line-through' },
  todoDelete: { fontSize: 16, color: '#d1d1d6', padding: 4 },

  weekGroup: { gap: 10 },
  weekLabel: {
    fontSize: 11, fontWeight: '700', color: '#d1d1d6',
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  asgnList: { gap: 12 },
  asgnItem: { gap: 6 },
  asgnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  catBadge: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  catText: { fontSize: 10, fontWeight: '600' },
  asgnTitle: { flex: 1, fontSize: 14, fontWeight: '500', color: '#09090b' },
  overdueText: { color: '#dc2626' },
  pct: { fontSize: 13, fontWeight: '600', color: '#3f3f46' },
  progressBg: { height: 4, borderRadius: 99, backgroundColor: '#e4e4e7', overflow: 'hidden' },
  progressFill: { height: 4, borderRadius: 99 },
  dueDate: { fontSize: 11, color: '#a1a1aa' },
  overdueDue: { color: '#f87171' },
})
