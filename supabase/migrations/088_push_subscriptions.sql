-- 웹 푸시 구독 정보 저장 — 브라우저(디바이스)별로 하나씩 생기므로 한 유저가 여러 행을 가질 수
-- 있다(휴대폰+PC 등). endpoint가 브라우저의 푸시 서비스 URL로 사실상 디바이스 식별자 역할을 해서
-- unique로 두고, 같은 디바이스가 다시 구독하면 upsert로 갱신한다.
create table if not exists public.push_subscriptions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users(id) on delete cascade,
  endpoint   text        not null unique,
  p256dh     text        not null,
  auth_key   text        not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user_id on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: 본인 것만 조회/등록/삭제"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant all on public.push_subscriptions to authenticated, service_role;
