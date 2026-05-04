-- =============================================================
-- qna_questions 테이블에 title 컬럼 추가
-- =============================================================

ALTER TABLE public.qna_questions
ADD COLUMN IF NOT EXISTS title text NOT NULL DEFAULT '제목 없음';

COMMENT ON COLUMN public.qna_questions.title IS '질문 제목';
