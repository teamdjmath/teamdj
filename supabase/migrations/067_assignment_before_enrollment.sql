-- 과제 진행 현황에 "첫 등원 이전" 상태 추가.
-- 중간에 반에 합류한 학생은 과제가 부여된 시점에 아직 등원하지 않았을 수 있어
-- 미지참(과제를 안 한 것)과 구분해야 한다. completion_pct는 기존과 동일하게 NULL이지만
-- before_enrollment=true면 "미지참" 대신 "첫 등원 이전"으로 표시하고 평균 계산에서 제외한다.
ALTER TABLE public.assignment_progress
  ADD COLUMN IF NOT EXISTS before_enrollment boolean NOT NULL DEFAULT false;

ALTER TABLE public.assignment_progress
  DROP CONSTRAINT IF EXISTS assignment_progress_before_enrollment_pct_check;
ALTER TABLE public.assignment_progress
  ADD CONSTRAINT assignment_progress_before_enrollment_pct_check
  CHECK (NOT before_enrollment OR completion_pct IS NULL);

COMMENT ON COLUMN public.assignment_progress.before_enrollment IS '이 과제 부여 시점에 학생이 아직 등원(가입)하지 않은 경우 true. 미지참과 구분해 리포트에 "첫 등원 이전"으로 표기하며 평균 계산에서 제외.';

GRANT ALL ON public.assignment_progress TO authenticated, service_role;
