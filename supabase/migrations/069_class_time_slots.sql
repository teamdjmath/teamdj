-- 069_class_time_slots.sql
-- 분반 요일별 수업 시간 분리 (예: 월목 16:00~19:00 / 토일 13:00~16:00)
-- time_slots: [{"days":[1,4],"start":"16:00","end":"19:00"}, {"days":[6,0],"start":"13:00","end":"16:00"}]
-- 기존 day_of_week/start_time/end_time 컬럼은 하위 호환용으로 유지·동기화:
--   day_of_week = 모든 슬롯 요일 합집합, start/end_time = 첫 슬롯 시간

ALTER TABLE public.class_groups
  ADD COLUMN IF NOT EXISTS time_slots jsonb;

COMMENT ON COLUMN public.class_groups.time_slots
  IS '요일별 수업 시간 [{days:[요일...], start:"HH:MM", end:"HH:MM"}] — NULL이면 기존 단일 시간 사용';

GRANT ALL ON public.class_groups TO authenticated, service_role;
