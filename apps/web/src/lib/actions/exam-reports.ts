'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

async function assertStaff() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: '인증이 필요합니다.' }
  const role = user.user_metadata?.role as string | undefined
  if (!['teacher', 'ta_desk', 'ta_assistant'].includes(role ?? '')) return { ok: false as const, error: '권한이 없습니다.' }
  return { ok: true as const }
}

// content_json 스냅샷 — exam_results가 나중에 수정돼도 이 리포트는 생성 시점 값을 유지한다
export type ExamReportContent = {
  examName: string
  examType: string
  examDate: string
  score: number
  maxScore: number
  gradeCuts: Record<string, number>
  examGrade: string | null
  rankInExam: number | null
  totalInExam: number | null
  estimatedGrade: string | null
  estimatedPercentile: number | null
  studySuggestion: string | null
  studentName: string
  school: string
  studentGrade: string
  className: string
}

export async function saveExamReport(data: {
  studentId: string
  examResultId: string
  contentJson: ExamReportContent
  imageBase64: string
}): Promise<{ error?: string; imageUrl?: string }> {
  const check = await assertStaff()
  if (!check.ok) return { error: check.error }

  const admin = createAdminClient()

  const b64 = data.imageBase64.split(',')[1] || data.imageBase64
  const buffer = Buffer.from(b64, 'base64')
  const mimeMatch = data.imageBase64.match(/^data:(image\/\w+);base64,/)
  const contentType = mimeMatch ? mimeMatch[1] : 'image/png'
  const ext = contentType.split('/')[1] || 'png'
  // reports 버킷을 exam/ 하위 경로로 공유 — 별도 버킷 없이 기존 인프라 재사용
  const filePath = `exam/${data.studentId}/${data.examResultId}_${Date.now()}.${ext}`

  const { error: uploadError } = await admin.storage
    .from('reports')
    .upload(filePath, buffer, { contentType, upsert: true })
  if (uploadError) return { error: `이미지 업로드 실패: ${uploadError.message}` }

  const { data: { publicUrl } } = admin.storage.from('reports').getPublicUrl(filePath)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from('exam_reports')
    .upsert({
      student_id: data.studentId,
      exam_result_id: data.examResultId,
      content_json: data.contentJson,
      image_url: publicUrl,
    }, { onConflict: 'exam_result_id' })

  if (error) return { error: '레포트 저장에 실패했습니다. (마이그레이션 적용 여부를 확인하세요)' }

  revalidatePath('/admin/exam-results')
  revalidatePath('/dashboard/report')
  return { imageUrl: publicUrl }
}
