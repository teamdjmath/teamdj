CREATE TABLE IF NOT EXISTS notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        references users(id) ON DELETE CASCADE,
  type       text        not null,
  title      text        not null,
  body       text        not null,
  link       text,
  is_read    boolean     default false,
  created_at timestamptz default now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "본인 알림만 조회" ON notifications
  FOR ALL USING (auth.uid() = user_id);

CREATE INDEX ON notifications(user_id, is_read, created_at DESC);

GRANT ALL ON notifications TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
