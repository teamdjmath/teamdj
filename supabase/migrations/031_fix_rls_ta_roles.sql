-- 031_fix_rls_ta_roles.sql
-- 1. get_my_role() — ta_admin/ta_assistant 포함
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- 2. ta_has_class_access() — ta_admin/ta_assistant 포함
CREATE OR REPLACE FUNCTION ta_has_class_access(p_class_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM ta_class_access
    WHERE ta_id = auth.uid()
    AND (is_all_classes = true OR class_id = p_class_id)
  ) OR get_my_role() IN ('teacher', 'ta_admin')
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. class_groups — SELECT
DROP POLICY IF EXISTS "ta 분반 접근" ON class_groups;
DROP POLICY IF EXISTS "staff 분반 접근" ON class_groups;
CREATE POLICY "staff 분반 접근" ON class_groups
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
    OR EXISTS (
      SELECT 1 FROM ta_class_access
      WHERE ta_id = auth.uid()
      AND (is_all_classes = true OR class_id = class_groups.id)
    )
  );

-- 4. class_members — SELECT
DROP POLICY IF EXISTS "ta class_members 접근" ON class_members;
DROP POLICY IF EXISTS "staff class_members 접근" ON class_members;
CREATE POLICY "staff class_members 접근" ON class_members
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
    OR student_id = auth.uid()
  );

-- 5. attendance_logs
DROP POLICY IF EXISTS "ta 출석 접근" ON attendance_logs;
DROP POLICY IF EXISTS "staff 출석 접근" ON attendance_logs;
CREATE POLICY "staff 출석 접근" ON attendance_logs
  FOR ALL USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
  );

-- 6. assignments — SELECT
DROP POLICY IF EXISTS "ta 과제 접근" ON assignments;
DROP POLICY IF EXISTS "staff 과제 SELECT" ON assignments;
CREATE POLICY "staff 과제 SELECT" ON assignments
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
    OR EXISTS (
      SELECT 1 FROM class_members
      WHERE student_id = auth.uid()
      AND class_id = assignments.class_id
      AND is_active = true
    )
  );

-- 7. assignment_progress — SELECT
DROP POLICY IF EXISTS "ta 과제진행 접근" ON assignment_progress;
DROP POLICY IF EXISTS "staff 과제진행 SELECT" ON assignment_progress;
CREATE POLICY "staff 과제진행 SELECT" ON assignment_progress
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
    OR student_id = auth.uid()
  );

-- 8. notices — SELECT
DROP POLICY IF EXISTS "ta 공지 접근" ON notices;
DROP POLICY IF EXISTS "staff 공지 SELECT" ON notices;
CREATE POLICY "staff 공지 SELECT" ON notices
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
    OR class_id IS NULL
    OR EXISTS (
      SELECT 1 FROM class_members
      WHERE student_id = auth.uid()
      AND class_id = notices.class_id
      AND is_active = true
    )
  );

-- 9. reports — SELECT
DROP POLICY IF EXISTS "ta 리포트 접근" ON reports;
DROP POLICY IF EXISTS "staff 리포트 SELECT" ON reports;
CREATE POLICY "staff 리포트 SELECT" ON reports
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
    OR student_id = auth.uid()
  );

-- 10. test_scores — SELECT
DROP POLICY IF EXISTS "ta 점수 접근" ON test_scores;
DROP POLICY IF EXISTS "staff 점수 SELECT" ON test_scores;
CREATE POLICY "staff 점수 SELECT" ON test_scores
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
    OR student_id = auth.uid()
  );

-- 11. exam_results — SELECT
DROP POLICY IF EXISTS "ta 시험결과 접근" ON exam_results;
DROP POLICY IF EXISTS "staff 시험결과 SELECT" ON exam_results;
CREATE POLICY "staff 시험결과 SELECT" ON exam_results
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
    OR student_id = auth.uid()
  );

-- 12. push_messages — SELECT
DROP POLICY IF EXISTS "ta 메시지 접근" ON push_messages;
DROP POLICY IF EXISTS "staff 메시지 SELECT" ON push_messages;
CREATE POLICY "staff 메시지 SELECT" ON push_messages
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
    OR student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM class_members
      WHERE student_id = auth.uid()
      AND class_id = push_messages.class_id
      AND is_active = true
    )
  );

-- 13. staff_status — SELECT
DROP POLICY IF EXISTS "ta 근무상태 접근" ON staff_status;
DROP POLICY IF EXISTS "staff 근무상태 SELECT" ON staff_status;
CREATE POLICY "staff 근무상태 SELECT" ON staff_status
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
  );

-- 14. extra_schedules — SELECT
DROP POLICY IF EXISTS "ta 일정 접근" ON extra_schedules;
DROP POLICY IF EXISTS "staff 일정 SELECT" ON extra_schedules;
CREATE POLICY "staff 일정 SELECT" ON extra_schedules
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
    OR user_id = auth.uid()
  );

-- 15. users — SELECT (staff가 모든 유저 조회 가능)
DROP POLICY IF EXISTS "staff 유저 SELECT" ON users;
CREATE POLICY "staff 유저 SELECT" ON users
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
    OR id = auth.uid()
  );

-- 16. ta_class_access — SELECT
DROP POLICY IF EXISTS "ta 분반접근 SELECT" ON ta_class_access;
DROP POLICY IF EXISTS "staff 분반접근 SELECT" ON ta_class_access;
CREATE POLICY "staff 분반접근 SELECT" ON ta_class_access
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
    OR ta_id = auth.uid()
  );

-- 17. qna_answers 난이도 컬럼 추가 (1~8 정수, 하:1~4 / 중:5~6 / 상:7~8)
ALTER TABLE qna_answers
  ADD COLUMN IF NOT EXISTS difficulty smallint
  CHECK (difficulty >= 1 AND difficulty <= 8);
