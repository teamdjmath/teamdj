-- 학습 리포트 작성 중 임시저장 — "리포트 일괄 생성" 전까지 학습내용/과제/
-- 공지사항/학생별 특이사항을 분반+날짜 단위로 보존한다.
CREATE TABLE IF NOT EXISTS public.report_drafts (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.class_groups(id) on delete cascade,
  session_date date not null,
  study_content text not null default '',
  homework text not null default '',
  announcement text not null default '',
  per_student_notes jsonb not null default '{}',
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (class_id, session_date)
);

COMMENT ON TABLE public.report_drafts IS '학습 리포트 작성 중 임시저장 (리포트 일괄 생성 전 단계)';

ALTER TABLE public.report_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_drafts: teacher/ta만 조회" ON public.report_drafts
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

CREATE POLICY "report_drafts: teacher/ta만 등록" ON public.report_drafts
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

CREATE POLICY "report_drafts: teacher/ta만 수정" ON public.report_drafts
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

CREATE POLICY "report_drafts: teacher/ta만 삭제" ON public.report_drafts
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

GRANT ALL ON public.report_drafts TO authenticated;
GRANT ALL ON public.report_drafts TO service_role;
