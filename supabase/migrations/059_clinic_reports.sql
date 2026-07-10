-- 059_clinic_reports.sql
-- 클리닉 리포트를 reports 테이블에 통합 (생성/수정/삭제/카카오 발송/자동발송 재사용)
-- - report_type: 'learning'(기존) | 'clinic'(엑셀 업로드 기반)
-- - clinic 리포트는 분반이 없으므로 class_id를 NULL 허용으로 변경

ALTER TABLE public.reports
  ALTER COLUMN class_id DROP NOT NULL;

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS report_type text NOT NULL DEFAULT 'learning'
    CHECK (report_type IN ('learning', 'clinic'));

-- clinic은 (학생, 날짜)당 1건 — 재저장 시 덮어쓰기(수정) 기준
CREATE UNIQUE INDEX IF NOT EXISTS reports_clinic_student_date_unique
  ON public.reports (student_id, report_date)
  WHERE report_type = 'clinic';

CREATE INDEX IF NOT EXISTS idx_reports_type_date
  ON public.reports (report_type, report_date DESC);

GRANT ALL ON public.reports TO authenticated, service_role;
