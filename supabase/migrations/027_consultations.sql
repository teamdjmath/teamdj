CREATE TABLE IF NOT EXISTS consultations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  content text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "누구나 등록 가능" ON consultations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "조회 불가" ON consultations
  FOR SELECT USING (false);

GRANT INSERT ON consultations TO anon;
