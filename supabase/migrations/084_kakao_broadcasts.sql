-- 통합 발송(문의 & 발송 화면)의 카카오 채널 발송 이력 — 학생/학부모 어느 쪽이든 전체/분반/개별
-- 범위로 보낸 카카오 텍스트 기록. 쪽지(인앱) 채널은 기존 push_messages를 그대로 쓰므로 별도
-- 테이블이 필요없고, 카카오는 인앱 저장소가 없어 발송 이력만 여기 남긴다.
create table if not exists public.kakao_broadcasts (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.users(id) on delete set null,
  audience text not null check (audience in ('student', 'parent')),
  scope text not null check (scope in ('all', 'class', 'individual')),
  class_id uuid references public.class_groups(id) on delete set null,
  student_id uuid references public.users(id) on delete set null,
  title text not null,
  content text not null,
  sent_count int not null default 0,
  created_at timestamptz not null default now()
);

comment on table public.kakao_broadcasts is '조교가 학생/학부모에게 보낸 카카오 발송 이력 (전체/분반/개별)';

alter table public.kakao_broadcasts enable row level security;

create policy "kakao_broadcasts: staff 조회" on public.kakao_broadcasts
  for select using (
    auth.uid() in (select id from public.users where role in ('teacher', 'ta_desk', 'ta_assistant'))
  );

create policy "kakao_broadcasts: teacher/ta_desk 등록" on public.kakao_broadcasts
  for insert with check (
    auth.uid() in (select id from public.users where role in ('teacher', 'ta_desk'))
  );

grant all on public.kakao_broadcasts to authenticated;
grant all on public.kakao_broadcasts to service_role;
