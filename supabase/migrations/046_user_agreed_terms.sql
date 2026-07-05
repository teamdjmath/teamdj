-- 이용약관·개인정보처리방침 동의 일시 기록
-- middleware는 user_metadata를 체크 (DB 쿼리 없음),
-- 이 컬럼은 감사 목적으로 보존
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS agreed_terms_at timestamptz;

GRANT ALL ON public.users TO authenticated, service_role;
