-- 학생 답변 평점 (1~5)
ALTER TABLE public.qna_answers
  ADD COLUMN IF NOT EXISTS student_rating smallint CHECK (student_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS rated_at timestamptz;

GRANT ALL ON public.qna_answers TO authenticated, service_role;
