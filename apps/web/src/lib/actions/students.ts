'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'
import { logger } from '@/lib/logger'
import { logAudit } from '@/lib/audit'

export type StudentBulkRow = {
  name: string
  phone: string
  password?: string  // 무시됨 — 환경변수 사용
  className: string
  school: string
  grade: string
  parentPhone?: string
}

export type BulkResult = {
  succeeded: number
  failed: Array<{ name: string; phone: string; reason: string }>
}

function toAuthEmail(phone: string) {
  return `${phone.replace(/\D/g, '')}@teamdj.com`
}

function getInitialPassword() {
  return process.env.INITIAL_STUDENT_PASSWORD ?? 'teamdj1234'
}

export async function createStudent(formData: FormData): Promise<ActionResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('createStudent', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }

    const role = caller.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const name        = (formData.get('name')     as string).trim()
    const phone       = (formData.get('phone')    as string).trim()
    const classIds    = formData.getAll('classId').map(String).filter(Boolean)
    const school      = (formData.get('school')   as string || '').trim()
    const grade       = (formData.get('grade')    as string || '').trim()
    const parentPhone = (formData.get('parentPhone') as string || '').trim()

    if (!name || !phone) return { success: false, error: '필수 항목을 입력해주세요.' }

    const password = getInitialPassword()
    const email = toAuthEmail(phone)

    const { data: authData, error: authErr } = await adminSupabase.auth.admin.createUser({
      email, password, email_confirm: true,
      user_metadata: { name, role: 'student', phone, school, grade, must_change_password: true },
    })

    if (authErr) {
      if (
        authErr.message.includes('already been registered') ||
        authErr.message.includes('already exists') ||
        authErr.message.includes('duplicate')
      ) {
        return { success: false, error: '이미 등록된 전화번호입니다.' }
      }
      throw authErr
    }

    if (!authData?.user?.id) return { success: false, error: '계정 생성 실패: 사용자 정보를 받지 못했습니다.' }

    const userId = authData.user.id

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: userErr } = await adminSupabase.from('users').upsert(
      { id: userId, phone, name, role: 'student', school, grade, must_change_password: true } as any,
      { onConflict: 'id' },
    )

    if (userErr) {
      const { error: delErr } = await adminSupabase.auth.admin.deleteUser(userId)
      if (delErr) logger.error('createStudent:rollback-failed', { action: 'createStudent', userId: caller.id, error: delErr })
      throw userErr
    }

    for (const classId of classIds) {
      const { error: memberErr } = await adminSupabase.from('class_members').insert({ class_id: classId, student_id: userId })
      if (memberErr) logger.warn('createStudent:class-member-failed', { action: 'createStudent', userId: caller.id, error: memberErr })
    }

    if (parentPhone) {
      const { data: parent } = await adminSupabase
        .from('users').select('id').eq('phone', parentPhone).eq('role', 'parent').maybeSingle()
      if (parent) {
        await adminSupabase.from('parent_links').insert({ parent_id: parent.id, student_id: userId })
      }
    }

    await logAudit(caller, {
      action: 'student.create', targetType: 'student',
      targetId: userId, targetLabel: name,
    })

    revalidatePath('/admin/students')
    return { success: true }
  })
}

