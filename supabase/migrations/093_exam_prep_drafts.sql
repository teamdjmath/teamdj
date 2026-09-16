-- 내신대비 리포트 실시간 입력 임시저장 — 학생+날짜 단위(정식 저장=이미지 생성 전 단계).
-- report_drafts(분반+날짜)와 같은 패턴이되, 내신대비는 분반이 아니라 학생 개별 입력이라 키가 다르다.
CREATE TABLE IF NOT EXISTS public.exam_prep_drafts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  report_date date not null,
  exam_type text not null default 'midterm' check (exam_type in ('midterm', 'final')),
  arrival_time text not null default '',
  departure_time text not null default '',
  study_content text not null default '',
  mock_status text not null default 'none' check (mock_status in ('none', 'attended', 'absent')),
  mock_exam_label text not null default '',
  mock_difficulty integer,
  mock_score integer,
  mock_note text not null default '',
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (student_id, report_date)
);

COMMENT ON TABLE public.exam_prep_drafts IS '내신대비 리포트 실시간 입력 임시저장 (학생+날짜 단위, 정식 저장 전 단계)';

ALTER TABLE public.exam_prep_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exam_prep_drafts: teacher/ta만 조회" ON public.exam_prep_drafts
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

CREATE POLICY "exam_prep_drafts: teacher/ta만 등록" ON public.exam_prep_drafts
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

CREATE POLICY "exam_prep_drafts: teacher/ta만 수정" ON public.exam_prep_drafts
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

CREATE POLICY "exam_prep_drafts: teacher/ta만 삭제" ON public.exam_prep_drafts
  FOR DELETE USING (
    auth.uid() IN (SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant'))
  );

GRANT ALL ON public.exam_prep_drafts TO authenticated;
GRANT ALL ON public.exam_prep_drafts TO service_role;
