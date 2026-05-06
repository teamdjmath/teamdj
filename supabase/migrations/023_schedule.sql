-- 분반 수업 시간 (매주 고정)
-- 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
ALTER TABLE class_groups
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time   time,
  ADD COLUMN IF NOT EXISTS day_of_week int[];

-- 추가 근무 (비정기)
CREATE TABLE IF NOT EXISTS extra_schedules (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references users(id) ON DELETE CASCADE,
  title          text        not null,
  scheduled_date date        not null,
  start_time     time        not null,
  end_time       time        not null,
  note           text,
  created_at     timestamptz default now()
);

ALTER TABLE extra_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extra_schedules_self_select" ON extra_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "extra_schedules_self_insert" ON extra_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "extra_schedules_self_delete" ON extra_schedules
  FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON extra_schedules TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