// bulkCreateStudents는 복잡한 BulkResult 타입이라 withAction 외부 처리
export async function bulkCreateStudents(rows: StudentBulkRow[]): Promise<BulkResult> {
  const supabase      = await createClient()
  const adminSupabase = createAdminClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  if (!caller) {
    return { succeeded: 0, failed: rows.map((r) => ({ name: r.name, phone: r.phone, reason: '인증 필요' })) }
  }

  const password = getInitialPassword()

  const classNames = [...new Set(rows.map((r) => r.className).filter(Boolean))]
  const { data: classes } = await adminSupabase.from('class_groups').select('id, name').in('name', classNames)
  const classMap = new Map<string, string>((classes ?? []).map((c) => [c.name, c.id]))

  let succeeded = 0
  const failed: BulkResult['failed'] = []

  for (const row of rows) {
    const email = toAuthEmail(row.phone)
    try {
      const { data: authData, error: authErr } = await adminSupabase.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { name: row.name, role: 'student', phone: row.phone, school: row.school, grade: row.grade, must_change_password: true },
      })

      if (authErr) {
        const isDuplicate = authErr.message.includes('already been registered') || authErr.message.includes('already exists') || authErr.message.includes('duplicate')
        failed.push({ name: row.name, phone: row.phone, reason: isDuplicate ? '이미 등록된 전화번호' : authErr.message })
        continue
      }

      if (!authData?.user?.id) { failed.push({ name: row.name, phone: row.phone, reason: '계정 생성 실패: 사용자 정보 없음' }); continue }

      const userId = authData.user.id
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: userErr } = await adminSupabase.from('users').upsert(
        { id: userId, phone: row.phone, name: row.name, role: 'student', school: row.school, grade: row.grade, must_change_password: true } as any,
        { onConflict: 'id' },
      )

      if (userErr) {
        await adminSupabase.auth.admin.deleteUser(userId)
        failed.push({ name: row.name, phone: row.phone, reason: `정보 저장 실패: ${userErr.message}` })
        continue
      }

      const classId = classMap.get(row.className)
      if (classId) await adminSupabase.from('class_members').insert({ class_id: classId, student_id: userId })

      if (row.parentPhone) {
        const { data: parent } = await adminSupabase
          .from('users').select('id').eq('phone', row.parentPhone).eq('role', 'parent').single()
        if (parent) await adminSupabase.from('parent_links').insert({ parent_id: parent.id, student_id: authData.user.id })
      }

      succeeded++
    } catch (e) {
      logger.error('bulkCreateStudents:item-error', { action: 'bulkCreateStudents', userId: caller.id, error: e })
      failed.push({ name: row.name, phone: row.phone, reason: e instanceof Error ? e.message : '알 수 없는 오류' })
    }
  }

  revalidatePath('/admin/students')
  return { succeeded, failed }
}

export async function updateStudent(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('updateStudent', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }

    const studentId = formData.get('studentId') as string
    const name      = (formData.get('name')  as string).trim()
    const phone     = (formData.get('phone') as string).trim()
    const school    = (formData.get('school') as string || '').trim()
    const grade     = (formData.get('grade') as string || '').trim()

    if (!studentId || !name || !phone) return { success: false, error: '필수 항목을 입력해주세요.' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase.from('users').update({ name, phone, school, grade }).eq('id', studentId)
    if (error) throw error

    revalidatePath('/admin/students')
    revalidatePath(`/admin/students/${studentId}`)
    return { success: true }
  })
}

export async function changeStudentClass(
  studentId: string, oldClassId: string | null, newClassId: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('changeStudentClass', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }

    const adminSupabase = createAdminClient()
    if (oldClassId) {
      await adminSupabase.from('class_members').update({ is_active: false }).eq('student_id', studentId).eq('class_id', oldClassId)
    }

    const { data: existing } = await adminSupabase
      .from('class_members').select('id').eq('student_id', studentId).eq('class_id', newClassId).single()

    if (existing) {
      const { error } = await adminSupabase.from('class_members').update({ is_active: true }).eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await adminSupabase.from('class_members').insert({ class_id: newClassId, student_id: studentId })
      if (error) throw error
    }

    revalidatePath(`/admin/students/${studentId}`)
    return { success: true }
  })
}

export async function addStudentToClass(studentId: string, classId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('addStudentToClass', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }

    const adminSupabase = createAdminClient()
    const { data: existing } = await adminSupabase
      .from('class_members').select('id, is_active').eq('student_id', studentId).eq('class_id', classId).maybeSingle()

    if (existing) {
      if (existing.is_active) return { success: false, error: '이미 등록된 분반입니다.' }
      const { error } = await adminSupabase.from('class_members').update({ is_active: true }).eq('id', existing.id)
      if (error) throw error
    } else {
      const { error } = await adminSupabase.from('class_members').insert({ class_id: classId, student_id: studentId })
      if (error) throw error
    }

    revalidatePath(`/admin/students/${studentId}`)
    return { success: true }
  })
}

