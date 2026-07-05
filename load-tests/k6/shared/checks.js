import { check } from 'k6'
import { Trend, Rate } from 'k6/metrics'

export const responseTime = new Trend('custom_response_time', true)
export const errorRate = new Rate('custom_error_rate')

/** 응답 체크 + 메트릭 기록 */
export function checkResponse(res, name, expectedStatus = 200) {
  const ok = check(res, {
    [`${name}: status ${expectedStatus}`]: (r) => r.status === expectedStatus,
    [`${name}: response < 3s`]: (r) => r.timings.duration < 3000,
  })

  responseTime.add(res.timings.duration, { endpoint: name })
  errorRate.add(!ok)
  return ok
}
