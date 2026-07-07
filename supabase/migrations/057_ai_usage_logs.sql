-- 057_ai_usage_logs.sql
-- AI(Gemini) 호출별 토큰 사용량 기록 — 모니터링에서 호출량·예상 결제 금액 산출용.
-- 유료 키 전환 후 실제 비용 추적의 근거가 된다. INSERT는 서버 액션(service_role)만 수행.

CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  feature        text        NOT NULL,              -- 예: 'qna_draft'
  mode           text,                              -- 'hint' | 'full'
  model          text        NOT NULL,              -- 예: 'gemini-2.5-flash'
  prompt_tokens  integer     NOT NULL DEFAULT 0,    -- 입력 (프롬프트+질문+이미지)
  thoughts_tokens integer    NOT NULL DEFAULT 0,    -- thinking (출력 단가로 과금됨)
  output_tokens  integer     NOT NULL DEFAULT 0,    -- 답변 본문
  created_at     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ai_usage_logs IS 'AI 호출별 토큰 사용량 (모니터링 예상 요금 산출용)';

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON public.ai_usage_logs (created_at DESC);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- 조회는 teacher만. INSERT는 service_role(서버 액션)만 — authenticated 정책 없음
CREATE POLICY "ai_usage_logs: teacher만 조회"
  ON public.ai_usage_logs FOR SELECT USING (get_my_role() = 'teacher');

GRANT ALL ON public.ai_usage_logs TO authenticated, service_role;
