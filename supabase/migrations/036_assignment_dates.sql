-- 과제 출제일(issue_date) 및 학생별 제출일(submit_date) 추가
alter table public.assignments
  add column if not exists issue_date date;

alter table public.assignment_progress
  add column if not exists submit_date date;

GRANT ALL ON public.assignments TO authenticated, service_role;
GRANT ALL ON public.assignment_progress TO authenticated, service_role;
