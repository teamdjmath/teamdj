-- 유사 문항 답변을 조교가 "확인"만으로 채택할 수 있도록 출처 추적 컬럼 추가.
-- 채택된 답변인지 구분하는 용도이며, 채택 후에도 해당 질문은 그대로 조교가
-- 추가 검토·수정·재답변할 수 있다 (qna_answers 자체를 잠그지 않음).
ALTER TABLE public.qna_answers
  ADD COLUMN IF NOT EXISTS adopted_from_question_id uuid REFERENCES public.qna_questions(id) ON DELETE SET NULL;

GRANT ALL ON public.qna_answers TO authenticated, service_role;
