-- 051_audit_logs_retention.sql
-- 감사 로그 보존 정책: 3개월 경과분 자동 삭제
-- 1순위: pg_cron (Supabase에서 지원) — 매일 KST 새벽 4시(UTC 19시) 실행
-- pg_cron을 못 쓰는 환경이면 /admin/audit 페이지 진입 시 lazy 정리로 대체됨 (앱 코드)

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule(
    'purge-audit-logs',
    '0 19 * * *',
    $sql$ DELETE FROM public.audit_logs WHERE created_at < now() - interval '3 months' $sql$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable — audit purge falls back to lazy cleanup in app';
END $$;
