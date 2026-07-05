import { createClient } from '@supabase/supabase-js'

/**
 * Playwright 전체 테스트 완료 후 실행
 * E2E 테스트가 생성한 테스트 데이터(분반 등)를 모두 정리
 */
export default async function globalTeardown() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY

  if (!url || !key) {
    console.log('[teardown] 환경변수 없음 — 테스트 데이터 정리 건너뜀')
    return
  }

  const admin = createClient(url, key, {
    auth: { persistSession: false },
  })

  // E2E 테스트로 생성된 분반 삭제 (이름이 'E2E테스트반-'으로 시작)
  // 테스트 분반은 학생 없이 생성되므로 바로 삭제 가능
  const { data: testClasses, error: fetchErr } = await admin
    .from('class_groups')
    .select('id, name')
    .like('name', 'E2E테스트반-%')

  if (fetchErr) {
    console.error('[teardown] 분반 조회 실패:', fetchErr.message)
    return
  }

  if (!testClasses || testClasses.length === 0) {
    console.log('[teardown] 정리할 E2E 테스트 분반 없음')
    return
  }

  const ids = testClasses.map((c) => c.id)
  const { error: deleteErr } = await admin
    .from('class_groups')
    .delete()
    .in('id', ids)

  if (deleteErr) {
    console.error('[teardown] 분반 삭제 실패:', deleteErr.message)
    // 삭제 실패 시 비활성화로 fallback (foreign key 제약 등)
    await admin
      .from('class_groups')
      .update({ is_active: false })
      .in('id', ids)
    console.log('[teardown] 삭제 실패 — is_active=false 로 비활성화 처리')
  } else {
    console.log(`[teardown] E2E 테스트 분반 ${testClasses.length}개 삭제 완료:`, testClasses.map((c) => c.name))
  }
}
