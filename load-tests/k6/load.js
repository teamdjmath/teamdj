/**
 * Load Test — 일반 트래픽 시뮬레이션
 * 실제 수업 시간대: 강사 1명 + 학생 30명 동시 접속 가정
 *
 * 시나리오:
 *  - staff_flow:   강사/TA — 출석 마킹, 리포트 조회 (10%)
 *  - student_flow: 학생   — 대시보드, 과제 확인 (90%)
 *
 * 실행:
 *   k6 run load.js \
 *     -e BASE_URL=https://teamdj.kr \
 *     -e SUPABASE_URL=https://xxxx.supabase.co \
 *     -e SUPABASE_ANON_KEY=eyJ... \
 *     -e STAFF_EMAIL=teacher@example.com \
 *     -e STAFF_PASSWORD=... \
 *     -e STUDENT_EMAIL=student@example.com \
 *     -e STUDENT_PASSWORD=...
 */

import http from 'k6/http'
import { sleep } from 'k6'
import { login, authHeaders } from './shared/auth.js'
import { checkResponse } from './shared/checks.js'

const BASE_URL = __ENV.BASE_URL

export const options = {
  scenarios: {
    staff_flow: {
      executor: 'constant-vus',
      vus: 3,
      duration: '3m',
      exec: 'staffFlow',
      tags: { role: 'staff' },
    },
    student_flow: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '1m', target: 20 },   // 수업 시작 — 학생 접속 증가
        { duration: '1m', target: 20 },   // 수업 중 — 안정
        { duration: '1m', target: 0 },    // 수업 종료 — 이탈
      ],
      exec: 'studentFlow',
      tags: { role: 'student' },
    },
  },
  thresholds: {
    http_req_failed:                  ['rate<0.05'],    // 에러율 5% 미만
    'http_req_duration{role:staff}':  ['p(95)<2000'],  // 강사 95%tile < 2s
    'http_req_duration{role:student}':['p(95)<3000'],  // 학생 95%tile < 3s
    custom_error_rate:                ['rate<0.05'],
  },
}

export function setup() {
  const staffToken   = login(__ENV.STAFF_EMAIL,   __ENV.STAFF_PASSWORD)
  const studentToken = login(__ENV.STUDENT_EMAIL, __ENV.STUDENT_PASSWORD)
  if (!staffToken)   throw new Error('강사 로그인 실패')
  if (!studentToken) throw new Error('학생 로그인 실패')
  return { staffToken, studentToken }
}

export function staffFlow({ staffToken }) {
  const h = authHeaders(staffToken)

  // 출석 관리 페이지
  checkResponse(
    http.get(`${BASE_URL}/admin/attendance`, { headers: h, tags: { name: 'attendance_page' } }),
    'attendance_page'
  )
  sleep(2)

  // 학습 리포트 목록
  checkResponse(
    http.get(`${BASE_URL}/admin/reports`, { headers: h, tags: { name: 'reports_page' } }),
    'reports_page'
  )
  sleep(3)

  // 공지사항 목록
  checkResponse(
    http.get(`${BASE_URL}/admin/notices`, { headers: h, tags: { name: 'notices_page' } }),
    'notices_page'
  )
  sleep(2)

  // 헬스 체크
  checkResponse(
    http.get(`${BASE_URL}/api/health`, { headers: h, tags: { name: 'health_api' } }),
    'health_api'
  )
  sleep(5)
}

export function studentFlow({ studentToken }) {
  const h = authHeaders(studentToken)

  // 학생 대시보드 (공개 진입점 — SSR 리다이렉트 없음)
  checkResponse(
    http.get(`${BASE_URL}/dashboard`, { headers: h, tags: { name: 'student_dashboard' } }),
    'student_dashboard'
  )
  sleep(3)

  // 과제 목록 — Supabase REST API 직접 호출
  // (SSR 페이지는 쿠키 세션 필요, k6는 Bearer만 지원하므로 API 레이어 직접 테스트)
  const supabaseUrl  = __ENV.SUPABASE_URL
  const supabaseAnon = __ENV.SUPABASE_ANON_KEY
  checkResponse(
    http.get(`${supabaseUrl}/rest/v1/assignments?select=id,title,due_date,week_num&limit=20`, {
      headers: {
        apikey:        supabaseAnon,
        Authorization: `Bearer ${studentToken}`,
        Accept:        'application/json',
      },
      tags: { name: 'student_assignments' },
    }),
    'student_assignments'
  )
  sleep(4)

  // Q&A 목록 — Supabase REST API 직접 호출
  checkResponse(
    http.get(`${supabaseUrl}/rest/v1/qna_questions?select=id,title,status,created_at&order=created_at.desc&limit=20`, {
      headers: {
        apikey:        supabaseAnon,
        Authorization: `Bearer ${studentToken}`,
        Accept:        'application/json',
      },
      tags: { name: 'student_qna' },
    }),
    'student_qna'
  )
  sleep(5)
}
