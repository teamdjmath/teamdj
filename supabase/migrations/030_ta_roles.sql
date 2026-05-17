-- 030_ta_roles.sql
-- 1. users.role CHECK 제약 확장 (ta_admin, ta_assistant 추가)
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check,
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('teacher', 'ta', 'ta_admin', 'ta_assistant', 'student', 'parent'));

-- 2. 기존 'ta' 역할 → 'ta_admin' 마이그레이션
UPDATE users SET role = 'ta_admin' WHERE role = 'ta';

-- 이제 이전 ta_admin 값이 모두 업데이트됐으므로 'ta'를 제약에서 제거
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check,
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('teacher', 'ta_admin', 'ta_assistant', 'student', 'parent'));

-- 3. qna_questions: teacher/ta_admin/ta_assistant 전체 조회 policy 복구
--    (026_textbooks.sql 에서 기존 policy 삭제 후 미복구된 경우 대비)
DROP POLICY IF EXISTS "teacher/ta 전체 조회" ON qna_questions;
DROP POLICY IF EXISTS "staff 전체 조회" ON qna_questions;

CREATE POLICY "staff 전체 조회" ON qna_questions
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users
      WHERE role IN ('teacher', 'ta_admin', 'ta_assistant')
    )
  );

-- 4. RLS 정책 전체 업데이트: 기존 role IN ('teacher', 'ta') → 새 역할 포함
--    영향받는 테이블: class_groups, class_members, notices, assignments,
--    assignment_progress, attendance_logs, qna_questions, qna_answers,
--    push_messages, test_scores, exam_results, lecture_courses,
--    lecture_videos, ta_class_access, staff_status

-- class_groups
DROP POLICY IF EXISTS "teacher/ta 관리" ON class_groups;
CREATE POLICY "staff 관리" ON class_groups
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('teacher', 'ta_admin', 'ta_assistant')
    )
  );

-- class_members
DROP POLICY IF EXISTS "teacher/ta 관리" ON class_members;
CREATE POLICY "staff 관리" ON class_members
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('teacher', 'ta_admin', 'ta_assistant')
    )
  );

-- notices
DROP POLICY IF EXISTS "teacher/ta 관리" ON notices;
CREATE POLICY "staff 관리" ON notices
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('teacher', 'ta_admin')
    )
  );

-- assignments
DROP POLICY IF EXISTS "teacher/ta 관리" ON assignments;
CREATE POLICY "staff 관리" ON assignments
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('teacher', 'ta_admin')
    )
  );

-- attendance_logs
DROP POLICY IF EXISTS "teacher/ta 관리" ON attendance_logs;
CREATE POLICY "staff 관리" ON attendance_logs
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('teacher', 'ta_admin')
    )
  );

-- qna_answers: ta_assistant 도 write 가능
DROP POLICY IF EXISTS "teacher/ta 답변 관리" ON qna_answers;
DROP POLICY IF EXISTS "staff 답변 관리" ON qna_answers;
CREATE POLICY "staff 답변 관리" ON qna_answers
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('teacher', 'ta_admin', 'ta_assistant')
    )
  );

-- push_messages: ta_assistant 도 insert 가능
DROP POLICY IF EXISTS "teacher/ta 발송" ON push_messages;
DROP POLICY IF EXISTS "staff 발송" ON push_messages;
CREATE POLICY "staff 발송" ON push_messages
  FOR ALL USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('teacher', 'ta_admin', 'ta_assistant')
    )
  );

-- staff_status: ta_assistant 도 upsert 가능
DROP POLICY IF EXISTS "본인 상태 관리" ON staff_status;
CREATE POLICY "본인 상태 관리" ON staff_status
  FOR ALL USING (auth.uid() = user_id);

-- users 조회 policy (teacher/ta_admin/ta_assistant 모두 조회 가능)
DROP POLICY IF EXISTS "teacher/ta 조회" ON users;
DROP POLICY IF EXISTS "staff 조회" ON users;
CREATE POLICY "staff 조회" ON users
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users u2 WHERE u2.role IN ('teacher', 'ta_admin', 'ta_assistant')
    )
    OR auth.uid() = id
  );
