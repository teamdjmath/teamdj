-- 073_student_contact_requests.sql
-- 클리닉 조교(ta_assistant)용 "학생 조회" 화면 — 분반별 전체 학생(학교/학년/이름)은
-- 바로 볼 수 있지만, 전화번호(학생·학부모)는 선생님 승인이 있어야 열람 가능하다.
-- 승인은 기간제(7일)로 자동 만료 — 이후엔 재요청 필요.

create table if not exists public.student_contact_requests (
  id           uuid        primary key default gen_random_uuid(),
  student_id   uuid        not null references public.users(id) on delete cascade,
  requested_by uuid        not null references public.users(id) on delete cascade,
  reason       text,
  status       text        not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  decided_by   uuid        references public.users(id) on delete set null,
  decided_at   timestamptz,
  expires_at   timestamptz -- 승인 시 decided_at + 7일. NULL이면 미승인 상태
);

comment on table public.student_contact_requests is '학생/학부모 연락처 열람 요청 — 승인 시 7일간만 열람 가능(기간제)';
comment on column public.student_contact_requests.expires_at is '승인 시각 + 7일. 만료 후에는 재요청 필요';

-- 요청자당(같은 학생 기준) 대기중인 요청은 하나만 — 중복 클릭 방지
create unique index if not exists student_contact_requests_pending_unique
  on public.student_contact_requests (student_id, requested_by)
  where status = 'pending';

create index if not exists idx_contact_requests_student   on public.student_contact_requests (student_id);
create index if not exists idx_contact_requests_requester on public.student_contact_requests (requested_by, requested_at desc);

alter table public.student_contact_requests enable row level security;

-- 조회: 본인이 낸 요청이거나, 선생님(승인 권한자)
create policy "contact_requests: 본인 요청 또는 선생님 조회"
  on public.student_contact_requests for select using (
    requested_by = auth.uid() or get_my_role() = 'teacher'
  );

-- 생성: 스태프만, 본인 명의로만
create policy "contact_requests: 스태프 본인 요청 생성"
  on public.student_contact_requests for insert with check (
    requested_by = auth.uid()
    and get_my_role() in ('teacher', 'ta_desk', 'ta_assistant')
  );

-- 승인/거절: 선생님만 ("선생님 이상급 승인")
create policy "contact_requests: 선생님만 승인/거절"
  on public.student_contact_requests for update using (
    get_my_role() = 'teacher'
  );

grant all on public.student_contact_requests to authenticated, service_role;
