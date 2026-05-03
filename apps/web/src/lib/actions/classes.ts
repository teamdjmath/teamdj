'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type ActionResult = { error?: string }

// ── 분반 생성
export async function createClass(formData: FormData): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { error: '권한이 없습니다.' }

  const name     = (formData.get('name')     as string).trim()
  const subject  = (formData.get('subject')  as string).trim()
  const grade    = (formData.get('grade')    as string).trim()
  const schedule = (formData.get('schedule') as string | null)?.trim() ?? null

  if (!name || !subject || !grade) return { error: '필수 항목을 입력해주세요.' }

  const { error } = await adminSupabase.from('class_groups').insert({
    name,
    subject,
    grade,
    schedule,
    teacher_id: user.id,
  })

  if (error) return { error: `분반 생성에 실패했습니다: ${error.message}` }

  revalidatePath('/admin/classes')
  return {}
}

// ── 분반 수정
export async function updateClass(formData: FormData): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const classId  = formData.get('classId')  as string
  const name     = (formData.get('name')     as string).trim()
  const subject  = (formData.get('subject')  as string).trim()
  const grade    = (formData.get('grade')    as string).trim()
  const schedule = (formData.get('schedule') as string | null)?.trim() ?? null
  const isActive = formData.get('is_active') === 'true'

  if (!classId || !name || !subject || !grade) return { error: '필수 항목을 입력해주세요.' }

  const { error } = await adminSupabase
    .from('class_groups')
    .update({ name, subject, grade, schedule, is_active: isActive })
    .eq('id', classId)

  if (error) return { error: `분반 수정에 실패했습니다: ${error.message}` }

  revalidatePath('/admin/classes')
  revalidatePath(`/admin/classes/${classId}`)
  return {}
}

// ── 분반 삭제 (soft delete)
export async function deleteClass(classId: string): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher') return { error: '선생님만 분반을 삭제할 수 있습니다.' }

  const { error } = await adminSupabase
    .from('class_groups')
    .update({ is_active: false })
    .eq('id', classId)

  if (error) return { error: `분반 삭제에 실패했습니다: ${error.message}` }

  revalidatePath('/admin/classes')
  return {}
}

// ── 분반에서 학생 제거
export async function removeStudentFromClass(
  classId: string,
  studentId: string,
): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const { error } = await adminSupabase
    .from('class_members')
    .update({ is_active: false })
    .eq('class_id', classId)
    .eq('student_id', studentId)

  if (error) return { error: `학생 제거에 실패했습니다: ${error.message}` }

  revalidatePath(`/admin/classes/${classId}`)
  return {}
}
