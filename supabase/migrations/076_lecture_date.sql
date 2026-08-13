-- 강의 영상에 실제 수업 날짜를 기록 — 결석(차감) 학생 자동 차단에 사용.
ALTER TABLE public.lectures
  ADD COLUMN IF NOT EXISTS lecture_date date;

COMMENT ON COLUMN public.lectures.lecture_date IS '이 강의 영상이 해당하는 실제 수업 날짜. 강의 등록 시 그날 결석(차감)으로 표시된 학생을 자동으로 차단하는 데 쓰인다.';
