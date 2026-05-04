-- 020_add_student_profile_fields.sql
-- 학생용 학년 및 학교 정보 추가

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS school text,
  ADD COLUMN IF NOT EXISTS grade  text;

COMMENT ON COLUMN public.users.school IS '소속 학교 (학생용)';
COMMENT ON COLUMN public.users.grade  IS '학년 (학생용)';
