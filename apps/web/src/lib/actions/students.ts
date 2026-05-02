'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type ActionResult = { error?: string }

export type StudentBulkRow = {
  name: string
  phone: string
  password: string
  className: string
}

export type BulkResult = {
  succeeded: number
  failed: Array<{ name: string; phone: string; reason: string }>
}

// 전화번호 → Supabase Auth 이메일 포맷
function toAuthEmail(phone: string) {
  return `${phone.replace(/\D/g, '')}@teamdj.com`
}

// ── 학생 개별 등록
export async function createStudent(formData: FormData): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return { error: '인증이 필요합니다.' }

  const name     = (formData.get('name')     as string).trim()
  const phone    = (formData.get('phone')    as string).trim()
  const password = formData.get('password') as string
  const classId  = formData.get('classId')  as string | null

  if (!name || !phone || !password) return { error: '필수 항목을 입력해주세요.' }

  const email = toAuthEmail(phone)

  // 1. Supabase Auth 계정 생성
  const { data: authData, error: authErr } = await adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,         // 이메일 확인 생략
    user_metadata: { name, role: 'student' },
  })

  if (authErr) {
    if (authErr.message.includes('already been registered')) {
      return { error: '이미 등록된 전화번호입니다.' }
    }
    return { error: `계정 생성 실패: ${authErr.message}` }
  }

  const userId = authData.user.id

  // 2. public.users insert (RLS bypass — admin client 사용)
  const { error: userErr } = await adminSupabase.from('users').insert({
    id:   userId,
    phone,
    name,
    role: 'student',
    password_hash: 'managed_by_supabase_auth',
  })

  if (userErr) {
    // 롤백: auth 유저 삭제
    await adminSupabase.auth.admin.deleteUser(userId)
    return { error: '학생 정보 저장에 실패했습니다.' }
  }

  // 3. class_members insert
  if (classId) {
    const { error: memberErr } = await adminSupabase.from('class_members').insert({
      class_id:   classId,
      student_id: userId,
    })
    if (memberErr) {
      // 반 배정 실패는 치명적이지 않으므로 경고만 (계정은 이미 생성됨)
      console.error('class_members insert error:', memberErr)
    }
  }

  revalidatePath('/admin/students')
  return {}
}

// ── 학생 일괄 등록 (엑셀)
export async function bulkCreateStudents(
  rows: StudentBulkRow[],
): Promise<BulkResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return { succeeded: 0, failed: rows.map((r) => ({ name: r.name, phone: r.phone, reason: '인증 필요' })) }

  // 분반 이름 → ID 매핑 (한 번만 조회)
  const classNames = [...new Set(rows.map((r) => r.className).filter(Boolean))]
  const { data: classes } = await adminSupabase
    .from('class_groups')
    .select('id, name')
    .in('name', classNames)

  const classMap = new Map<string, string>(
    (classes ?? []).map((c) => [c.name, c.id]),
  )

  let succeeded = 0
  const failed: BulkResult['failed'] = []

  for (const row of rows) {
    const email = toAuthEmail(row.phone)

    try {
      const { data: authData, error: authErr } =
        await adminSupabase.auth.admin.createUser({
          email,
          password: row.password,
          email_confirm: true,
          user_metadata: { name: row.name, role: 'student' },
        })

      if (authErr) {
        failed.push({ name: row.name, phone: row.phone, reason: authErr.message })
        continue
      }

      const userId = authData.user.id

      const { error: userErr } = await adminSupabase.from('users').insert({
        id:   userId,
        phone: row.phone,
        name: row.name,
        role: 'student',
        password_hash: 'managed_by_supabase_auth',
      })

      if (userErr) {
        await adminSupabase.auth.admin.deleteUser(userId)
        failed.push({ name: row.name, phone: row.phone, reason: '정보 저장 실패' })
        continue
      }

      const classId = classMap.get(row.className)
      if (classId) {
        await adminSupabase.from('class_members').insert({
          class_id:   classId,
          student_id: userId,
        })
      }

      succeeded++
    } catch {
      failed.push({ name: row.name, phone: row.phone, reason: '알 수 없는 오류' })
    }
  }

  revalidatePath('/admin/students')
  return { succeeded, failed }
}

// ── 학생 정보 수정
export async function updateStudent(formData: FormData): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return { error: '인증이 필요합니다.' }

  const studentId = formData.get('studentId') as string
  const name      = (formData.get('name')  as string).trim()
  const phone     = (formData.get('phone') as string).trim()

  if (!studentId || !name || !phone) return { error: '필수 항목을 입력해주세요.' }

  const { error } = await adminSupabase
    .from('users')
    .update({ name, phone })
    .eq('id', studentId)

  if (error) return { error: '학생 정보 수정에 실패했습니다.' }

  revalidatePath('/admin/students')
  revalidatePath(`/admin/students/${studentId}`)
  return {}
}

// ── 분반 변경 (기존 비활성화 → 새 반 추가)
export async function changeStudentClass(
  studentId: string,
  oldClassId: string | null,
  newClassId: string,
): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return { error: '인증이 필요합니다.' }

  // 기존 반 비활성화
  if (oldClassId) {
    await adminSupabase
      .from('class_members')
      .update({ is_active: false })
      .eq('student_id', studentId)
      .eq('class_id', oldClassId)
  }

  // 새 반 추가 (이미 있으면 재활성화)
  const { data: existing } = await adminSupabase
    .from('class_members')
    .select('id')
    .eq('student_id', studentId)
    .eq('class_id', newClassId)
    .single()

  if (existing) {
    await adminSupabase
      .from('class_members')
      .update({ is_active: true })
      .eq('id', existing.id)
  } else {
    await adminSupabase.from('class_members').insert({
      class_id:   newClassId,
      student_id: studentId,
    })
  }

  revalidatePath(`/admin/students/${studentId}`)
  return {}
}

// ── 학부모 연결
export async function linkParent(formData: FormData): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return { error: '인증이 필요합니다.' }

  const studentId   = formData.get('studentId')   as string
  const parentPhone = (formData.get('parentPhone') as string).trim()

  if (!studentId || !parentPhone) return { error: '필수 항목을 입력해주세요.' }

  // 전화번호로 학부모 유저 조회
  const { data: parent } = await adminSupabase
    .from('users')
    .select('id')
    .eq('phone', parentPhone)
    .eq('role', 'parent')
    .single()

  if (!parent) return { error: '등록된 학부모 계정을 찾을 수 없습니다.' }

  const { error } = await adminSupabase.from('parent_links').insert({
    parent_id:  parent.id,
    student_id: studentId,
  })

  if (error) {
    if (error.code === '23505') return { error: '이미 연결된 학부모입니다.' }
    return { error: '학부모 연결에 실패했습니다.' }
  }

  revalidatePath(`/admin/students/${studentId}`)
  return {}
}

// ── 학부모 연결 해제
export async function unlinkParent(
  linkId: string,
  studentId: string,
): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()

  const { data: { user: caller } } = await supabase.auth.getUser()
  if (!caller) return { error: '인증이 필요합니다.' }

  const { error } = await adminSupabase
    .from('parent_links')
    .delete()
    .eq('id', linkId)

  if (error) return { error: '연결 해제에 실패했습니다.' }

  revalidatePath(`/admin/students/${studentId}`)
  return {}
}
