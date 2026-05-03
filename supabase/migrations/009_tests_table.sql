-- =============================================================
-- 009: tests 테이블 신설 + assignments/test_scores created_at 추가
-- =============================================================

-- 1. assignments 에 created_at 추가 (목록 정렬용)
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_assignments_created_at
  ON public.assignments(created_at DESC);

-- 2. tests 테이블 (테스트 이벤트 단위로 관리)
CREATE TABLE IF NOT EXISTS public.tests (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id    uuid         NOT NULL REFERENCES public.class_groups(id) ON DELETE CASCADE,
  title       text         NOT NULL,
  exam_type   text         NOT NULL DEFAULT '일반'
                           CHECK (exam_type IN ('일반', '모의고사', '중간고사', '기말고사', '기타')),
  test_date   date         NOT NULL,
  total_q     integer,
  obj_q       integer,
  subj_q      integer,
  difficulty  text,
  max_score   numeric(5,2) NOT NULL DEFAULT 100,
  grade_cuts  jsonb,       -- {"1":96,"2":88,...,"9":0} — 등급별 최저 점수
  created_at  timestamptz  NOT NULL DEFAULT now(),
  created_by  uuid         REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE  public.tests            IS '테스트/시험 이벤트';
COMMENT ON COLUMN public.tests.exam_type  IS '일반/모의고사/중간고사/기말고사/기타';
COMMENT ON COLUMN public.tests.grade_cuts IS '{"1":96,"2":88,...} 등급별 최저 컷 점수';

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_tests_class_date
  ON public.tests(class_id, test_date DESC);

-- 3. test_scores 에 test_id + created_at 추가
ALTER TABLE public.test_scores
  ADD COLUMN IF NOT EXISTS test_id    uuid REFERENCES public.tests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_test_scores_test_id
  ON public.test_scores(test_id);

-- 4. RLS 정책 (tests)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tests' AND policyname = 'staff can manage tests'
  ) THEN
    CREATE POLICY "staff can manage tests"
      ON public.tests
      USING (get_my_role() IN ('teacher', 'ta'))
      WITH CHECK (get_my_role() IN ('teacher', 'ta'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tests' AND policyname = 'students can read their class tests'
  ) THEN
    CREATE POLICY "students can read their class tests"
      ON public.tests FOR SELECT
      USING (
        get_my_role() = 'student'
        AND i_am_in_class(class_id)
      );
  END IF;
END
$$;

-- 5. 권한 부여
GRANT ALL ON public.tests TO authenticated;
GRANT ALL ON public.tests TO service_role;
