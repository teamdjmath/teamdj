# TeamDJ 부하 테스트

k6 기반 부하 테스트. [k6 설치](https://k6.io/docs/get-started/installation/) 후 실행.

## 공통 환경변수

| 변수 | 설명 |
|------|------|
| `BASE_URL` | 앱 URL (예: `https://teamdj.kr`) |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `STAFF_EMAIL` | 강사/TA 계정 이메일 |
| `STAFF_PASSWORD` | 강사/TA 계정 비밀번호 |
| `STUDENT_EMAIL` | 학생 계정 이메일 |
| `STUDENT_PASSWORD` | 학생 계정 비밀번호 |

## 시나리오

### 1. Smoke Test (배포 직후 기본 확인)
```bash
k6 run k6/smoke.js \
  -e BASE_URL=https://teamdj.kr \
  -e SUPABASE_URL=https://xxxx.supabase.co \
  -e SUPABASE_ANON_KEY=eyJ... \
  -e STAFF_EMAIL=teacher@example.com \
  -e STAFF_PASSWORD=비밀번호
```
- VU: 1, 시간: 30초
- 랜딩 + 헬스 API + 어드민 대시보드 순차 확인

### 2. Load Test (정상 트래픽 — 수업 시간 시뮬레이션)
```bash
k6 run k6/load.js \
  -e BASE_URL=https://teamdj.kr \
  -e SUPABASE_URL=https://xxxx.supabase.co \
  -e SUPABASE_ANON_KEY=eyJ... \
  -e STAFF_EMAIL=teacher@example.com \
  -e STAFF_PASSWORD=비밀번호 \
  -e STUDENT_EMAIL=student@example.com \
  -e STUDENT_PASSWORD=비밀번호
```
- 강사 3 VU + 학생 최대 20 VU (ramping)
- 총 3분 (1분 증가 → 1분 유지 → 1분 감소)

### 3. Rate Limit 검증
```bash
k6 run k6/rate-limit.js \
  -e BASE_URL=https://teamdj.kr
```
- 인증 없이 70회 빠르게 요청
- 60회 초과 시 429 응답 확인 (middleware 동작 검증)

## 판독 기준

| 지표 | 목표 |
|------|------|
| `http_req_duration p(95)` | < 3000ms |
| `http_req_failed` | < 5% |
| `rate_limit_blocked` | > 0 (rate-limit 테스트 시) |
