import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { filterTestNamed } from '@/lib/test-data'

export type ClassOption = {
  id: string
  name: string
  subject: string
  grade: string
}

// 출석·리포트·과제·점수 페이지가 각자 조회하던 분반 목록을 하나로 통일.
// classes.ts의 createClass/updateClass/deleteClass/hardDeleteClass에서 revalidateTag('classes')로 무효화.
// revalidate(TTL)도 안전망으로 둔다 — 시드 스크립트처럼 앱 액션을 거치지 않고 DB에 직접
// class_groups를 넣는 경우 태그 무효화가 안 타서 캐시가 영영 안 갱신되는 문제가 있었음.
export const getActiveClassOptions = unstable_cache(
  async (): Promise<ClassOption[]> => {
    const admin = createAdminClient()
    const { data } = await admin
      .from('class_groups')
      .select('id, name, subject, grade')
      .eq('is_active', true)
      .order('name')
    return (data ?? []) as ClassOption[]
  },
  ['active-class-options'],
  { tags: ['classes'], revalidate: 60 },
)

// 화면 표시용 — 이름에 test/테스트가 들어간 분반은 관리자(is_super_admin)에게만 보인다.
// 캐시는 역할 무관하게 전체를 담고, 요청별로 필터만 적용.
export async function getVisibleClassOptions(): Promise<ClassOption[]> {
  return filterTestNamed(await getActiveClassOptions())
}
