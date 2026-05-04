-- =============================================================
-- 012: lectures.class_id NOT NULL 제약 제거
-- =============================================================
-- 강의 강좌 구조 개편(010)에서 class_id 대신 course_name을 사용하도록 변경했으나
-- NOT NULL 제약을 제거하지 않아 개별 강의 추가/동기화 시 오류 발생 → 수정

ALTER TABLE public.lectures
  ALTER COLUMN class_id DROP NOT NULL;
