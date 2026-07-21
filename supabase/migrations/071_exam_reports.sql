-- 특별시험 레포트 (개발 중) — exam_results를 analysis-sheet 형태로 캡처해
-- 학생에게 보여주는 별도 리포트. 학습/클리닉 리포트(reports 테이블, 수업 세션 단위)와는
-- 완전히 분리된 트랙이다 — 시험 단위이고 class_id도 필요 없다.
create table if not exists public.exam_reports (
  id             uuid        primary key default gen_random_uuid(),
  student_id     uuid        not null references public.users(id) on delete cascade,
  exam_result_id uuid        not null references public.exam_results(id) on delete cascade,
  content_json   jsonb       not null,
  image_url      text,
  created_at     timestamptz not null default now(),
  unique (exam_result_id)
);

comment on table public.exam_reports is '특별시험 분석 레포트 (개발 중) — exam_results 스냅샷 기반, 시험 결과당 1건';

alter table public.exam_reports enable row level security;

create policy "staff manage exam reports"
  on public.exam_reports
  using (get_my_role() in ('teacher', 'ta_desk', 'ta_assistant'))
  with check (get_my_role() in ('teacher', 'ta_desk', 'ta_assistant'));

create policy "students read own exam reports"
  on public.exam_reports for select
  using (get_my_role() = 'student' and student_id = auth.uid());

grant all on public.exam_reports to authenticated, service_role;
