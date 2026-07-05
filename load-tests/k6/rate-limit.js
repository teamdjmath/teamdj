/**
 * Rate Limit 검증 테스트
 * 목적: middleware.ts의 60 req/min 차단이 실제로 동작하는지 확인
 *
 * 실행: k6 run rate-limit.js -e BASE_URL=https://teamdj.kr
 *
 * 예상 결과:
 *  - 처음 60개 요청: 200
 *  - 이후 요청: 429 (Too Many Requests)
 *  - 1분 후: 다시 200 허용
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Counter } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL

const blocked    = new Counter('rate_limit_blocked')
const allowed    = new Counter('rate_limit_allowed')

export const options = {
  // 단일 IP에서 70회 빠르게 요청 → 60회 초과 시 차단 확인
  vus: 1,
  iterations: 70,
  thresholds: {
    // 70개 중 적어도 1개는 429여야 함 (rate limit 작동 확인)
    rate_limit_blocked: ['count>0'],
  },
}

export default function () {
  // /api/health 는 공개 엔드포인트이므로 인증 없이 테스트 가능
  // 단, 미들웨어 matcher에 /api/* 가 포함되어 있어 rate limit 적용됨
  const res = http.get(`${BASE_URL}/api/health`, {
    tags: { name: 'rate_limit_test' },
  })

  if (res.status === 429) {
    blocked.add(1)
    check(res, {
      'rate limit 429: Retry-After 헤더 있음': (r) =>
        r.headers['Retry-After'] !== undefined,
      'rate limit 429: 에러 메시지 포함': (r) =>
        r.body.includes('Too Many Requests'),
    })
  } else {
    allowed.add(1)
  }

  // 딜레이 없이 빠르게 — 1분 내 60회 초과가 목적
  sleep(0.5)
}
