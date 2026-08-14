-- 077_attendance_export.sql
-- 분반별 월간 출석 엑셀 내보내기 지원

-- 1) 분반에서 빠진 날짜를 알아야 몇 월까지 로스터에 남길지 판단 가능
--    (is_active 불리언만으로는 "언제" 빠졌는지 알 수 없었음)
alter table public.class_members add column if not exists removed_at timestamptz;

-- 2) 회원 탈퇴(users 삭제) 시 attendance_logs가 CASCADE로 같이 사라져
--    탈퇴 이전 출석 기록을 엑셀로 남길 방법이 없었음 — 이름을 스냅샷해두고
--    학생 삭제 후에도 그 달 기록은 남도록 FK를 SET NULL로 바꾼다.
alter table public.attendance_logs add column if not exists student_name_snapshot text;

do $$
declare
  fk_name text;
begin
  select tc.constraint_name into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name and tc.table_schema = kcu.table_schema
  where tc.table_schema = 'public'
    and tc.table_name = 'attendance_logs'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name = 'student_id';

  if fk_name is not null then
    execute format('alter table public.attendance_logs drop constraint %I', fk_name);
  end if;

  alter table public.attendance_logs
    add constraint attendance_logs_student_id_fkey
    foreign key (student_id) references public.users(id) on delete set null;
end $$;