export async function removeStudentFromClass(studentId: string, classId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('removeStudentFromClass', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from('class_members').update({ is_active: false }).eq('student_id', studentId).eq('class_id', classId)
    if (error) throw error

    revalidatePath(`/admin/students/${studentId}`)
    return { success: true }
  })
}

export async function linkParent(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('linkParent', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }

    const studentId   = formData.get('studentId')   as string
    const parentPhone = (formData.get('parentPhone') as string).trim()

    if (!studentId || !parentPhone) return { success: false, error: '필수 항목을 입력해주세요.' }

    const adminSupabase = createAdminClient()
    const { data: parent } = await adminSupabase
      .from('users').select('id').eq('phone', parentPhone).eq('role', 'parent').single()

    if (!parent) return { success: false, error: '등록된 학부모 계정을 찾을 수 없습니다.' }

    const { error } = await adminSupabase.from('parent_links').insert({ parent_id: parent.id, student_id: studentId })

    if (error) {
      if (error.code === '23505') return { success: false, error: '이미 연결된 학부모입니다.' }
      throw error
    }

    revalidatePath(`/admin/students/${studentId}`)
    return { success: true }
  })
}

export async function unlinkParent(linkId: string, studentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('unlinkParent', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase.from('parent_links').delete().eq('id', linkId)
    if (error) throw error

    revalidatePath(`/admin/students/${studentId}`)
    return { success: true }
  })
}

export async function deleteStudent(studentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('deleteStudent', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }

    const role = caller.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const adminSupabase = createAdminClient()

    // 삭제 전에 이름 확보 (감사 로그용)
    const { data: target } = await adminSupabase
      .from('users').select('name').eq('id', studentId).maybeSingle()

    // users 테이블에서 삭제 (class_members, parent_links 등은 CASCADE)
    const { error: dbErr } = await adminSupabase.from('users').delete().eq('id', studentId)
    if (dbErr) throw dbErr

    // Auth에서도 삭제
    const { error: authErr } = await adminSupabase.auth.admin.deleteUser(studentId)
    if (authErr) logger.warn('deleteStudent:auth-delete-failed', { action: 'deleteStudent', userId: caller.id, error: authErr })

    await logAudit(caller, {
      action: 'student.delete', targetType: 'student',
      targetId: studentId, targetLabel: (target as { name?: string } | null)?.name ?? '',
    })

    revalidatePath('/admin/students')
    return { success: true }
  })
}

export async function setSuspension(
  studentId: string,
  from: string,
  until: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('setSuspension', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }

    const role = caller.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const adminSupabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminSupabase as any)
      .from('users')
      .update({ suspended_from: from, suspended_until: until })
      .eq('id', studentId)
    if (error) throw error

    revalidatePath(`/admin/students/${studentId}`)
    return { success: true }
  })
}

export async function clearSuspension(studentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('clearSuspension', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }

    const role = caller.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const adminSupabase = createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminSupabase as any)
      .from('users')
      .update({ suspended_from: null, suspended_until: null })
      .eq('id', studentId)
    if (error) throw error

    revalidatePath(`/admin/students/${studentId}`)
    return { success: true }
  })
}

export async function resetStudentPassword(studentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('resetStudentPassword', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }

    const role = caller.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const adminSupabase = createAdminClient()
    const password = getInitialPassword()

    const { error: authErr } = await adminSupabase.auth.admin.updateUserById(studentId, {
      password,
      user_metadata: { must_change_password: true },
    })
    if (authErr) throw authErr

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: dbErr } = await adminSupabase
      .from('users')
      .update({ must_change_password: true } as any)
      .eq('id', studentId)
    if (dbErr) throw dbErr

    const { data: target } = await adminSupabase
      .from('users').select('name').eq('id', studentId).maybeSingle()
    await logAudit(caller, {
      action: 'student.password_reset', targetType: 'student',
      targetId: studentId, targetLabel: (target as { name?: string } | null)?.name ?? '',
    })

    revalidatePath(`/admin/students/${studentId}`)
    return { success: true }
  })
}
