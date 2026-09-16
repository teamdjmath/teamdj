-- 091에서 만든 exam_prep_plans(학생당 계획 1개짜리 블롭)는 설계가 잘못됐다 — 실제로는 학생마다
-- "풀어야 할 것" 목록이 여러 개이고, 각 항목이 개별적으로 이행도를 가진다. 아직 실사용 데이터가
-- 없는 상태라 새로 만들지 않고 테이블 자체를 목록형(exam_prep_plan_items)으로 교체한다.
DROP TABLE IF EXISTS public.exam_prep_plans;

CREATE TABLE IF NOT EXISTS public.exam_prep_plan_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  progress_pct integer not null default 0,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

CREATE INDEX IF NOT EXISTS exam_prep_plan_items_student_idx
  ON public.exam_prep_plan_items (student_id, position);

COMMENT ON TABLE public.exam_prep_plan_items IS '내신대비 학생별 계획 항목 목록 (날짜 무관, 항목마다 개별 이행도)';

ALTER TABLE public.exam_prep_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_prep_plan_items: teacher/ta만 조회" ON public.exam_prep_plan_items
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

CREATE POLICY "exam_prep_plan_items: teacher/ta만 등록" ON public.exam_prep_plan_items
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

CREATE POLICY "exam_prep_plan_items: teacher/ta만 수정" ON public.exam_prep_plan_items
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

CREATE POLICY "exam_prep_plan_items: teacher/ta만 삭제" ON public.exam_prep_plan_items
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

GRANT ALL ON public.exam_prep_plan_items TO authenticated;
GRANT ALL ON public.exam_prep_plan_items TO service_role;
