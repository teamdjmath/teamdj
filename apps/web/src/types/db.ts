import type { Database } from './supabase'

/** 테이블 Row 타입 단축 헬퍼 */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

// 자주 쓰는 Row 타입 별칭
export type ClassGroupRow    = Tables<'class_groups'>
export type ClassMemberRow   = Tables<'class_members'>
export type UserRow          = Tables<'users'>
export type ExamResultRow    = Tables<'exam_results'>
export type ReportRow        = Tables<'reports'>
export type PushMessageRow   = Tables<'push_messages'>
export type ParentLinkRow    = Tables<'parent_links'>

/**
 * exam_results.grade_cuts 컬럼 인터페이스
 * 예: { "A": 90, "B": 80, "C": 70 }
 */
export interface GradeCuts {
  [grade: string]: number
}
