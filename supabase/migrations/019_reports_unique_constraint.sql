-- 019_reports_unique_constraint.sql
-- 리포트 중복 생성을 방지하고 upsert를 지원하기 위해 유니크 제약 조건 추가

-- 기존 중복 데이터가 있을 수 있으므로 정리 (최신 것만 남김)
DELETE FROM public.reports a
USING public.reports b
WHERE a.id < b.id
  AND a.class_id = b.class_id
  AND a.student_id = b.student_id
  AND a.report_date = b.report_date;

-- 유니크 제약 조건 추가
ALTER TABLE public.reports
  ADD CONSTRAINT reports_class_student_date_unique
  UNIQUE (class_id, student_id, report_date);
