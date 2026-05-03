-- =============================================================
-- 004_fix_phone_nullable.sql
-- users.phone을 nullable로 변경
-- 이유: 선생님/조교는 전화번호 없이 이메일로만 가입하므로
--       signUp 시 public.users INSERT 가능하도록 제약 완화
-- =============================================================

alter table public.users
  alter column phone drop not null;
