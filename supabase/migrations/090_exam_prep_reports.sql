-- 내신대비 리포트를 reports 테이블에 통합 (클리닉 리포트와 동일한 패턴)
-- report_type: 'learning'(기존 학습 리포트) | 'clinic'(클리닉) | 'exam_prep'(내신대비 — 등하원 시각,
-- 그날 학습 내용, 모의고사 응시 여부를 담는다. 분반이 없어 class_id는 이미 nullable(059).

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_report_type_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_report_type_check
    CHECK (report_type IN ('learning', 'clinic', 'exam_prep'));

-- exam_prep은 클리닉과 동일하게 (학생, 날짜)당 1건 — 재저장 시 덮어쓰기(수정) 기준
CREATE UNIQUE INDEX IF NOT EXISTS reports_exam_prep_student_date_unique
  ON public.reports (student_id, report_date)
  WHERE report_type = 'exam_prep';

GRANT ALL ON public.reports TO authenticated, service_role;
