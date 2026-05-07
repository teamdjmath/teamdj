import type { Database, Json } from './supabase'

/** 테이블 Row 타입 단축 헬퍼 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

// 자주 쓰는 Row 타입 별칭
export type ClassGroupRow  = Tables<'class_groups'>
export type ClassMemberRow = Tables<'class_members'>
export type UserRow        = Tables<'users'>
export type ExamResultRow  = Tables<'exam_results'>
export type ReportRow      = Tables<'reports'>
export type PushMessageRow = Tables<'push_messages'>
export type ParentLinkRow  = Tables<'parent_links'>

// ─── JSON 컬럼 전용 인터페이스 ──────────────────────────────────────────────

/** reports.content_json 컬럼 구조 */
export interface ReportContent {
  studyContent:     string
  homework:         string
  announcement:     string
  notes:            string
  todayAttendance:  'present' | 'late' | 'absent' | null
  recentScore: {
    score:        number
    title:        string
    examType:     string
    date:         string
    totalQ?:      number
    objQ?:        number
    subjQ?:       number
    difficulty?:  string
    classAverage?: number
  } | null
  avgAssignmentPct:     number
  absenceReason?:       string
  lastAssignmentTitle?: string
}

/** exam_results.grade_cuts 컬럼 구조  예: { "A": 90, "B": 80 } */
export interface GradeCuts {
  [grade: string]: number
}

/** test_scores 쿼리에서 tests!test_id 조인 결과 형태 */
export interface TestScoreJoin {
  title:      string
  exam_type:  string
  test_date:  string
  total_q:    number | null
  obj_q:      number | null
  subj_q:     number | null
  difficulty: string | null
}

// ─── JSON 컬럼 경계 캐스트 헬퍼 ─────────────────────────────────────────────

/**
 * 앱 인터페이스(T) → Supabase Json 타입 변환
 * DB insert/upsert 시 content_json, grade_cuts 등 Json 컬럼에 사용
 */
export function asJson<T>(value: T): Json {
  return value as unknown as Json
}

/**
 * Supabase Json 타입 → 앱 인터페이스(T) 변환
 * DB select 결과에서 content_json, grade_cuts 등을 실제 타입으로 꺼낼 때 사용
 */
export function fromJson<T>(value: unknown): T {
  return value as unknown as T
}
