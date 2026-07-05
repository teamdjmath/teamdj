-- 052_error_logs.sql
-- 웹 전반의 오류 수집 테이블 — 클라이언트(브라우저)/서버(액션·API) 오류를 한곳에 모은다.
-- 개발자 유입 경로: Slack 알림(즉시) + /admin/errors 페이지(조회)

CREATE TABLE IF NOT EXISTS public.error_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  source     text        NOT NULL DEFAULT 'server',   -- client | server | boundary
  severity   text        NOT NULL DEFAULT 'error',    -- warn | error
  category   text        NOT NULL DEFAULT 'unknown',  -- auth | permission | validation | db | network | unknown
  message    text        NOT NULL,
  digest     text        NOT NULL DEFAULT '',          -- Next.js error digest (사용자 안내 코드)
  url        text        NOT NULL DEFAULT '',
  user_id    uuid,                                     -- FK 없음: 사용자 삭제 후에도 로그 보존
  user_role  text        NOT NULL DEFAULT '',
  user_agent text        NOT NULL DEFAULT '',
  context    jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_logs_category   ON public.error_logs (category, created_at DESC);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

-- 조회는 teacher만. 쓰기는 service_role(서버)만 — authenticated INSERT 정책 없음
CREATE POLICY "error_logs: teacher만 조회"
  ON public.error_logs FOR SELECT USING (get_my_role() = 'teacher');

-- 보존 정책: 오류 로그는 1개월 (감사 로그 3개월보다 짧게 — volume이 큼)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule(
    'purge-error-logs',
    '30 19 * * *',
    $sql$ DELETE FROM public.error_logs WHERE created_at < now() - interval '1 month' $sql$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable — error log purge falls back to lazy cleanup in app';
END $$;

GRANT ALL ON public.error_logs TO authenticated, service_role;
