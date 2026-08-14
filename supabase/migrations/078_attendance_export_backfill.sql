-- 078_attendance_export_backfill.sql
-- 077에서 removed_at 컬럼을 추가하기 전에 이미 반에서 제외된(is_active=false) 학생들은
-- removed_at이 NULL이라 월간 출석 엑셀에 "제외" 라벨이 안 붙고, 이후 달에도 로스터에서
-- 안 빠지는 문제가 있었다(사람이 없는데 계속 빈 행으로 나옴). 기존 데이터를 백필한다.
-- 추정 제외일 = 그 반에서 마지막으로 출석 기록이 남은 날짜 다음날 (기록이 없으면 enrolled_at).
update public.class_members cm
set removed_at = coalesce(
  (
    select max(al.session_date) + interval '1 day'
    from public.attendance_logs al
    where al.class_id = cm.class_id and al.student_id = cm.student_id
  ),
  cm.enrolled_at
)
where cm.is_active = false
  and cm.removed_at is null;
