-- 최초 로그인 시 비밀번호 변경 강제 여부 컬럼 추가
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS must_change_password boolean DEFAULT false;
