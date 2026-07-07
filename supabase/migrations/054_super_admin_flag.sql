-- 054_super_admin_flag.sql
-- 선생님(teacher) 중 "관리자" — role 자체는 여전히 teacher로 유지하고 (기존 권한 체크·RLS 전부 그대로 적용),
-- 이 플래그만 추가로 확인해서 (1) 다른 선생님 계정 관리/삭제, (2) "관리자" 라벨 표시에 사용한다.
-- 새 role 값을 추가하지 않는 이유: role에 걸린 CHECK 제약과 대부분 테이블의 RLS 정책이
-- role IN ('teacher', ...) 형태로 하드코딩돼 있어, 새 role을 추가하면 그 정책들을 전부 손봐야 한다.
-- 관리자는 "선생님과 거의 동일 + 선생님 계정 관리 권한"이므로 플래그가 훨씬 안전하다.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.is_super_admin IS
  '선생님(teacher) 중 관리자 권한 보유자. 다른 선생님 계정 조회/삭제 가능, 화면에 "관리자"로 표시. role 자체는 변하지 않음(teacher 유지) — 최초 지정은 DB에서 수동으로.';
