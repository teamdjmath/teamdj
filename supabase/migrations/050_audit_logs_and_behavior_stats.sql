-- 050_audit_logs_and_behavior_stats.sql
-- 1) /admin/audit  : 감사 로그 테이블 (책임 추적 — actor + action + target + 시각)
-- 2) /admin/monitoring : 행동 지표 집계 함수 (ms 추적 대체)

-- ============================================================
-- 1. audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id     uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  actor_name   text        NOT NULL DEFAULT '',   -- 계정 삭제 후에도 이름 보존
  actor_role   text        NOT NULL DEFAULT '',
  action       text        NOT NULL,              -- 예: student.create, report.delete
  target_type  text        NOT NULL DEFAULT '',   -- 예: student, report, message
  target_id    text        NOT NULL DEFAULT '',
  target_label text        NOT NULL DEFAULT '',   -- 사람이 읽는 대상 이름 (예: 학생 이름)
  detail       jsonb,                             -- 추가 컨텍스트
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor      ON public.audit_logs (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON public.audit_logs (action, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 조회는 teacher(원장)만. INSERT는 service_role(서버 액션)만 — authenticated 정책 없음
CREATE POLICY "audit_logs: teacher만 조회"
  ON public.audit_logs FOR SELECT USING (get_my_role() = 'teacher');

-- ============================================================
-- 2. 행동 지표 집계 함수 (모니터링용)
-- ============================================================
CREATE OR REPLACE FUNCTION public.monitoring_behavior_stats()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(

    -- 출석체크 사용 빈도: 최근 14일 일별 기록 수
    'attendance_daily', (
      SELECT COALESCE(json_agg(row_to_json(t) ORDER BY t.day), '[]'::json)
      FROM (
        SELECT session_date::text AS day, count(*)::int AS count
        FROM public.attendance_logs
        WHERE session_date >= current_date - interval '14 days'
        GROUP BY session_date
      ) t
    ),

    -- Q&A 참여도: 최근 14일 일별 질문/답변 수
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

    -- 과제 제출율 트렌드: 최근 8주 주별 평균 이행률
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

    -- 학습 리포트 알림율: 최근 30일 생성 대비 카카오 발송 비율
    'report_kakao', (
      SELECT json_build_object(
        'total', count(*)::int,
        'sent',  count(*) FILTER (WHERE kakao_sent_at IS NOT NULL)::int
      )
      FROM public.reports
      WHERE created_at >= current_date - interval '30 days'
    ),

    -- 공지 발행 빈도: 최근 30일 공지 수 (조회수 컬럼 없음 → 발행 수로 집계)
    'notices_30d', (
      SELECT count(*)::int
      FROM public.notices
      WHERE created_at >= current_date - interval '30 days'
    ),

    -- 로그인 활동: 최근 7일 auth 감사 로그 기반 (login 성공 횟수)
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

GRANT ALL ON public.audit_logs TO authenticated, service_role;
