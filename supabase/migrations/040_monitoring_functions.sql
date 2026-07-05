-- 현재 DB 연결 수 조회 (pg_stat_activity 기반)
CREATE OR REPLACE FUNCTION public.monitoring_connection_count()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total',  count(*)::int,
    'active', count(*) FILTER (WHERE state = 'active')::int,
    'idle',   count(*) FILTER (WHERE state = 'idle')::int,
    'waiting',count(*) FILTER (WHERE wait_event_type IS NOT NULL AND state = 'active')::int
  )
  FROM pg_stat_activity
  WHERE datname = current_database()
    AND pid <> pg_backend_pid();
$$;

-- 느린 쿼리 목록 (pg_stat_statements 확장이 있을 때만 반환)
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
      LEFT(s.query, 120)::text        AS query,
      s.calls,
      ROUND(s.mean_exec_time::numeric, 1)::float8  AS mean_ms,
      ROUND(s.total_exec_time::numeric, 1)::float8 AS total_ms,
      CASE WHEN s.calls > 0
        THEN ROUND((s.rows::numeric / s.calls), 1)::float8
        ELSE 0
      END AS rows_per_call
    FROM pg_stat_statements s
    WHERE s.calls >= 5
      AND s.query NOT ILIKE '%pg_stat%'
      AND s.query NOT ILIKE '%monitoring%'
      AND s.query NOT ILIKE 'BEGIN%'
      AND s.query NOT ILIKE 'COMMIT%'
      AND s.query NOT ILIKE 'SET %'
    ORDER BY s.mean_exec_time DESC
    LIMIT 10;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.monitoring_connection_count() TO service_role;
GRANT EXECUTE ON FUNCTION public.monitoring_slow_queries()      TO service_role;
