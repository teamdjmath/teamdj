-- 순수 연결 왕복 시간 측정 (SELECT 1 -- 테이블 스캔 없음)
CREATE OR REPLACE FUNCTION public.monitoring_ping()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$ SELECT 1 $$;

-- 앱 쿼리 전용 슬로우 쿼리 함수 (Supabase 내부 시스템 쿼리 완전 제외)
CREATE OR REPLACE FUNCTION public.monitoring_slow_queries()
RETURNS TABLE(
  query        text,
  calls        bigint,
  mean_ms      float8,
  total_ms     float8,
  rows_per_call float8
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
    RETURN QUERY
    SELECT
      LEFT(s.query, 200)::text                              AS query,
      s.calls,
      ROUND(s.mean_exec_time::numeric, 1)::float8           AS mean_ms,
      ROUND(s.total_exec_time::numeric, 1)::float8          AS total_ms,
      CASE WHEN s.calls > 0
        THEN ROUND((s.rows::numeric / s.calls), 1)::float8
        ELSE 0
      END                                                   AS rows_per_call
    FROM pg_stat_statements s
    WHERE
      s.calls >= 3

      -- 앱 테이블 화이트리스트: \m = 단어 시작, \M = 단어 끝 (PostgreSQL POSIX 정규식)
      AND s.query ~* '\m(users|attendance_logs|lectures|lecture_class_access|course_materials|assignments|assignment_progress|assignment_categories|tests|test_scores|exam_results|qna_questions|qna_answers|reports|notices|notifications|student_todos|push_messages|class_groups|class_members|textbooks|consultations|parent_links|schedules|extra_schedules|staff_status)\M'

      -- 시스템 / 내부 쿼리 제외
      AND s.query NOT ILIKE 'do $%'
      AND s.query NOT ILIKE 'create %'
      AND s.query NOT ILIKE 'alter %'
      AND s.query NOT ILIKE 'drop %'
      AND s.query NOT ILIKE 'grant %'
      AND s.query NOT ILIKE 'comment on%'
      AND s.query NOT ILIKE '%pg_stat%'
      AND s.query NOT ILIKE '%pg_constraint%'
      AND s.query NOT ILIKE '%pg_namespace%'
      AND s.query NOT ILIKE '%pg_type%'
      AND s.query NOT ILIKE '%pg_class%'
      AND s.query NOT ILIKE '%pg_attribute%'
      AND s.query NOT ILIKE '%pg_proc%'
      AND s.query NOT ILIKE '%pg_index%'
      AND s.query NOT ILIKE '%::regclass%'
      AND s.query NOT ILIKE '%::oid%'
      AND s.query NOT ILIKE '%realtime.%'
      AND s.query NOT ILIKE '%storage.%'
      AND s.query NOT ILIKE '%supabase_%'
      AND s.query NOT ILIKE '%_pgsodium%'
      AND s.query NOT ILIKE '%vault.%'
      AND s.query NOT ILIKE '%WITH RECURSIVE%'
      AND s.query NOT ILIKE '%information_schema%'
      AND s.query NOT ILIKE 'BEGIN%'
      AND s.query NOT ILIKE 'COMMIT%'
      AND s.query NOT ILIKE 'ROLLBACK%'
      AND s.query NOT ILIKE 'SET %'
      AND s.query NOT ILIKE 'SHOW %'
      AND s.query NOT ILIKE '%monitoring%'

    ORDER BY s.mean_exec_time DESC
    LIMIT 10;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.monitoring_ping()         TO service_role;
GRANT EXECUTE ON FUNCTION public.monitoring_slow_queries() TO service_role;
