-- =============================================================
-- 062: 강의(영상) 단위 학생 개별 지급/차단
-- 기본 지급은 기존처럼 강좌 → 분반(lecture_class_access) 단위.
-- 차감 시스템 등으로 개별 학생이 달라지는 경우, 강좌 내 "특정 강의"
-- 단위로 예외를 기록한다. (예: 2020 기출 강좌 중 5강만 차단)
--   grant : 분반 미지급이어도 이 학생에게 이 강의 열람 허용
--   block : 분반 지급이어도 이 학생은 이 강의 차단 (차감)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.lecture_student_access (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  lecture_id  uuid        NOT NULL REFERENCES public.lectures(id) ON DELETE CASCADE,
  student_id  uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  mode        text        NOT NULL CHECK (mode IN ('grant', 'block')),
  created_at  timestamptz DEFAULT now(),
  UNIQUE (lecture_id, student_id)
);

COMMENT ON TABLE  public.lecture_student_access      IS '강의(영상) 단위 학생 예외 — grant(개별 지급) / block(차감·차단)';
COMMENT ON COLUMN public.lecture_student_access.mode IS 'grant=분반 무관 허용, block=분반 지급이어도 차단';

CREATE INDEX IF NOT EXISTS idx_lecture_student_access_student
  ON public.lecture_student_access(student_id);
CREATE INDEX IF NOT EXISTS idx_lecture_student_access_lecture
  ON public.lecture_student_access(lecture_id);

ALTER TABLE public.lecture_student_access ENABLE ROW LEVEL SECURITY;

-- 스태프(선생님·사무 조교)가 관리
CREATE POLICY "staff manage lecture student access"
  ON public.lecture_student_access
  USING (get_my_role() IN ('teacher', 'ta_desk'))
  WITH CHECK (get_my_role() IN ('teacher', 'ta_desk'));

-- 학생은 자신의 예외만 조회 (시청 가능 여부 판단용)
CREATE POLICY "student read own lecture access"
  ON public.lecture_student_access
  FOR SELECT
  USING (auth.uid() = student_id);

GRANT ALL ON public.lecture_student_access TO authenticated;
