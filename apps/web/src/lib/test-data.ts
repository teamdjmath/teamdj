import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getVerifiedUser } from '@/lib/supabase/verified-user'

// 이름에 test/테스트가 들어간 스태프 계정·분반은 내부 검증용 데이터 —
// 관리자(is_super_admin)에게만 보이고 일반 스태프 화면에서는 숨긴다.
// 주의: CI의 E2E 계정(test)은 is_super_admin=true여야 E2E 분반 생성 검증이 통과함.

const TEST_NAME_RE = /test|테스트/i

export function isTestName(name: string): boolean {
  return TEST_NAME_RE.test(name)
}

// 현재 요청의 사용자가 관리자(is_super_admin)인지 — 요청 내 중복 호출은 React cache로 1회만 조회
export const getViewerIsSuperAdmin = cache(async (): Promise<boolean> => {
  const user = await getVerifiedUser()
  if (!user) return false
  if ((user.user_metadata?.role as string | undefined) !== 'teacher') return false
  const admin = createAdminClient()
  const { data } = await admin
    .from('users').select('is_super_admin').eq('id', user.id).maybeSingle()
  return data?.is_super_admin ?? false
})

// 관리자가 아니면 테스트 이름 항목 제거
export async function filterTestNamed<T extends { name: string }>(rows: T[]): Promise<T[]> {
  if (await getViewerIsSuperAdmin()) return rows
  return rows.filter((r) => !isTestName(r.name))
}
