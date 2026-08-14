-- 학생이 "조교님께 추가 답변 요청하기"를 누를 때 남기는 피드백 — AI 초안(또는 유사 문항
-- 자동 연결 답변)의 어떤 부분이 부족했는지 카테고리로 수집해, 관리자 모니터링에서
-- "어떤 문항에서 어떤 오류가 많았는지" 집계할 수 있게 한다.
CREATE TABLE IF NOT EXISTS public.qna_ai_feedback (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.qna_questions(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  category text not null check (category in ('wrong_answer', 'unclear_explanation', 'mismatched_problem', 'other')),
  detail text,
  created_at timestamptz not null default now()
);

COMMENT ON TABLE public.qna_ai_feedback IS '학생이 AI 초안/자동 연결 답변에 남긴 부족한 점 피드백 (추가 답변 요청 시)';
COMMENT ON COLUMN public.qna_ai_feedback.category IS 'wrong_answer=정답을 출력하지 못함, unclear_explanation=풀이과정 설명 부족, mismatched_problem=유사 문항이 실제 문항과 다름, other=직접 답변';

ALTER TABLE public.qna_ai_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qna_ai_feedback: 본인 등록" ON public.qna_ai_feedback
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "qna_ai_feedback: 본인 조회" ON public.qna_ai_feedback
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "qna_ai_feedback: staff 전체 조회" ON public.qna_ai_feedback
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

GRANT ALL ON public.qna_ai_feedback TO authenticated;
GRANT ALL ON public.qna_ai_feedback TO service_role;
