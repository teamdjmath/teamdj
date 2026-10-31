-- 강좌(course_name)에 과목을 명시적으로 연결한다. 지금까지 QnA "강" 선택지는 과목명=강좌명이
-- 같다고 가정하고 문자열로 매칭했는데, 실제 강좌명은 "26년 2학기 공통수학2 월목 정규반"처럼
-- 학기/분반 정보까지 포함해서 과목명과 그대로 일치하지 않는다. 강좌 생성/수정 시 과목을 직접
-- 지정해두면 매칭이 정확해진다. course_name은 lectures/lecture_class_access/course_materials가
-- 이미 느슨한 문자열 키로 쓰고 있어 그대로 맞춘다(FK 아님, 강좌 개념 자체가 그렇게 운영됨).
create table if not exists public.courses (
  course_name text primary key,
  subject_id  uuid references public.subjects(id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table public.courses is '강좌(course_name) 메타데이터 — 과목 연결용';
comment on column public.courses.subject_id is 'QnA "강" 선택지를 분반+과목으로 매칭할 때 사용';

alter table public.courses enable row level security;

create policy "courses: 로그인 유저 조회" on public.courses
  for select using (auth.role() = 'authenticated');

create policy "courses: teacher/ta_desk만 등록" on public.courses
  for insert with check (
    auth.uid() in (select id from public.users where role in ('teacher', 'ta_desk'))
  );

create policy "courses: teacher/ta_desk만 수정" on public.courses
  for update using (
    auth.uid() in (select id from public.users where role in ('teacher', 'ta_desk'))
  );

create policy "courses: teacher/ta_desk만 삭제" on public.courses
  for delete using (
    auth.uid() in (select id from public.users where role in ('teacher', 'ta_desk'))
  );

grant all on public.courses to authenticated, service_role;
