-- =============================================================
-- 060: 휴강 등록 — 특정 날짜에 진행되지 않은(또는 본인이 출근하지
-- 않은) 정규 수업을 개인 단위로 기록해 월 근무 시간에서 차감한다.
-- extra_schedules(추가 근무)와 같은 본인 소유 RLS 패턴.
-- =============================================================

CREATE TABLE IF NOT EXISTS schedule_absences (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references users(id) ON DELETE CASCADE,
  class_id     uuid        not null references class_groups(id) ON DELETE CASCADE,
  absence_date date        not null,
  note         text,
  created_at   timestamptz default now(),
  unique (user_id, class_id, absence_date)
);

comment on table  public.schedule_absences              is '휴강/미출근 기록 (개인 근무 시간 차감용)';
comment on column public.schedule_absences.absence_date is '휴강 날짜';

ALTER TABLE schedule_absences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_absences_self_select" ON schedule_absences
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "schedule_absences_self_insert" ON schedule_absences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "schedule_absences_self_delete" ON schedule_absences
  FOR DELETE USING (auth.uid() = user_id);

GRANT ALL ON schedule_absences TO authenticated;
