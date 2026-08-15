'use server'

import { createClient } from '@/lib/supabase/server'
import { getVerifiedUser } from '@/lib/supabase/verified-user'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import { logAudit } from '@/lib/audit'
import { asJson } from '@/types/db'
export type { ReportContent } from '@/types/db'
import type { ReportContent } from '@/types/db' // used in function signatures below
import { SolapiMessageService } from 'solapi'
import { writeFile, unlink } from 'fs/promises'
import { randomUUID } from 'crypto'
import { tmpdir } from 'os'
import { join } from 'path'
import { getSolapiConfig } from '@/lib/kakao'

async function assertStaff() {
  const user = await getVerifiedUser()
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
  const user = await getVerifiedUser()
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

// ── 리포트 작성 임시저장 (학습내용/과제/공지사항/학생별 특이사항)
export type ReportDraftData = {
  studyContent: string
  homework: string
  announcement: string
  perStudentNotes: Record<string, string>
}

export async function saveReportDraft(
  classId: string,
  sessionDate: string,
  data: ReportDraftData,
): Promise<{ error?: string; savedAt?: string }> {
  const auth = await assertStaff()
  if (!auth.ok) return { error: auth.error }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { error } = await admin
    .from('report_drafts')
    .upsert({
      class_id:           classId,
      session_date:       sessionDate,
      study_content:      data.studyContent,
      homework:           data.homework,
      announcement:       data.announcement,
      per_student_notes:  asJson(data.perStudentNotes),
      updated_by:         auth.user.id,
      updated_at:         now,
    }, { onConflict: 'class_id, session_date' })

  if (error) {
    logger.error('saveReportDraft:db-error', { action: 'saveReportDraft', userId: auth.user.id, error })
    return { error: '임시저장에 실패했습니다.' }
  }

  return { savedAt: now }
}

// ── 리포트 일괄 생성 완료 후 임시저장 데이터 정리
export async function deleteReportDraft(classId: string, sessionDate: string): Promise<{ error?: string }> {
  const auth = await assertStaff()
  if (!auth.ok) return { error: auth.error }

  const admin = createAdminClient()
  await admin.from('report_drafts').delete().eq('class_id', classId).eq('session_date', sessionDate)
  return {}
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

// ── 보존 정책: N일 지난 리포트 자동 삭제 (Storage 이미지 포함)
// Storage 객체는 SQL DELETE로는 정확히 못 지워서(SDK 호출 필요) pg_cron을 쓰지 않고,
// audit_logs의 lazy fallback과 같은 방식으로 /admin/reports 진입 시마다 정리한다.
export async function purgeOldReports(days: number): Promise<void> {
  const admin = createAdminClient()
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

  const { data: rows } = await admin
    .from('reports')
    .select('image_url')
    .lt('report_date', cutoff)

  if (!rows || rows.length === 0) return

  const bucket = 'reports'
  const marker = `/object/public/${bucket}/`
  const filePaths = rows
    .map((r) => r.image_url as string | null)
    .filter((url): url is string => !!url)
    .map((url) => {
      const idx = url.indexOf(marker)
      return idx !== -1 ? decodeURIComponent(url.slice(idx + marker.length)) : null
    })
    .filter((p): p is string => !!p)

  if (filePaths.length > 0) await admin.storage.from(bucket).remove(filePaths)

  await admin.from('reports').delete().lt('report_date', cutoff)
}

// ── 카카오 친구톡(브랜드메시지) 발송 — Solapi 연동
// 알림톡은 템플릿당 고정 이미지 1장만 허용돼 학생마다 다른 리포트 이미지를 못
// 보내므로, 채널 친구에게 자유형 이미지(BMS_FREE)로 발송한다. getSolapiConfig는
// src/lib/kakao.ts로 옮겨 텍스트 전용 발송(sendKakaoText)과 공유한다.

// Storage에 있는 리포트 이미지를 Solapi에 업로드해 fileId를 발급받는다.
// uploadFile()이 로컬 파일 경로만 받아서 임시 파일을 거쳐야 한다.
async function uploadImageToSolapi(
  messageService: SolapiMessageService,
  imageUrl: string,
): Promise<string> {
  const res = await fetch(imageUrl)
  if (!res.ok) throw new Error(`이미지 다운로드 실패: ${res.status}`)
  const buffer  = Buffer.from(await res.arrayBuffer())
  const ext     = imageUrl.match(/\.(\w+)(?:\?|$)/)?.[1] ?? 'png'
  const tmpPath = join(tmpdir(), `kakao-report-${randomUUID()}.${ext}`)
  await writeFile(tmpPath, buffer)
  try {
    const { fileId } = await messageService.uploadFile(tmpPath, 'BMS')
    return fileId
  } finally {
    await unlink(tmpPath).catch(() => {})
  }
}

function buildKakaoMessage(opts: {
  pfId: string
  senderPhone: string
  phone: string
  fileId: string
  studentName: string
  reportLabel: string
  reportDate: string
  imageUrl: string
}) {
  return {
    to:   opts.phone,
    from: opts.senderPhone,
    text: `[TeamDJ] ${opts.studentName} ${opts.reportLabel}\n${opts.reportDate} ${opts.reportLabel}가 도착했습니다.`,
    type: 'BMS_FREE' as const,
    kakaoOptions: {
      pfId: opts.pfId,
      bms: {
        targeting:      'I' as const,
        chatBubbleType: 'IMAGE' as const,
        imageId:        opts.fileId,
        imageLink:      opts.imageUrl,
        buttons: [
          { linkType: 'WL' as const, name: '리포트 보기', linkMobile: opts.imageUrl, linkPc: opts.imageUrl },
        ],
      },
    },
  }
}

export async function sendKakaoReport(
  reportId: string,
): Promise<{ error?: string; sentCount?: number }> {
  const config = getSolapiConfig()
  if (!config) return { error: '카카오 발송 설정(Solapi)이 아직 준비되지 않았습니다.' }

  const supabase = await createClient()
  const user = await getVerifiedUser()
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
  const reportLabel = r.report_type === 'clinic' ? '클리닉 리포트' : '학습 리포트'

  const phones = parentLinks
    .map((link) => {
      const lr     = link as Record<string, unknown>
      const parent = lr.parent as { phone?: string } | null
      return parent?.phone ? parent.phone.replace(/\D/g, '') : null
    })
    .filter((phone): phone is string => !!phone)

  const messageService = new SolapiMessageService(config.apiKey, config.apiSecret)

  let fileId: string
  try {
    fileId = await uploadImageToSolapi(messageService, imageUrl)
  } catch (e) {
    return { error: e instanceof Error ? e.message : '이미지 업로드에 실패했습니다.' }
  }

  const sendResults = await Promise.allSettled(
    phones.map((phone) =>
      messageService.send(buildKakaoMessage({ ...config, phone, fileId, studentName, reportLabel, reportDate, imageUrl })),
    ),
  )

  const errors: string[] = []
  let sentCount = 0
  for (const result of sendResults) {
    if (result.status === 'fulfilled') {
      sentCount++
    } else {
      errors.push(result.reason instanceof Error ? result.reason.message : '발송 실패')
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
  const config = getSolapiConfig()
  if (!config) return { error: '카카오 발송 설정(Solapi)이 아직 준비되지 않았습니다.', sent: 0, failed: 0 }

  const auth = await assertStaff()
  if (!auth.ok) return { error: auth.error, sent: 0, failed: 0 }

  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: reports } = await (admin as any)
    .from('reports')
    .select('id, student_id, image_url, report_date, report_type, student:users!student_id(name)')
    .eq('class_id', classId)
    .eq('report_date', date)

  if (!reports?.length) return { error: '해당 세션의 리포트가 없습니다.', sent: 0, failed: 0 }

  const now = new Date().toISOString()
  const validReports = reports.filter((r: Record<string, unknown>) => !!r.image_url)
  const studentIds   = validReports.map((r: Record<string, unknown>) => r.student_id as string)

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
    phones.push(phone.replace(/\D/g, ''))
    linksByStudent.set(sid, phones)
  }

  const messageService = new SolapiMessageService(config.apiKey, config.apiSecret)

  // 리포트당 이미지 업로드는 1회만 (학부모가 여러 명이어도 fileId 재사용)
  const sendJobs: Array<{ reportId: string; phone: string; fileId: string; studentName: string; reportLabel: string; reportDate: string; imageUrl: string }> = []
  const uploadFailedReportIds = new Set<string>()

  for (const report of validReports) {
    const r           = report as Record<string, unknown>
    const sid         = r.student_id as string
    const phones      = linksByStudent.get(sid) ?? []
    if (phones.length === 0) continue

    const imageUrl = r.image_url as string
    let fileId: string
    try {
      fileId = await uploadImageToSolapi(messageService, imageUrl)
    } catch {
      uploadFailedReportIds.add(r.id as string)
      continue
    }

    const studentName = ((r.student as { name?: string } | null)?.name ?? '학생') as string
    const reportLabel = r.report_type === 'clinic' ? '클리닉 리포트' : '학습 리포트'
    const reportDate  = r.report_date as string

    for (const phone of phones) {
      sendJobs.push({ reportId: r.id as string, phone, fileId, studentName, reportLabel, reportDate, imageUrl })
    }
  }

  const sendResults = await Promise.allSettled(
    sendJobs.map((job) =>
      messageService.send(buildKakaoMessage({ ...config, ...job })),
    ),
  )

  // 성공한 reportId 집계 후 일괄 업데이트
  const sentReportIds = new Set<string>()
  const failedReportIds = new Set<string>()

  sendResults.forEach((result, i) => {
    const { reportId } = sendJobs[i]
    if (result.status === 'fulfilled') {
      sentReportIds.add(reportId)
    } else {
      if (!sentReportIds.has(reportId)) failedReportIds.add(reportId)
    }
  })
  for (const reportId of uploadFailedReportIds) {
    if (!sentReportIds.has(reportId)) failedReportIds.add(reportId)
  }

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
  const noLinkFailed  = validReports.filter((r: Record<string, unknown>) => {
    const sid = r.student_id as string
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
    // 이름이 유일하면 학교 표기가 달라도 매칭 (사람이 입력하는 데이터라 느슨하게)
    if (candidates.length === 1) return { ...e, studentId: candidates[0].id }
    // 동명이인만 학교로 구분: 완전 일치 → 부분 일치("대륜고" ⊂ "대륜고등학교") 순
    const school = e.school.trim()
    const exact = candidates.find((s) => (s.school ?? '').trim() === school)
    if (exact) return { ...e, studentId: exact.id }
    const partial = school
      ? candidates.find((s) => {
          const st = (s.school ?? '').trim()
          return st.includes(school) || school.includes(st)
        })
      : undefined
    return { ...e, studentId: partial?.id ?? null }
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
  const config = getSolapiConfig()
  if (!config) return { error: '카카오 발송 설정(Solapi)이 아직 준비되지 않았습니다.', sent: 0, failed: 0 }

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
    phones.push(phone.replace(/\D/g, ''))
    linksByStudent.set(sid, phones)
  }

  const messageService = new SolapiMessageService(config.apiKey, config.apiSecret)

  const sendJobs: Array<{ reportId: string; phone: string; fileId: string; studentName: string; reportLabel: string; reportDate: string; imageUrl: string }> = []
  const uploadFailedReportIds = new Set<string>()

  for (const r of validReports) {
    const sid    = r.student_id as string
    const phones = linksByStudent.get(sid) ?? []
    if (phones.length === 0) continue

    const imageUrl = r.image_url as string
    let fileId: string
    try {
      fileId = await uploadImageToSolapi(messageService, imageUrl)
    } catch {
      uploadFailedReportIds.add(r.id as string)
      continue
    }

    const studentName = ((r.student as { name?: string } | null)?.name ?? '학생') as string
    const reportDate  = r.report_date as string

    for (const phone of phones) {
      sendJobs.push({ reportId: r.id as string, phone, fileId, studentName, reportLabel: '클리닉 리포트', reportDate, imageUrl })
    }
  }

  const sendResults = await Promise.allSettled(
    sendJobs.map((job) =>
      messageService.send(buildKakaoMessage({ ...config, ...job })),
    ),
  )

  const sentReportIds = new Set<string>()
  const failedReportIds = new Set<string>()
  sendResults.forEach((result, i) => {
    const { reportId } = sendJobs[i]
    if (result.status === 'fulfilled') sentReportIds.add(reportId)
    else if (!sentReportIds.has(reportId)) failedReportIds.add(reportId)
  })
  for (const reportId of uploadFailedReportIds) {
    if (!sentReportIds.has(reportId)) failedReportIds.add(reportId)
  }

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
