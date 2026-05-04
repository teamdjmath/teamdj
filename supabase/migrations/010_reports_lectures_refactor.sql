-- =============================================================
-- 010: 강의 강좌 구조 + 리포트 분반 단위 개편
-- =============================================================

-- ── 1. lectures.course_name 추가
ALTER TABLE public.lectures
  ADD COLUMN IF NOT EXISTS course_name text;

CREATE INDEX IF NOT EXISTS idx_lectures_course_name
  ON public.lectures(course_name);

-- ── 2. lecture_class_access — 강좌별 접근 허용 분반
CREATE TABLE IF NOT EXISTS public.lecture_class_access (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name text NOT NULL,
  class_id    uuid REFERENCES public.class_groups(id) ON DELETE CASCADE,
  UNIQUE (course_name, class_id)
);

COMMENT ON TABLE  public.lecture_class_access             IS '강좌별 접근 가능한 분반 목록';
COMMENT ON COLUMN public.lecture_class_access.course_name IS '강좌명 (lectures.course_name 과 동일)';
COMMENT ON COLUMN public.lecture_class_access.class_id    IS 'NULL 이면 전체 분반 허용';

ALTER TABLE public.lecture_class_access ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lecture_class_access'
      AND policyname = 'staff manage lecture access'
  ) THEN
    CREATE POLICY "staff manage lecture access"
      ON public.lecture_class_access
      USING (get_my_role() IN ('teacher', 'ta'))
      WITH CHECK (get_my_role() IN ('teacher', 'ta'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'lecture_class_access'
      AND policyname = 'students read lecture access'
  ) THEN
    CREATE POLICY "students read lecture access"
      ON public.lecture_class_access FOR SELECT
      USING (
        get_my_role() IN ('teacher', 'ta')
        OR (
          get_my_role() = 'student'
          AND (class_id IS NULL OR i_am_in_class(class_id))
        )
      );
  END IF;
END
$$;

GRANT ALL ON public.lecture_class_access TO authenticated;
GRANT ALL ON public.lecture_class_access TO service_role;

-- ── 3. reports: class_session_date 추가 + student_id nullable
ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS class_session_date date;

-- student_id를 nullable로 (기존 NOT NULL 제약 제거)
ALTER TABLE public.reports
  ALTER COLUMN student_id DROP NOT NULL;
