'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export type ReportContent = {
  studyContent: string
  homework: string
  notes: string
  announcement: string
  recentScores: Array<{
    date: string
    score: number
    total_q: number | null
    difficulty: string | null
  }>
  attendanceSummary: {
    present: number
    absent: number
    late: number
    total: number
  }
  avgAssignmentPct: number
}

// ── 리포트 저장 (이미지 base64 포함 → Storage 업로드 후 DB 저장)
export async function saveReport(data: {
  classId: string
  studentId: string
  reportDate: string
  contentJson: ReportContent
  imageBase64: string // data:image/png;base64,...
}): Promise<{ error?: string; id?: string; imageUrl?: string }> {
  const supabase = await createClient()
  const admin = createAdminClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '인증이 필요합니다.' }

  // base64 → Buffer
  const b64 = data.imageBase64.replace(/^data:image\/png;base64,/, '')
  const buffer = Buffer.from(b64, 'base64')
  const filePath = `${data.studentId}/${data.reportDate}_${Date.now()}.png`

  const { error: uploadError } = await admin.storage
    .from('reports')
    .upload(filePath, buffer, { contentType: 'image/png', upsert: true })

  if (uploadError) {
    return { error: `이미지 업로드 실패: ${uploadError.message}` }
  }

  const { data: { publicUrl } } = admin.storage
    .from('reports')
    .getPublicUrl(filePath)

  const { data: report, error: reportError } = await supabase
    .from('reports')
    .insert({
      class_id: data.classId,
      student_id: data.studentId,
      report_date: data.reportDate,
      content_json: data.contentJson as unknown as Record<string, unknown>,
      image_url: publicUrl,
    })
    .select('id')
    .single()

  if (reportError) return { error: '리포트 저장에 실패했습니다.' }

  revalidatePath('/admin/reports')
  return { id: report.id as string, imageUrl: publicUrl }
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
  const imageUrl = r.image_url as string
  const reportDate = r.report_date as string

  let sentCount = 0
  const errors: string[] = []

  for (const link of parentLinks) {
    const lr = link as Record<string, unknown>
    const parent = lr.parent as { phone?: string; name?: string } | null
    if (!parent?.phone) continue

    const phone = parent.phone.replace(/-/g, '')

    try {
      const res = await fetch(
        'https://kapi.kakao.com/v1/api/talk/friends/message/send',
        {
          method: 'POST',
          headers: {
            Authorization: `KakaoAK ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            receiver_type: 'phone',
            receiver_phone: phone,
            template_object: {
              object_type: 'feed',
              content: {
                title: `[TeamDJ] ${studentName} 학습 리포트`,
                description: `${reportDate} 수업 학습 리포트입니다.`,
                image_url: imageUrl,
                link: { web_url: imageUrl, mobile_web_url: imageUrl },
              },
              buttons: [
                {
                  title: '리포트 보기',
                  link: { web_url: imageUrl, mobile_web_url: imageUrl },
                },
              ],
            },
          }),
        },
      )

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
