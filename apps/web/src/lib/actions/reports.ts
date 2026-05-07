'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/logger'
import type { Json } from '@/types/supabase'

export type ReportContent = {
  studyContent: string
  homework: string
  announcement: string
  notes: string
  todayAttendance: 'present' | 'late' | 'absent' | null
  recentScore: {
    score: number
    title: string
    examType: string
    date: string
    totalQ?: number
    objQ?: number
    subjQ?: number
    difficulty?: string
    classAverage?: number
  } | null
  avgAssignmentPct: number
  absenceReason?: string
  lastAssignmentTitle?: string
}

async function assertStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: '인증이 필요합니다.' }
  const role = user.user_metadata?.role as string | undefined
  if (role !== 'teacher' && role !== 'ta') return { ok: false as const, error: '권한이 없습니다.' }
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
  if (role !== 'teacher' && role !== 'ta') return { error: '권한이 없습니다.' }

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
      content_json:       data.contentJson as unknown as Json,
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
        content_json:       item.contentJson as unknown as Json,
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

  const { data: report } = await supabase
    .from('reports')
    .select('id, student_id, image_url, report_date, student:users!student_id(name)')
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

  let sentCount = 0
  const errors: string[] = []

  for (const link of parentLinks) {
    const lr     = link as Record<string, unknown>
    const parent = lr.parent as { phone?: string; name?: string } | null
    if (!parent?.phone) continue

    const phone = parent.phone.replace(/-/g, '')

    try {
      const res = await fetch('https://kapi.kakao.com/v1/api/talk/friends/message/send', {
        method: 'POST',
        headers: {
          Authorization:  `KakaoAK ${apiKey}`,
          'Content-Type': 'application/json',
        },
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
      })

      if (res.ok) {
        sentCount++
      } else {
        const err = await res.json().catch(() => ({}))
        errors.push((err as { msg?: string }).msg ?? `${res.status}`)
      }
    } catch {
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

  let totalSent = 0
  let totalFailed = 0
  const now = new Date().toISOString()

  for (const report of reports) {
    const r = report as Record<string, unknown>
    if (!r.image_url) { totalFailed++; continue }

    const { data: parentLinks } = await admin
      .from('parent_links')
      .select('parent_id, parent:users!parent_id(phone)')
      .eq('student_id', r.student_id as string)

    if (!parentLinks?.length) { totalFailed++; continue }

    const studentName = ((r.student as { name?: string } | null)?.name ?? '학생') as string
    const imageUrl    = r.image_url as string
    const reportDate  = r.report_date as string
    let reportSent = false

    for (const link of parentLinks) {
      const lr     = link as Record<string, unknown>
      const parent = lr.parent as { phone?: string } | null
      if (!parent?.phone) continue

      const phone = parent.phone.replace(/-/g, '')

      try {
        const res = await fetch('https://kapi.kakao.com/v1/api/talk/friends/message/send', {
          method: 'POST',
          headers: {
            Authorization:  `KakaoAK ${apiKey}`,
            'Content-Type': 'application/json',
          },
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
        })
        if (res.ok) reportSent = true
      } catch { /* skip */ }
    }

    if (reportSent) {
      totalSent++
      await admin.from('reports').update({ kakao_sent_at: now }).eq('id', r.id as string)
    } else {
      totalFailed++
    }
  }

  revalidatePath('/admin/reports')
  revalidatePath(`/admin/reports/session/${classId}/${date}`)
  return { sent: totalSent, failed: totalFailed }
}
