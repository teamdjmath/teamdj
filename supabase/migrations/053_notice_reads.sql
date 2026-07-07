-- 053_notice_reads.sql
-- 공지사항 열람 기록 — notices에 조회수 컬럼이 없어 모니터링이 발행 수로 대체하던 문제 해결

CREATE TABLE IF NOT EXISTS public.notice_reads (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  notice_id  uuid        NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
  student_id uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notice_id, student_id)
);

COMMENT ON TABLE public.notice_reads IS '학생별 공지사항 최초 열람 기록';

CREATE INDEX IF NOT EXISTS idx_notice_reads_notice ON public.notice_reads (notice_id);

ALTER TABLE public.notice_reads ENABLE ROW LEVEL SECURITY;

-- 본인 열람 기록만 등록 가능
CREATE POLICY "Students insert own notice reads"
  ON public.notice_reads FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = student_id);

-- 본인 열람 기록만 조회 가능
CREATE POLICY "Students read own notice reads"
  ON public.notice_reads FOR SELECT
  TO authenticated
  USING (auth.uid() = student_id);

-- teacher/ta_desk는 전체 열람 기록 조회 가능 (열람율 집계·상세 확인용)
CREATE POLICY "Staff read all notice reads"
  ON public.notice_reads FOR SELECT
  TO authenticated
  USING (get_my_role() IN ('teacher', 'ta_desk'));

GRANT ALL ON public.notice_reads TO authenticated, service_role;

-- 모니터링: 공지 발행 수 → 실제 열람율로 교체
CREATE OR REPLACE FUNCTION public.monitoring_behavior_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(

    'attendance_daily', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.day), '[]'::json)
      FROM (
        SELECT session_date::text AS day, count(*)::int AS count
        FROM public.attendance_logs
        WHERE session_date >= current_date - interval '14 days'
        GROUP BY session_date
      ) t
    ),

    'qna_daily', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.day), '[]'::json)
      FROM (
        SELECT
          d.day::text,
          COALESCE(q.cnt, 0)::int AS questions,
          COALESCE(a.cnt, 0)::int AS answers
        FROM generate_series(current_date - interval '13 days', current_date, '1 day') AS d(day)
        LEFT JOIN (
          SELECT created_at::date AS day, count(*) AS cnt
          FROM public.qna_questions
          WHERE created_at >= current_date - interval '14 days'
          GROUP BY 1
        ) q ON q.day = d.day::date
        LEFT JOIN (
          -- qna_answers는 created_at 대신 answered_at 사용
          SELECT answered_at::date AS day, count(*) AS cnt
          FROM public.qna_answers
          WHERE answered_at >= current_date - interval '14 days'
          GROUP BY 1
        ) a ON a.day = d.day::date
      ) t
    ),

    'assignment_weekly', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.week), '[]'::json)
      FROM (
        SELECT
          to_char(date_trunc('week', updated_at), 'MM/DD') AS week,
          round(avg(completion_pct))::int                  AS avg_pct,
          count(*)::int                                    AS entries
        FROM public.assignment_progress
        WHERE updated_at >= current_date - interval '8 weeks'
        GROUP BY date_trunc('week', updated_at)
      ) t
    ),

    'report_kakao', (
      SELECT json_build_object(
        'total', count(*)::int,
        'sent',  count(*) FILTER (WHERE kakao_sent_at IS NOT NULL)::int
      )
      FROM public.reports
      WHERE created_at >= current_date - interval '30 days'
    ),

    -- 공지 열람율: 최근 30일 발행 공지의 대상자 대비 실제 열람 비율 (notice_reads 기반)
    'notices_30d', (
      SELECT json_build_object(
        'total',     count(*)::int,
        'read_rate', CASE WHEN sum(t.audience) > 0
                       THEN round(100.0 * sum(t.reads) / sum(t.audience))::int
                       ELSE NULL END
      )
      FROM (
        SELECT
          n.id,
          COALESCE(nr.reads, 0) AS reads,
          CASE
            WHEN n.class_id IS NULL THEN (SELECT count(*) FROM public.users WHERE role = 'student')
            ELSE (SELECT count(*) FROM public.class_members cm WHERE cm.class_id = n.class_id AND cm.is_active)
          END AS audience
        FROM public.notices n
        LEFT JOIN (
          SELECT notice_id, count(*) AS reads
          FROM public.notice_reads
          GROUP BY notice_id
        ) nr ON nr.notice_id = n.id
        WHERE n.created_at >= current_date - interval '30 days'
      ) t
    ),

    'login_7d', (
      SELECT json_build_object(
        'success', count(*) FILTER (WHERE payload->>'action' = 'login')::int,
        'failed',  count(*) FILTER (WHERE payload->>'action' IN ('login_failed', 'user_repeated_signup'))::int
      )
      FROM auth.audit_log_entries
      WHERE created_at >= now() - interval '7 days'
    )

  );
$$;

GRANT EXECUTE ON FUNCTION public.monitoring_behavior_stats() TO service_role;
