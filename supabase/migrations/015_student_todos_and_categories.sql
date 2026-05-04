-- 1. student_todos 테이블 생성
create table public.student_todos (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  is_completed boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. assignment_categories 테이블 생성
create table public.assignment_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

-- 3. 초기 카테고리 데이터 (기존 데이터 유지하고 싶으면 생략 가능하지만, 요청에 따라 새로 구성)
insert into public.assignment_categories (name) values ('기타');

-- 4. RLS 설정
alter table public.student_todos enable row level security;
alter table public.assignment_categories enable row level security;

-- student_todos 정책
create policy "Users can view their own todos" on public.student_todos for select using (auth.uid() = student_id);
create policy "Users can insert their own todos" on public.student_todos for insert with check (auth.uid() = student_id);
create policy "Users can update their own todos" on public.student_todos for update using (auth.uid() = student_id);
create policy "Users can delete their own todos" on public.student_todos for delete using (auth.uid() = student_id);

-- assignment_categories 정책 (모두 조회 가능, 스태프 이상만 수정 가능하게 설정하는 것이 정석이나 우선 단순하게 조회/추가 허용)
create policy "Everyone can view categories" on public.assignment_categories for select using (true);
create policy "Authenticated users can insert categories" on public.assignment_categories for insert with check (auth.role() = 'authenticated');


-- Authenticated 유저에게 테이블 접근 권한 부여
grant all on public.student_todos to authenticated;
grant all on public.assignment_categories to authenticated;
