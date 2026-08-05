import { createClient } from '@/lib/supabase/server'

// 휴원 여부 공용 판정 — 학생 대시보드 레이아웃 배너, 질문 등록 페이지, 질문 등록 액션에서 공용으로 사용.
export async function checkSuspension(userId: string): Promise<{ suspended: boolean; until: string | null }> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from('users')
    .select('suspended_from, suspended_until')
    .eq('id', userId)
    .single()

  const today = new Date().toISOString().slice(0, 10)
  const from = data?.suspended_from as string | null
  const until = data?.suspended_until as string | null
  const suspended = !!(from && until && from <= today && today <= until)
  return { suspended, until }
}
