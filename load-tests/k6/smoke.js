/**
 * Smoke Test — 1 VU, 30초
 * 목적: 배포 직후 기본 엔드포인트가 살아있는지 확인
 * 실행: k6 run smoke.js -e BASE_URL=https://teamdj.kr -e SUPABASE_URL=... -e SUPABASE_ANON_KEY=...
 *        -e STAFF_EMAIL=... -e STAFF_PASSWORD=...
 */

import http from 'k6/http'
import { sleep } from 'k6'
import { login, authHeaders } from './shared/auth.js'
import { checkResponse } from './shared/checks.js'

const BASE_URL = __ENV.BASE_URL

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],         // 에러율 1% 미만
    http_req_duration: ['p(95)<3000'],      // 95%tile < 3s
  },
}

export function setup() {
  const token = login(__ENV.STAFF_EMAIL, __ENV.STAFF_PASSWORD)
  if (!token) throw new Error('로그인 실패 — 이메일/비밀번호 확인')
  return { token }
}

export default function ({ token }) {
  const h = authHeaders(token)

  // 1. 공개 랜딩 페이지
  checkResponse(http.get(`${BASE_URL}/`, { tags: { name: 'landing' } }), 'landing')

  sleep(1)

  // 2. 헬스 API
  checkResponse(http.get(`${BASE_URL}/api/health`, { headers: h, tags: { name: 'health_api' } }), 'health_api')

  sleep(1)

  // 3. 어드민 대시보드 (서버 사이드 렌더링)
  checkResponse(http.get(`${BASE_URL}/admin/dashboard`, { headers: h, tags: { name: 'admin_dashboard' } }), 'admin_dashboard')

  sleep(2)
}
