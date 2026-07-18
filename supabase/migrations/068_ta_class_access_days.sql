-- 068_ta_class_access_days.sql
-- 분반 조교 할당 요일 세분화
-- 분반이 월목토일처럼 여러 요일 수업일 때 조교를 요일 단위로 배정한다.
-- days: 담당 요일 배열 (0=일 1=월 … 6=토). NULL이면 모든 수업 요일 담당(기존 동작 유지).

ALTER TABLE public.ta_class_access
  ADD COLUMN IF NOT EXISTS days smallint[];

COMMENT ON COLUMN public.ta_class_access.days
  IS '담당 요일 (0=일~6=토). NULL이면 해당 분반의 모든 수업 요일 담당';

GRANT ALL ON public.ta_class_access TO authenticated, service_role;
