'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath, revalidateTag } from 'next/cache'
import { withAction } from '@/lib/actions'
import type { ActionResult } from '@/lib/types/actions'

import { scheduleTextFromSlots, type TimeSlot } from '@/lib/class-slots'

// 요일별 시간대 슬롯 파싱 (slot_days_{i} 체크박스 + slot_start_{i}/slot_end_{i})
// legacy 컬럼 동기화: day_of_week = 슬롯 요일 합집합, start/end_time = 첫 슬롯 시간
function parseScheduleFields(formData: FormData) {
  const slots: TimeSlot[] = []
  const count = Number(formData.get('slot_count') ?? 0)
  for (let i = 0; i < count; i++) {
    const days  = formData.getAll(`slot_days_${i}`).map(Number).filter((n) => !isNaN(n))
    const start = (formData.get(`slot_start_${i}`) as string | null)?.trim() || ''
    const end   = (formData.get(`slot_end_${i}`)   as string | null)?.trim() || ''
    if (days.length > 0 && start && end) slots.push({ days, start, end })
  }

  const allDays = [...new Set(slots.flatMap((s) => s.days))]
  return {
    time_slots:  slots.length > 0 ? slots : null,
    day_of_week: allDays.length ? allDays : null,
    start_time:  slots[0]?.start ?? null,
    end_time:    slots[0]?.end ?? null,
    schedule:    scheduleTextFromSlots(slots),
  }
}

// 조교별 담당 요일 (taDays_{taId} 체크박스) — 미선택이면 null = 모든 수업 요일 담당
function parseTaDays(formData: FormData, taId: string): number[] | null {
  const days = formData.getAll(`taDays_${taId}`).map(Number).filter((n) => !isNaN(n))
  return days.length > 0 ? days : null
}

export async function createClass(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('createClass', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (!['teacher', 'ta_desk'].includes(role ?? '')) return { success: false, error: '권한이 없습니다.' }

    const name    = (formData.get('name')    as string).trim()
    const subject = (formData.get('subject') as string).trim()
    const grade   = (formData.get('grade')   as string).trim()

    if (!name || !subject || !grade) return { success: false, error: '필수 항목을 입력해주세요.' }

    const { time_slots, day_of_week, start_time, end_time, schedule } = parseScheduleFields(formData)
    const adminSupabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (adminSupabase as any).from('class_groups').insert({
      name, subject, grade, schedule, day_of_week, start_time, end_time, time_slots, teacher_id: user.id,
    }).select('id').single()
    if (error) throw error

    const taIds = (formData.getAll('taIds') as string[]).filter(Boolean)
    if (taIds.length > 0 && data?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminSupabase as any).from('ta_class_access').insert(
        taIds.map((taId) => ({
          ta_id: taId, class_id: data.id, is_all_classes: false,
          days: parseTaDays(formData, taId),
        })),
      )
    }

    revalidatePath('/admin/classes')
    revalidatePath('/admin/schedule')
    revalidateTag('classes', { expire: 0 })
    return { success: true }
  })
}

export async function updateClass(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('updateClass', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const classId  = formData.get('classId')  as string
    const name     = (formData.get('name')    as string).trim()
    const subject  = (formData.get('subject') as string).trim()
    const grade    = (formData.get('grade')   as string).trim()
    const isActive = formData.get('is_active') === 'true'

    if (!classId || !name || !subject || !grade) return { success: false, error: '필수 항목을 입력해주세요.' }

    const { time_slots, day_of_week, start_time, end_time, schedule } = parseScheduleFields(formData)
    const adminSupabase = createAdminClient()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (adminSupabase as any)
      .from('class_groups')
      .update({ name, subject, grade, schedule, day_of_week, start_time, end_time, time_slots, is_active: isActive })
      .eq('id', classId)
    if (error) throw error

    // TA 배정 갱신: 기존 class-specific 행 삭제 후 새로 insert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = adminSupabase as any
    await db.from('ta_class_access').delete().eq('class_id', classId).eq('is_all_classes', false)
    const taIds = (formData.getAll('taIds') as string[]).filter(Boolean)
    if (taIds.length > 0) {
      await db.from('ta_class_access').insert(
        taIds.map((taId) => ({
          ta_id: taId, class_id: classId, is_all_classes: false,
          days: parseTaDays(formData, taId),
        })),
      )
    }

    revalidatePath('/admin/classes')
    revalidatePath(`/admin/classes/${classId}`)
    revalidatePath('/admin/schedule')
    revalidateTag('classes', { expire: 0 })
    return { success: true }
  })
}

export async function deleteClass(classId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('deleteClass', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (role !== 'teacher') return { success: false, error: '선생님만 분반을 삭제할 수 있습니다.' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from('class_groups')
      .update({ is_active: false })
      .eq('id', classId)
    if (error) throw error

    revalidatePath('/admin/classes')
    revalidateTag('classes', { expire: 0 })
    return { success: true }
  })
}

export async function hardDeleteClass(classId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('hardDeleteClass', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const role = user.user_metadata?.role as string | undefined
    if (role !== 'teacher') return { success: false, error: '선생님만 분반을 삭제할 수 있습니다.' }

    const adminSupabase = createAdminClient()
    // 재원 중(활성)인 학생만 검사 — 제외된 학생은 비활성 이력으로 남으므로
    // 전체 행을 세면 학생을 모두 빼도 영원히 삭제가 막힌다 (분반 목록의 "0명" 표시와 같은 기준)
    const { count } = await adminSupabase
      .from('class_members')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('is_active', true)

    if ((count ?? 0) > 0) {
      return { success: false, error: '재원 중인 학생이 있는 분반은 완전 삭제할 수 없습니다. 학생을 모두 제거한 후 다시 시도해주세요.' }
    }

    // 과거 소속 이력·출결·점수 등 분반에 연결된 기록은 DB 규칙(CASCADE)에 따라 함께 삭제됨
    const { error } = await adminSupabase.from('class_groups').delete().eq('id', classId)
    if (error) throw error

    revalidatePath('/admin/classes')
    revalidateTag('classes', { expire: 0 })
    return { success: true }
  })
}

export async function removeStudentFromClass(classId: string, studentId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return withAction('removeStudentFromClass', user?.id, async () => {
    if (!user) return { success: false, error: '인증이 필요합니다.' }

    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
      .from('class_members')
      .update({ is_active: false })
      .eq('class_id', classId)
      .eq('student_id', studentId)
    if (error) throw error

    revalidatePath(`/admin/classes/${classId}`)
    return { success: true }
  })
}
