-- 077에서 attendance_logs.student_id FK를 ON DELETE SET NULL로 바꿨지만 컬럼 자체의
-- NOT NULL 제약은 그대로 남아있어서, 학생 삭제 시 SET NULL이 그 제약을 위반해 삭제 자체가
-- 실패하는 버그가 있었다 ("null value in column student_id ... violates not-null constraint").
alter table public.attendance_logs alter column student_id drop not null;
