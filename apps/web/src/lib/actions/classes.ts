'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type ActionResult = { success: true } | { success: false; error: string }

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토']

function buildScheduleText(days: number[], startTime: string, endTime: string): string | null {
  if (!days.length || !startTime || !endTime) return null
  const dayStr = [...days].sort((a, b) => a - b).map((d) => DAY_NAMES[d]).join('')
  return `${dayStr} ${startTime.slice(0, 5)}~${endTime.slice(0, 5)}`
}

function parseScheduleFields(formData: FormData) {
  const day_of_week = formData.getAll('day_of_week').map(Number).filter((n) => !isNaN(n))
  const start_time  = (formData.get('start_time') as string | null)?.trim() || null
  const end_time    = (formData.get('end_time')   as string | null)?.trim() || null
  const schedule    = (start_time && end_time && day_of_week.length)
    ? buildScheduleText(day_of_week, start_time, end_time)
    : null
  return { day_of_week: day_of_week.length ? day_of_week : null, start_time, end_time, schedule }
}

// ── 분반 생성
export async function createClass(formData: FormData): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { success: false, error: '권한이 없습니다.' }

  const name    = (formData.get('name')    as string).trim()
  const subject = (formData.get('subject') as string).trim()
  const grade   = (formData.get('grade')   as string).trim()

  if (!name || !subject || !grade) return { success: false, error: '필수 항목을 입력해주세요.' }

  const { day_of_week, start_time, end_time, schedule } = parseScheduleFields(formData)

  const { error } = await adminSupabase.from('class_groups').insert({
    name,
    subject,
    grade,
    schedule,
    day_of_week,
    start_time,
    end_time,
    teacher_id: user.id,
  })

  if (error) return { success: false, error: `분반 생성 실패: ${error.message}` }

  revalidatePath('/admin/classes')
  revalidatePath('/admin/schedule')
  return { success: true }
}

// ── 분반 수정
export async function updateClass(formData: FormData): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const classId  = formData.get('classId')  as string
  const name     = (formData.get('name')    as string).trim()
  const subject  = (formData.get('subject') as string).trim()
  const grade    = (formData.get('grade')   as string).trim()
  const isActive = formData.get('is_active') === 'true'

  if (!classId || !name || !subject || !grade) return { success: false, error: '필수 항목을 입력해주세요.' }

  const { day_of_week, start_time, end_time, schedule } = parseScheduleFields(formData)

  const { error } = await adminSupabase
    .from('class_groups')
    .update({ name, subject, grade, schedule, day_of_week, start_time, end_time, is_active: isActive })
    .eq('id', classId)

  if (error) return { success: false, error: `분반 수정 실패: ${error.message}` }

  revalidatePath('/admin/classes')
  revalidatePath(`/admin/classes/${classId}`)
  revalidatePath('/admin/schedule')
  return { success: true }
}

// ── 분반 비활성화 (soft delete)
export async function deleteClass(classId: string): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher') return { success: false, error: '선생님만 분반을 삭제할 수 있습니다.' }

  const { error } = await adminSupabase
    .from('class_groups')
    .update({ is_active: false })
    .eq('id', classId)

  if (error) return { success: false, error: `분반 비활성화 실패: ${error.message}` }

  revalidatePath('/admin/classes')
  return { success: true }
}

// ── 분반 완전 삭제 (hard delete — class_members 없는 경우만 허용)
export async function hardDeleteClass(classId: string): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher') return { success: false, error: '선생님만 분반을 삭제할 수 있습니다.' }

  const { count } = await adminSupabase
    .from('class_members')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)

  if ((count ?? 0) > 0) {
    return { success: false, error: '학생이 있는 분반은 완전 삭제할 수 없습니다. 학생을 모두 제거한 후 다시 시도해주세요.' }
  }

  const { error } = await adminSupabase
    .from('class_groups')
    .delete()
    .eq('id', classId)

  if (error) return { success: false, error: `분반 삭제 실패: ${error.message}` }

  revalidatePath('/admin/classes')
  return { success: true }
}

// ── 분반에서 학생 제거
export async function removeStudentFromClass(
  classId: string,
  studentId: string,
): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: '인증이 필요합니다.' }

  const { error } = await adminSupabase
    .from('class_members')
    .update({ is_active: false })
    .eq('class_id', classId)
    .eq('student_id', studentId)

  if (error) return { success: false, error: `학생 제거 실패: ${error.message}` }

  revalidatePath(`/admin/classes/${classId}`)
  return { success: true }
}
