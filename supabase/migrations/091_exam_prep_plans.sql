-- 내신대비 리포트: 학생별 "풀어야 할 계획"과 이행도 — 날짜와 무관하게 학생 1명당 1행으로 관리.
-- 매일 입력하는 exam_prep 리포트(reports 테이블)와 별개로, 저장 시점의 스냅샷을 content_json에도
-- 함께 남긴다 (report-generation 코드에서 처리).
CREATE TABLE IF NOT EXISTS public.exam_prep_plans (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.users(id) on delete cascade,
  plan_content text not null default '',
  progress_pct integer,
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

COMMENT ON TABLE public.exam_prep_plans IS '내신대비 학생별 계획·이행도 (날짜 무관, 학생당 1행)';

ALTER TABLE public.exam_prep_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_prep_plans: teacher/ta만 조회" ON public.exam_prep_plans
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

CREATE POLICY "exam_prep_plans: teacher/ta만 등록" ON public.exam_prep_plans
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

CREATE POLICY "exam_prep_plans: teacher/ta만 수정" ON public.exam_prep_plans
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

CREATE POLICY "exam_prep_plans: teacher만 삭제(초기화)" ON public.exam_prep_plans
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role = 'teacher')
  );

GRANT ALL ON public.exam_prep_plans TO authenticated;
GRANT ALL ON public.exam_prep_plans TO service_role;
