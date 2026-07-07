'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'
import { logger } from '@/lib/logger'
import { logAudit } from '@/lib/audit'

export type StaffStatus = 'online' | 'busy' | 'offline'

export async function updateStaffStatus(status: StaffStatus): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('updateStaffStatus', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const { error } = await supabase
      .from('staff_status')
      .upsert(
        { user_id: user.id, status, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      )
    if (error) throw error

    revalidatePath('/admin/schedule')
    return { success: true }
  })
}

// 조교(ta_desk/ta_assistant) 계정 삭제 — 선생님만 가능, 선생님 계정은 이 함수로 삭제할 수 없음
export async function deleteTaAccount(taId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('deleteTaAccount', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }

    const callerRole = caller.user_metadata?.role as string | undefined
    if (callerRole !== 'teacher') return { success: false, error: '선생님만 조교 계정을 삭제할 수 있습니다.' }

    const adminSupabase = createAdminClient()

    const { data: target } = await adminSupabase
      .from('users').select('name, role').eq('id', taId).maybeSingle()

    const targetRole = (target as { role?: string } | null)?.role
    if (!targetRole || !['ta_desk', 'ta_assistant'].includes(targetRole)) {
      return { success: false, error: '조교 계정만 삭제할 수 있습니다.' }
    }

    // 완전 삭제 대신 비활성화 — qna_answers/notices/push_messages 등이 ta_id/author_id/sender_id를
    // ON DELETE RESTRICT로 참조하고 있어서, 답변/공지/쪽지를 하나라도 남긴 계정은 하드 삭제가 불가능함.
    // is_active=false로 로그인·목록 노출은 막되, 과거 기록의 작성자 정보는 그대로 보존한다.
    const { error: dbErr } = await adminSupabase.from('users').update({ is_active: false }).eq('id', taId)
    if (dbErr) throw dbErr

    const { error: authErr } = await adminSupabase.auth.admin.deleteUser(taId)
    if (authErr) logger.warn('deleteTaAccount:auth-delete-failed', { action: 'deleteTaAccount', userId: caller.id, error: authErr })

    await logAudit(caller, {
      action: 'staff.delete', targetType: 'staff',
      targetId: taId, targetLabel: (target as { name?: string } | null)?.name ?? '',
    })

    revalidatePath('/admin/dashboard')
    revalidatePath('/admin/staff')
    return { success: true }
  })
}

// 마지막 남은 (활성) 선생님 계정은 삭제(탈퇴 포함) 불가 — 관리 기능 전체가 잠기는 것을 방지
async function isLastTeacher(adminSupabase: ReturnType<typeof createAdminClient>, excludingId: string): Promise<boolean> {
  const { count } = await adminSupabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'teacher')
    .eq('is_active', true)
    .neq('id', excludingId)
  return (count ?? 0) === 0
}

// 선생님 본인 탈퇴 — teacher 본인만 자신의 계정을 삭제할 수 있음 (다른 선생님은 삭제 불가)
export async function withdrawOwnTeacherAccount(): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('withdrawOwnTeacherAccount', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }

    const callerRole = caller.user_metadata?.role as string | undefined
    if (callerRole !== 'teacher') return { success: false, error: '선생님 계정만 탈퇴할 수 있습니다.' }

    const adminSupabase = createAdminClient()

    if (await isLastTeacher(adminSupabase, caller.id)) {
      return { success: false, error: '마지막 남은 선생님 계정은 탈퇴할 수 없습니다.' }
    }

    // 완전 삭제 대신 비활성화 — 과거에 작성한 답변/공지/쪽지의 참조 무결성을 깨지 않기 위함 (deleteTaAccount 주석 참고)
    const { error: dbErr } = await adminSupabase.from('users').update({ is_active: false }).eq('id', caller.id)
    if (dbErr) throw dbErr

    const { error: authErr } = await adminSupabase.auth.admin.deleteUser(caller.id)
    if (authErr) logger.warn('withdrawOwnTeacherAccount:auth-delete-failed', { action: 'withdrawOwnTeacherAccount', userId: caller.id, error: authErr })

    await logAudit(caller, {
      action: 'staff.withdraw', targetType: 'staff',
      targetId: caller.id, targetLabel: (caller.user_metadata?.name as string | undefined) ?? '',
    })

    return { success: true }
  })
}

// 다른 선생님 계정 삭제 — 관리자(is_super_admin)만 가능
export async function deleteTeacherAccount(teacherId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user: caller } } = await supabase.auth.getUser()

  return withAction('deleteTeacherAccount', caller?.id, async () => {
    if (!caller) return { success: false, error: '인증이 필요합니다.' }
    if (teacherId === caller.id) return { success: false, error: '본인 계정은 탈퇴 기능을 이용해주세요.' }

    const adminSupabase = createAdminClient()

    const { data: callerRow } = await adminSupabase
      .from('users').select('is_super_admin').eq('id', caller.id).maybeSingle()
    if (!callerRow?.is_super_admin) return { success: false, error: '관리자만 다른 선생님 계정을 삭제할 수 있습니다.' }

    const { data: target } = await adminSupabase
      .from('users').select('name, role').eq('id', teacherId).maybeSingle()
    if ((target as { role?: string } | null)?.role !== 'teacher') {
      return { success: false, error: '선생님 계정만 이 기능으로 삭제할 수 있습니다.' }
    }

    if (await isLastTeacher(adminSupabase, teacherId)) {
      return { success: false, error: '마지막 남은 선생님 계정은 삭제할 수 없습니다.' }
    }

    // 완전 삭제 대신 비활성화 — 과거에 작성한 답변/공지/쪽지의 참조 무결성을 깨지 않기 위함 (deleteTaAccount 주석 참고)
    const { error: dbErr } = await adminSupabase.from('users').update({ is_active: false }).eq('id', teacherId)
    if (dbErr) throw dbErr

    const { error: authErr } = await adminSupabase.auth.admin.deleteUser(teacherId)
    if (authErr) logger.warn('deleteTeacherAccount:auth-delete-failed', { action: 'deleteTeacherAccount', userId: caller.id, error: authErr })

    await logAudit(caller, {
      action: 'staff.delete', targetType: 'staff',
      targetId: teacherId, targetLabel: (target as { name?: string } | null)?.name ?? '',
    })

    revalidatePath('/admin/dashboard')
    revalidatePath('/admin/staff')
    return { success: true }
  })
}
