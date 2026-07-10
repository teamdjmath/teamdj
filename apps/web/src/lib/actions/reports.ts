'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { logAudit } from '@/lib/audit'
import { asJson } from '@/types/db'
export type { ReportContent } from '@/types/db'
import type { ReportContent } from '@/types/db' // used in function signatures below

async function assertStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: '인증이 필요합니다.' }
  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk'].includes(role ?? '')) return { ok: false as const, error: '권한이 없습니다.' }
  return { ok: true as const, user }
}

async function uploadReportImage(
  admin: ReturnType<typeof createAdminClient>,
  studentId: string,
  sessionDate: string,
  imageBase64: string,
): Promise<{ error?: string; publicUrl?: string }> {
  const b64 = imageBase64.split(',')[1] || imageBase64
  const buffer = Buffer.from(b64, 'base64')
  
  // 데이터 URL에서 MIME 타입 추출 시도 (기본값 image/png)
  const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/)
  const contentType = mimeMatch ? mimeMatch[1] : 'image/png'
  const ext = contentType.split('/')[1] || 'png'
  
  const filePath = `${studentId}/${sessionDate}_${Date.now()}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('reports')
    .upload(filePath, buffer, { contentType, upsert: true })

  if (uploadError) return { error: `이미지 업로드 실패: ${uploadError.message}` }

  const { data: { publicUrl } } = admin.storage.from('reports').getPublicUrl(filePath)
  return { publicUrl }
}

// ── 단일 리포트 저장 (레거시 호환용)
export async function saveReport(data: {
  classId: string
  studentId: string
  reportDate: string
  contentJson: ReportContent
  imageBase64: string
}): Promise<{ error?: string; id?: string; imageUrl?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk'].includes(role ?? '')) return { error: '권한이 없습니다.' }

  const admin = createAdminClient()
  const { error: uploadErr, publicUrl } = await uploadReportImage(
    admin, data.studentId, data.reportDate, data.imageBase64,
  )
  if (uploadErr || !publicUrl) return { error: uploadErr ?? '업로드 실패' }

  const { data: report, error: reportError } = await admin
    .from('reports')
    .upsert({
      class_id:           data.classId,
      student_id:         data.studentId,
      report_date:        data.reportDate,
      class_session_date: data.reportDate,
      content_json:       asJson(data.contentJson),
      image_url:          publicUrl,
    }, {
      onConflict: 'class_id, student_id, report_date'
    })
    .select('id')
    .single()

  if (reportError) {
    logger.error('saveReport:db-error', { action: 'saveReport', userId: user.id, error: reportError })
    return { error: '리포트 저장에 실패했습니다.' }
  }

  revalidatePath('/admin/reports')
  return { id: report.id as string, imageUrl: publicUrl }
}

// ── 분반 일괄 리포트 저장
export async function saveBatchReports(
  items: Array<{
    classId: string
    studentId: string
    sessionDate: string
    contentJson: ReportContent
    imageBase64: string
  }>,
): Promise<{ error?: string; saved: number; ids: string[] }> {
  const auth = await assertStaff()
  if (!auth.ok) return { error: auth.error, saved: 0, ids: [] }

  const admin = createAdminClient()
  const ids: string[] = []

  for (const item of items) {
    const { error: uploadErr, publicUrl } = await uploadReportImage(
      admin, item.studentId, item.sessionDate, item.imageBase64,
    )
    if (uploadErr || !publicUrl) continue

    const { data: report } = await admin
      .from('reports')
      .upsert({
        class_id:           item.classId,
        student_id:         item.studentId,
        report_date:        item.sessionDate,
        class_session_date: item.sessionDate,
        content_json:       asJson(item.contentJson),
        image_url:          publicUrl,
      }, {
        onConflict: 'class_id, student_id, report_date'
      })
      .select('id')
      .single()

    if (report) ids.push(report.id as string)
  }

  revalidatePath('/admin/reports')
  return { saved: ids.length, ids }
}

// ── 리포트 삭제 (Storage 이미지 + DB 행)
export async function deleteReport(reportId: string): Promise<{ error?: string }> {
  const auth = await assertStaff()
  if (!auth.ok) return { error: auth.error }

  const admin = createAdminClient()

  // 이미지 URL 조회 후 Storage 삭제
  const { data: report } = await admin
    .from('reports')
    .select('image_url, student_id')
    .eq('id', reportId)
    .single()

  if (report?.image_url) {
    const url    = report.image_url as string
    const bucket = 'reports'
    // URL에서 파일 경로 추출: .../storage/v1/object/public/reports/{path}
    const marker = `/object/public/${bucket}/`
    const idx    = url.indexOf(marker)
    if (idx !== -1) {
      const filePath = decodeURIComponent(url.slice(idx + marker.length))
      await admin.storage.from(bucket).remove([filePath])
    }
  }

  const { error } = await admin.from('reports').delete().eq('id', reportId)
  if (error) return { error: `삭제 실패: ${error.message}` }

  revalidatePath('/admin/reports')
  return {}
}

export async function deleteSessionReports(
  classId: string,
  sessionDate: string
): Promise<{ error?: string }> {
  const auth = await assertStaff()
  if (!auth.ok) return { error: auth.error }

  const admin = createAdminClient()

  // 1. 해당 세션의 모든 리포트 이미지 조회
  const { data: reports } = await admin
    .from('reports')
    .select('image_url')
    .eq('class_id', classId)
    .eq('report_date', sessionDate)

  if (reports && reports.length > 0) {
    const filePaths: string[] = []
    const bucket = 'reports'
    const marker = `/object/public/${bucket}/`

    for (const r of reports) {
      if (r.image_url) {
        const url = r.image_url as string
        const idx = url.indexOf(marker)
        if (idx !== -1) {
          filePaths.push(decodeURIComponent(url.slice(idx + marker.length)))
        }
      }
    }

    if (filePaths.length > 0) {
      await admin.storage.from(bucket).remove(filePaths)
    }
  }

  // 2. 리포트 레코드 일괄 삭제
  const { error } = await admin
    .from('reports')
    .delete()
    .eq('class_id', classId)
    .eq('report_date', sessionDate)

  if (error) return { error: `삭제 실패: ${error.message}` }

  await logAudit(auth.user, {
    action: 'report.delete_session', targetType: 'report',
    targetId: `${classId}/${sessionDate}`, targetLabel: `${sessionDate} 세션 리포트`,
    detail: { count: reports?.length ?? 0 },
  })

  revalidatePath('/admin/reports')
  return {}
}

// ── 카카오톡 친구톡 발송
export async function sendKakaoReport(
  reportId: string,
): Promise<{ error?: string; sentCount?: number }> {
  const apiKey = process.env.KAKAO_API_KEY
  if (!apiKey) return { error: '카카오 API 키가 설정되지 않았습니다.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: report } = await (supabase as any)
    .from('reports')
    .select('id, student_id, image_url, report_date, report_type, student:users!student_id(name)')
    .eq('id', reportId)
    .single()

  if (!report) return { error: '리포트를 찾을 수 없습니다.' }

  const r = report as Record<string, unknown>
  if (!r.image_url) return { error: '저장된 리포트 이미지가 없습니다.' }

  const { data: parentLinks } = await supabase
    .from('parent_links')
    .select('parent_id, parent:users!parent_id(phone, name)')
    .eq('student_id', r.student_id as string)

  if (!parentLinks?.length) return { error: '연결된 학부모 계정이 없습니다.' }

  const studentName = ((r.student as { name?: string } | null)?.name ?? '학생') as string
  const imageUrl    = r.image_url as string
  const reportDate  = r.report_date as string
  const isClinic    = r.report_type === 'clinic'
  const reportLabel = isClinic ? '클리닉 리포트' : '학습 리포트'

  const kakaoBody = (phone: string) => JSON.stringify({
    receiver_type: 'phone',
    receiver_phone: phone,
    template_object: {
      object_type: 'feed',
      content: {
        title:       `[TeamDJ] ${studentName} ${reportLabel}`,
        description: isClinic ? `${reportDate} 클리닉 리포트입니다.` : `${reportDate} 수업 학습 리포트입니다.`,
        image_url:   imageUrl,
        link: { web_url: imageUrl, mobile_web_url: imageUrl },
      },
      buttons: [
        { title: '리포트 보기', link: { web_url: imageUrl, mobile_web_url: imageUrl } },
      ],
    },
  })

  const sendResults = await Promise.allSettled(
    parentLinks
      .map((link) => {
        const lr     = link as Record<string, unknown>
        const parent = lr.parent as { phone?: string } | null
        return parent?.phone ? parent.phone.replace(/-/g, '') : null
      })
      .filter((phone): phone is string => !!phone)
      .map((phone) =>
        fetch('https://kapi.kakao.com/v1/api/talk/friends/message/send', {
          method:  'POST',
          headers: { Authorization: `KakaoAK ${apiKey}`, 'Content-Type': 'application/json' },
          body:    kakaoBody(phone),
        })
      )
  )

  const errors: string[] = []
  let sentCount = 0
  for (const r of sendResults) {
    if (r.status === 'fulfilled' && r.value.ok) {
      sentCount++
    } else if (r.status === 'fulfilled') {
      const err = await r.value.json().catch(() => ({}))
      errors.push((err as { msg?: string }).msg ?? `${r.value.status}`)
    } else {
      errors.push('네트워크 오류')
    }
  }

  if (sentCount > 0) {
    await supabase
      .from('reports')
      .update({ kakao_sent_at: new Date().toISOString() })
      .eq('id', reportId)
    revalidatePath('/admin/reports')
    revalidatePath(`/admin/reports/${reportId}`)
  }

  if (sentCount === 0) {
    return { error: errors.join(' / ') || '발송에 실패했습니다.' }
  }
  return { sentCount }
}

// ── 분반+날짜 전체 카카오톡 일괄 발송
export async function sendBatchKakaoReports(
  classId: string,
  date: string,
): Promise<{ error?: string; sent: number; failed: number }> {
  const apiKey = process.env.KAKAO_API_KEY
  if (!apiKey) return { error: '카카오 API 키가 설정되지 않았습니다.', sent: 0, failed: 0 }

  const auth = await assertStaff()
  if (!auth.ok) return { error: auth.error, sent: 0, failed: 0 }

  const admin = createAdminClient()

  const { data: reports } = await admin
    .from('reports')
    .select('id, student_id, image_url, report_date, student:users!student_id(name)')
    .eq('class_id', classId)
    .eq('report_date', date)

  if (!reports?.length) return { error: '해당 세션의 리포트가 없습니다.', sent: 0, failed: 0 }

  const now = new Date().toISOString()
  const validReports = reports.filter((r) => !!(r as Record<string, unknown>).image_url)
  const studentIds   = validReports.map((r) => (r as Record<string, unknown>).student_id as string)

  // 모든 학부모 링크를 한 번에 조회 (N개 순차 쿼리 → 1개 병렬 쿼리)
  const { data: allLinks } = await admin
    .from('parent_links')
    .select('student_id, parent:users!parent_id(phone)')
    .in('student_id', studentIds)

  const linksByStudent = new Map<string, string[]>()
  for (const link of allLinks ?? []) {
    const lr     = link as Record<string, unknown>
    const phone  = (lr.parent as { phone?: string } | null)?.phone
    const sid    = lr.student_id as string
    if (!phone || !sid) continue
    const phones = linksByStudent.get(sid) ?? []
    phones.push(phone.replace(/-/g, ''))
    linksByStudent.set(sid, phones)
  }

  // 모든 발송을 병렬 처리
  const sendJobs = validReports.flatMap((report) => {
    const r           = report as Record<string, unknown>
    const sid         = r.student_id as string
    const phones      = linksByStudent.get(sid) ?? []
    const studentName = ((r.student as { name?: string } | null)?.name ?? '학생') as string
    const imageUrl    = r.image_url as string
    const reportDate  = r.report_date as string

    return phones.map((phone) => ({
      reportId: r.id as string,
      phone,
      body: JSON.stringify({
        receiver_type: 'phone',
        receiver_phone: phone,
        template_object: {
          object_type: 'feed',
          content: {
            title:       `[TeamDJ] ${studentName} 학습 리포트`,
            description: `${reportDate} 수업 학습 리포트입니다.`,
            image_url:   imageUrl,
            link: { web_url: imageUrl, mobile_web_url: imageUrl },
          },
          buttons: [
            { title: '리포트 보기', link: { web_url: imageUrl, mobile_web_url: imageUrl } },
          ],
        },
      }),
    }))
  })

  const fetchResults = await Promise.allSettled(
    sendJobs.map(({ body }) =>
      fetch('https://kapi.kakao.com/v1/api/talk/friends/message/send', {
        method:  'POST',
        headers: { Authorization: `KakaoAK ${apiKey}`, 'Content-Type': 'application/json' },
        body,
      })
    )
  )

  // 성공한 reportId 집계 후 일괄 업데이트
  const sentReportIds = new Set<string>()
  const failedReportIds = new Set<string>()

  fetchResults.forEach((result, i) => {
    const { reportId } = sendJobs[i]
    if (result.status === 'fulfilled' && result.value.ok) {
      sentReportIds.add(reportId)
    } else {
      if (!sentReportIds.has(reportId)) failedReportIds.add(reportId)
    }
  })

  // 발송 성공한 리포트만 kakao_sent_at 업데이트 (N개 순차 → 1개 병렬)
  if (sentReportIds.size > 0) {
    await admin
      .from('reports')
      .update({ kakao_sent_at: now })
      .in('id', [...sentReportIds])
  }

  // 이미지 없는 리포트는 failed 카운트
  const noImageFailed = reports.length - validReports.length
  // 학부모 링크 없는 리포트는 failed
  const noLinkFailed  = validReports.filter((r) => {
    const sid = (r as Record<string, unknown>).student_id as string
    return !linksByStudent.has(sid)
  }).length

  await logAudit(auth.user, {
    action: 'report.kakao_batch_send', targetType: 'report',
    targetId: `${classId}/${date}`, targetLabel: `${date} 세션 카카오 일괄 발송`,
    detail: { sent: sentReportIds.size, failed: failedReportIds.size + noImageFailed + noLinkFailed },
  })

  revalidatePath('/admin/reports')
  revalidatePath(`/admin/reports/session/${classId}/${date}`)
  return {
    sent:   sentReportIds.size,
    failed: failedReportIds.size + noImageFailed + noLinkFailed,
  }
}

// ════════════════════════════════════════════════════════════════
// 클리닉 리포트 (엑셀 업로드 기반 · report_type = 'clinic')
// ════════════════════════════════════════════════════════════════

export type ClinicContent = {
  type: 'clinic'
  school: string
  grade: string
  arrivalTime: string
  departureTime: string
  clinicContent: string
}

// 엑셀의 이름/학교를 users 테이블 학생과 매칭 (카카오 발송에 student_id 필요)
export async function matchClinicStudents(
  entries: Array<{ name: string; school: string }>,
): Promise<{ error?: string; matches: Array<{ name: string; school: string; studentId: string | null }> }> {
  const auth = await assertStaff()
  if (!auth.ok) return { error: auth.error, matches: [] }

  const admin = createAdminClient()
  const names = [...new Set(entries.map((e) => e.name.trim()).filter(Boolean))]
  if (names.length === 0) return { matches: [] }

  const { data: students } = await admin
    .from('users')
    .select('id, name, school')
    .eq('role', 'student')
    .in('name', names)

  const rows = (students ?? []) as Array<{ id: string; name: string; school: string | null }>

  const matches = entries.map((e) => {
    const candidates = rows.filter((s) => s.name === e.name.trim())
    if (candidates.length === 0) return { ...e, studentId: null }
    if (candidates.length === 1) return { ...e, studentId: candidates[0].id }
    // 동명이인: 학교로 구분
    const bySchool = candidates.find((s) => (s.school ?? '').trim() === e.school.trim())
    return { ...e, studentId: bySchool?.id ?? null }
  })

  return { matches }
}

// 저장 (같은 학생+날짜의 clinic 리포트가 있으면 덮어씀 = 수정)
export async function saveClinicReports(
  items: Array<{
    studentId: string
    reportDate: string
    contentJson: ClinicContent
    imageBase64: string
  }>,
): Promise<{ error?: string; saved: number }> {
  const auth = await assertStaff()
  if (!auth.ok) return { error: auth.error, saved: 0 }

  const admin = createAdminClient()
  let saved = 0

  for (const item of items) {
    const { error: uploadErr, publicUrl } = await uploadReportImage(
      admin, item.studentId, item.reportDate, item.imageBase64,
    )
    if (uploadErr || !publicUrl) continue

    // 기존 clinic 리포트 교체 (partial unique index는 upsert 타겟이 안 되므로 delete → insert)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = admin as any
    await db.from('reports').delete()
      .eq('student_id', item.studentId)
      .eq('report_date', item.reportDate)
      .eq('report_type', 'clinic')

    const { error: insertErr } = await db.from('reports').insert({
      class_id:     null,
      student_id:   item.studentId,
      report_date:  item.reportDate,
      report_type:  'clinic',
      content_json: asJson(item.contentJson),
      image_url:    publicUrl,
    })
    if (!insertErr) saved++
  }

  await logAudit(auth.user, {
    action: 'report.clinic_save', targetType: 'report',
    targetId: items[0]?.reportDate ?? '', targetLabel: `클리닉 리포트 저장`,
    detail: { count: saved, date: items[0]?.reportDate },
  })

  revalidatePath('/admin/reports')
  return { saved }
}

// 날짜별 클리닉 리포트 전체 삭제 (이미지 포함)
export async function deleteClinicSession(date: string): Promise<{ error?: string }> {
  const auth = await assertStaff()
  if (!auth.ok) return { error: auth.error }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: reports } = await db
    .from('reports')
    .select('image_url')
    .eq('report_type', 'clinic')
    .eq('report_date', date)

  const bucket = 'reports'
  const marker = `/object/public/${bucket}/`
  const filePaths = ((reports ?? []) as Array<{ image_url: string | null }>)
    .map((r) => {
      if (!r.image_url) return null
      const idx = r.image_url.indexOf(marker)
      return idx !== -1 ? decodeURIComponent(r.image_url.slice(idx + marker.length)) : null
    })
    .filter((p): p is string => !!p)

  if (filePaths.length > 0) await admin.storage.from(bucket).remove(filePaths)

  const { error } = await db
    .from('reports')
    .delete()
    .eq('report_type', 'clinic')
    .eq('report_date', date)

  if (error) return { error: `삭제 실패: ${error.message}` }

  await logAudit(auth.user, {
    action: 'report.delete_session', targetType: 'report',
    targetId: `clinic/${date}`, targetLabel: `${date} 클리닉 리포트`,
    detail: { count: reports?.length ?? 0 },
  })

  revalidatePath('/admin/reports')
  return {}
}

// 날짜별 클리닉 리포트 카카오 일괄 발송
export async function sendBatchClinicKakao(
  date: string,
): Promise<{ error?: string; sent: number; failed: number }> {
  const apiKey = process.env.KAKAO_API_KEY
  if (!apiKey) return { error: '카카오 API 키가 설정되지 않았습니다.', sent: 0, failed: 0 }

  const auth = await assertStaff()
  if (!auth.ok) return { error: auth.error, sent: 0, failed: 0 }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: reports } = await db
    .from('reports')
    .select('id, student_id, image_url, report_date, student:users!student_id(name)')
    .eq('report_type', 'clinic')
    .eq('report_date', date)

  if (!reports?.length) return { error: '해당 날짜의 클리닉 리포트가 없습니다.', sent: 0, failed: 0 }

  const now = new Date().toISOString()
  const validReports = (reports as Array<Record<string, unknown>>).filter((r) => !!r.image_url)
  const studentIds   = validReports.map((r) => r.student_id as string)

  const { data: allLinks } = await admin
    .from('parent_links')
    .select('student_id, parent:users!parent_id(phone)')
    .in('student_id', studentIds)

  const linksByStudent = new Map<string, string[]>()
  for (const link of allLinks ?? []) {
    const lr    = link as Record<string, unknown>
    const phone = (lr.parent as { phone?: string } | null)?.phone
    const sid   = lr.student_id as string
    if (!phone || !sid) continue
    const phones = linksByStudent.get(sid) ?? []
    phones.push(phone.replace(/-/g, ''))
    linksByStudent.set(sid, phones)
  }

  const sendJobs = validReports.flatMap((r) => {
    const sid         = r.student_id as string
    const phones      = linksByStudent.get(sid) ?? []
    const studentName = ((r.student as { name?: string } | null)?.name ?? '학생') as string
    const imageUrl    = r.image_url as string
    const reportDate  = r.report_date as string

    return phones.map((phone) => ({
      reportId: r.id as string,
      body: JSON.stringify({
        receiver_type: 'phone',
        receiver_phone: phone,
        template_object: {
          object_type: 'feed',
          content: {
            title:       `[TeamDJ] ${studentName} 클리닉 리포트`,
            description: `${reportDate} 클리닉 리포트입니다.`,
            image_url:   imageUrl,
            link: { web_url: imageUrl, mobile_web_url: imageUrl },
          },
          buttons: [
            { title: '리포트 보기', link: { web_url: imageUrl, mobile_web_url: imageUrl } },
          ],
        },
      }),
    }))
  })

  const fetchResults = await Promise.allSettled(
    sendJobs.map(({ body }) =>
      fetch('https://kapi.kakao.com/v1/api/talk/friends/message/send', {
        method:  'POST',
        headers: { Authorization: `KakaoAK ${apiKey}`, 'Content-Type': 'application/json' },
        body,
      })
    )
  )

  const sentReportIds = new Set<string>()
  const failedReportIds = new Set<string>()
  fetchResults.forEach((result, i) => {
    const { reportId } = sendJobs[i]
    if (result.status === 'fulfilled' && result.value.ok) sentReportIds.add(reportId)
    else if (!sentReportIds.has(reportId)) failedReportIds.add(reportId)
  })

  if (sentReportIds.size > 0) {
    await admin.from('reports').update({ kakao_sent_at: now }).in('id', [...sentReportIds])
  }

  const noImageFailed = reports.length - validReports.length
  const noLinkFailed  = validReports.filter((r) => !linksByStudent.has(r.student_id as string)).length

  await logAudit(auth.user, {
    action: 'report.kakao_batch_send', targetType: 'report',
    targetId: `clinic/${date}`, targetLabel: `${date} 클리닉 카카오 일괄 발송`,
    detail: { sent: sentReportIds.size, failed: failedReportIds.size + noImageFailed + noLinkFailed },
  })

  revalidatePath('/admin/reports')
  return {
    sent:   sentReportIds.size,
    failed: failedReportIds.size + noImageFailed + noLinkFailed,
  }
}
