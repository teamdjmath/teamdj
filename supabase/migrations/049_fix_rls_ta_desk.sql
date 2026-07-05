-- 049_fix_rls_ta_desk.sql
-- Migration 044에서 users.role 값을 ta_admin → ta_desk로 변경했으나
-- RLS 정책 및 헬퍼 함수의 role 체크 문자열은 갱신되지 않아
-- ta_desk 역할 사용자가 분반·학생·출석·공지·Q&A 등에 접근 불가한 문제 수정.

-- ============================================================
-- 0. ta_has_class_access() 함수 — ta_admin → ta_desk
-- ============================================================
CREATE OR REPLACE FUNCTION public.ta_has_class_access(p_class_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ta_class_access
    WHERE ta_id = auth.uid()
    AND (is_all_classes = true OR class_id = p_class_id)
  ) OR get_my_role() IN ('teacher', 'ta_desk')
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================
-- 1. users
-- ============================================================
DROP POLICY IF EXISTS "users: staff 전체 조회, 나머지는 본인만" ON public.users;

CREATE POLICY "users: staff 전체 조회, 나머지는 본인만"
  ON public.users FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    OR id = auth.uid()
  );

-- ============================================================
-- 2. class_groups
-- ============================================================
DROP POLICY IF EXISTS "class_groups: 역할별 조회" ON public.class_groups;

CREATE POLICY "class_groups: 역할별 조회"
  ON public.class_groups FOR SELECT USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(id))
    OR (get_my_role() = 'student' AND i_am_in_class(id))
    OR (get_my_role() = 'parent'  AND my_child_is_in_class(id))
  );

-- ============================================================
-- 3. class_members
-- ============================================================
DROP POLICY IF EXISTS "class_members: 역할별 조회" ON public.class_members;

CREATE POLICY "class_members: 역할별 조회"
  ON public.class_members FOR SELECT USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
    OR (get_my_role() = 'student' AND student_id = auth.uid())
    OR (get_my_role() = 'parent'  AND is_my_child(student_id))
  );

-- ============================================================
-- 4. ta_class_access
-- ============================================================
DROP POLICY IF EXISTS "ta_class_access: 역할별 조회" ON public.ta_class_access;

CREATE POLICY "ta_class_access: 역할별 조회"
  ON public.ta_class_access FOR SELECT USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_id = auth.uid())
  );

-- ============================================================
-- 5. attendance_logs
-- ============================================================
DROP POLICY IF EXISTS "attendance_logs: 역할별 조회"    ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_logs: teacher·ta만 생성" ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_logs: teacher·ta만 수정" ON public.attendance_logs;
DROP POLICY IF EXISTS "attendance_logs: teacher·ta만 삭제" ON public.attendance_logs;

CREATE POLICY "attendance_logs: 역할별 조회"
  ON public.attendance_logs FOR SELECT USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
    OR (get_my_role() = 'student' AND student_id = auth.uid())
    OR (get_my_role() = 'parent'  AND is_my_child(student_id))
  );

CREATE POLICY "attendance_logs: teacher·ta만 생성"
  ON public.attendance_logs FOR INSERT WITH CHECK (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

CREATE POLICY "attendance_logs: teacher·ta만 수정"
  ON public.attendance_logs FOR UPDATE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

CREATE POLICY "attendance_logs: teacher·ta만 삭제"
  ON public.attendance_logs FOR DELETE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

-- ============================================================
-- 6. lectures
-- ============================================================
DROP POLICY IF EXISTS "lectures: 역할별 조회"        ON public.lectures;
DROP POLICY IF EXISTS "lectures: teacher·ta만 생성"  ON public.lectures;
DROP POLICY IF EXISTS "lectures: teacher·ta만 수정"  ON public.lectures;
DROP POLICY IF EXISTS "lectures: teacher·ta만 삭제"  ON public.lectures;

CREATE POLICY "lectures: 역할별 조회"
  ON public.lectures FOR SELECT USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND EXISTS (
      SELECT 1 FROM public.lecture_class_access lca
      WHERE lca.course_name = lectures.course_name
        AND (lca.class_id IS NULL OR ta_has_class_access(lca.class_id))
    ))
    OR (get_my_role() = 'student' AND EXISTS (
      SELECT 1 FROM public.lecture_class_access lca
      WHERE lca.course_name = lectures.course_name
        AND (lca.class_id IS NULL OR i_am_in_class(lca.class_id))
    ))
    OR (get_my_role() = 'parent' AND EXISTS (
      SELECT 1 FROM public.lecture_class_access lca
      WHERE lca.course_name = lectures.course_name
        AND (lca.class_id IS NULL OR my_child_is_in_class(lca.class_id))
    ))
  );

CREATE POLICY "lectures: teacher·ta만 생성"
  ON public.lectures FOR INSERT WITH CHECK (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

CREATE POLICY "lectures: teacher·ta만 수정"
  ON public.lectures FOR UPDATE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

CREATE POLICY "lectures: teacher·ta만 삭제"
  ON public.lectures FOR DELETE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

-- ============================================================
-- 7. lecture_class_access
-- ============================================================
DROP POLICY IF EXISTS "lecture_class_access: 역할별 조회" ON public.lecture_class_access;

CREATE POLICY "lecture_class_access: 역할별 조회"
  ON public.lecture_class_access FOR SELECT USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant')
        AND (class_id IS NULL OR ta_has_class_access(class_id)))
    OR (get_my_role() = 'student' AND (class_id IS NULL OR i_am_in_class(class_id)))
    OR (get_my_role() = 'parent'  AND (class_id IS NULL OR my_child_is_in_class(class_id)))
  );

-- ============================================================
-- 8. assignments
-- ============================================================
DROP POLICY IF EXISTS "assignments: 역할별 조회"        ON public.assignments;
DROP POLICY IF EXISTS "assignments: teacher·ta만 생성"  ON public.assignments;
DROP POLICY IF EXISTS "assignments: teacher·ta만 수정"  ON public.assignments;
DROP POLICY IF EXISTS "assignments: teacher·ta만 삭제"  ON public.assignments;

CREATE POLICY "assignments: 역할별 조회"
  ON public.assignments FOR SELECT USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
    OR (get_my_role() = 'student' AND EXISTS (
          SELECT 1 FROM public.class_members
          WHERE student_id = auth.uid()
            AND class_id = assignments.class_id
            AND is_active = true
        ))
    OR (get_my_role() = 'parent' AND my_child_is_in_class(class_id))
  );

CREATE POLICY "assignments: teacher·ta만 생성"
  ON public.assignments FOR INSERT WITH CHECK (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

CREATE POLICY "assignments: teacher·ta만 수정"
  ON public.assignments FOR UPDATE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

CREATE POLICY "assignments: teacher·ta만 삭제"
  ON public.assignments FOR DELETE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

-- ============================================================
-- 9. assignment_progress
-- ============================================================
DROP POLICY IF EXISTS "assignment_progress: 역할별 조회"        ON public.assignment_progress;
DROP POLICY IF EXISTS "assignment_progress: teacher·ta만 생성"  ON public.assignment_progress;
DROP POLICY IF EXISTS "assignment_progress: teacher·ta만 수정"  ON public.assignment_progress;
DROP POLICY IF EXISTS "assignment_progress: teacher·ta만 삭제"  ON public.assignment_progress;

CREATE POLICY "assignment_progress: 역할별 조회"
  ON public.assignment_progress FOR SELECT USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.id = assignment_id AND ta_has_class_access(a.class_id)
        ))
    OR (get_my_role() = 'student' AND student_id = auth.uid())
    OR (get_my_role() = 'parent'  AND is_my_child(student_id))
  );

CREATE POLICY "assignment_progress: teacher·ta만 생성"
  ON public.assignment_progress FOR INSERT WITH CHECK (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.id = assignment_id AND ta_has_class_access(a.class_id)
        ))
  );

CREATE POLICY "assignment_progress: teacher·ta만 수정"
  ON public.assignment_progress FOR UPDATE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.id = assignment_id AND ta_has_class_access(a.class_id)
        ))
  );

CREATE POLICY "assignment_progress: teacher·ta만 삭제"
  ON public.assignment_progress FOR DELETE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND EXISTS (
          SELECT 1 FROM public.assignments a
          WHERE a.id = assignment_id AND ta_has_class_access(a.class_id)
        ))
  );

-- ============================================================
-- 10. test_scores
-- ============================================================
DROP POLICY IF EXISTS "test_scores: 역할별 조회"        ON public.test_scores;
DROP POLICY IF EXISTS "test_scores: teacher·ta만 생성"  ON public.test_scores;
DROP POLICY IF EXISTS "test_scores: teacher·ta만 수정"  ON public.test_scores;
DROP POLICY IF EXISTS "test_scores: teacher·ta만 삭제"  ON public.test_scores;

CREATE POLICY "test_scores: 역할별 조회"
  ON public.test_scores FOR SELECT USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
    OR (get_my_role() = 'student' AND student_id = auth.uid())
    OR (get_my_role() = 'parent'  AND is_my_child(student_id))
  );

CREATE POLICY "test_scores: teacher·ta만 생성"
  ON public.test_scores FOR INSERT WITH CHECK (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

CREATE POLICY "test_scores: teacher·ta만 수정"
  ON public.test_scores FOR UPDATE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

CREATE POLICY "test_scores: teacher·ta만 삭제"
  ON public.test_scores FOR DELETE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

-- ============================================================
-- 11. exam_results
-- ============================================================
DROP POLICY IF EXISTS "exam_results: 역할별 조회"          ON public.exam_results;
DROP POLICY IF EXISTS "exam_results: teacher·ta만 생성"    ON public.exam_results;
DROP POLICY IF EXISTS "exam_results: teacher·ta·본인 수정" ON public.exam_results;
DROP POLICY IF EXISTS "exam_results: teacher·ta만 삭제"    ON public.exam_results;

CREATE POLICY "exam_results: 역할별 조회"
  ON public.exam_results FOR SELECT USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_student_access(student_id))
    OR (get_my_role() = 'student' AND student_id = auth.uid())
    OR (get_my_role() = 'parent'  AND is_my_child(student_id))
  );

CREATE POLICY "exam_results: teacher·ta만 생성"
  ON public.exam_results FOR INSERT WITH CHECK (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_student_access(student_id))
  );

CREATE POLICY "exam_results: teacher·ta·본인 수정"
  ON public.exam_results FOR UPDATE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_student_access(student_id))
    OR (get_my_role() = 'student' AND student_id = auth.uid())
  );

CREATE POLICY "exam_results: teacher·ta만 삭제"
  ON public.exam_results FOR DELETE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_student_access(student_id))
  );

-- ============================================================
-- 12. qna_questions
-- 032의 정책 + 035의 override 정책 모두 갱신
-- ============================================================
DROP POLICY IF EXISTS "qna_questions: 역할별 조회"       ON public.qna_questions;
DROP POLICY IF EXISTS "qna_questions: 본인·teacher·ta 수정" ON public.qna_questions;
DROP POLICY IF EXISTS "staff_all_qna_select"             ON public.qna_questions;

CREATE POLICY "staff_all_qna_select"
  ON public.qna_questions FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    OR auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM public.class_members cm1
      JOIN public.class_members cm2 ON cm1.class_id = cm2.class_id
      WHERE cm1.student_id = auth.uid()
        AND cm2.student_id = qna_questions.student_id
    )
  );

CREATE POLICY "qna_questions: 본인·teacher·ta 수정"
  ON public.qna_questions FOR UPDATE USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    OR (get_my_role() = 'student' AND student_id = auth.uid())
  );

-- ============================================================
-- 13. qna_answers
-- ============================================================
DROP POLICY IF EXISTS "qna_answers: 전체 조회"        ON public.qna_answers;
DROP POLICY IF EXISTS "qna_answers: teacher·ta만 생성" ON public.qna_answers;
DROP POLICY IF EXISTS "qna_answers: teacher·ta만 수정" ON public.qna_answers;
DROP POLICY IF EXISTS "qna_answers: teacher·ta만 삭제" ON public.qna_answers;
DROP POLICY IF EXISTS "staff_all_qna_answers_select"   ON public.qna_answers;

CREATE POLICY "staff_all_qna_answers_select"
  ON public.qna_answers FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    OR EXISTS (
      SELECT 1 FROM public.qna_questions
      WHERE id = qna_answers.question_id
        AND student_id = auth.uid()
    )
  );

CREATE POLICY "qna_answers: teacher·ta만 생성"
  ON public.qna_answers FOR INSERT WITH CHECK (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
  );

CREATE POLICY "qna_answers: teacher·ta만 수정"
  ON public.qna_answers FOR UPDATE USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
  );

CREATE POLICY "qna_answers: teacher·ta만 삭제"
  ON public.qna_answers FOR DELETE USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
  );

-- ============================================================
-- 14. reports
-- ============================================================
DROP POLICY IF EXISTS "reports: 역할별 조회"        ON public.reports;
DROP POLICY IF EXISTS "reports: teacher·ta만 생성"  ON public.reports;
DROP POLICY IF EXISTS "reports: teacher·ta만 수정"  ON public.reports;
DROP POLICY IF EXISTS "reports: teacher·ta만 삭제"  ON public.reports;

CREATE POLICY "reports: 역할별 조회"
  ON public.reports FOR SELECT USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
    OR (get_my_role() = 'student' AND student_id = auth.uid())
    OR (get_my_role() = 'parent'  AND is_my_child(student_id))
  );

CREATE POLICY "reports: teacher·ta만 생성"
  ON public.reports FOR INSERT WITH CHECK (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

CREATE POLICY "reports: teacher·ta만 수정"
  ON public.reports FOR UPDATE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

CREATE POLICY "reports: teacher·ta만 삭제"
  ON public.reports FOR DELETE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant') AND ta_has_class_access(class_id))
  );

-- ============================================================
-- 15. notices
-- ============================================================
DROP POLICY IF EXISTS "notices: 역할별 조회"        ON public.notices;
DROP POLICY IF EXISTS "notices: teacher·ta만 생성"  ON public.notices;
DROP POLICY IF EXISTS "notices: teacher·ta만 수정"  ON public.notices;
DROP POLICY IF EXISTS "notices: teacher·ta만 삭제"  ON public.notices;

CREATE POLICY "notices: 역할별 조회"
  ON public.notices FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    OR (get_my_role() = 'student' AND (class_id IS NULL OR i_am_in_class(class_id)))
    OR (get_my_role() = 'parent'  AND (class_id IS NULL OR my_child_is_in_class(class_id)))
  );

CREATE POLICY "notices: teacher·ta만 생성"
  ON public.notices FOR INSERT WITH CHECK (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant')
        AND (class_id IS NULL OR ta_has_class_access(class_id)))
  );

CREATE POLICY "notices: teacher·ta만 수정"
  ON public.notices FOR UPDATE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant')
        AND (class_id IS NULL OR ta_has_class_access(class_id)))
  );

CREATE POLICY "notices: teacher·ta만 삭제"
  ON public.notices FOR DELETE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant')
        AND (class_id IS NULL OR ta_has_class_access(class_id)))
  );

-- ============================================================
-- 16. push_messages
-- ============================================================
DROP POLICY IF EXISTS "push_messages: 역할별 조회"        ON public.push_messages;
DROP POLICY IF EXISTS "push_messages: teacher·ta만 생성"  ON public.push_messages;
DROP POLICY IF EXISTS "push_messages: teacher·ta만 수정"  ON public.push_messages;
DROP POLICY IF EXISTS "push_messages: teacher·ta만 삭제"  ON public.push_messages;

CREATE POLICY "push_messages: 역할별 조회"
  ON public.push_messages FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    OR (get_my_role() = 'student' AND student_id = auth.uid())
    OR (get_my_role() = 'parent'  AND is_my_child(student_id))
  );

CREATE POLICY "push_messages: teacher·ta만 생성"
  ON public.push_messages FOR INSERT WITH CHECK (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant')
        AND (class_id IS NULL OR ta_has_class_access(class_id)))
  );

CREATE POLICY "push_messages: teacher·ta만 수정"
  ON public.push_messages FOR UPDATE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant'))
    OR student_id = auth.uid()
  );

CREATE POLICY "push_messages: teacher·ta만 삭제"
  ON public.push_messages FOR DELETE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant'))
  );

-- ============================================================
-- 17. schedules
-- ============================================================
DROP POLICY IF EXISTS "schedules: 역할별 조회"        ON public.schedules;
DROP POLICY IF EXISTS "schedules: teacher·ta만 생성"  ON public.schedules;
DROP POLICY IF EXISTS "schedules: teacher·ta만 수정"  ON public.schedules;
DROP POLICY IF EXISTS "schedules: teacher·ta만 삭제"  ON public.schedules;

CREATE POLICY "schedules: 역할별 조회"
  ON public.schedules FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    OR (get_my_role() = 'student' AND (class_id IS NULL OR i_am_in_class(class_id)))
    OR (get_my_role() = 'parent'  AND (class_id IS NULL OR my_child_is_in_class(class_id)))
  );

CREATE POLICY "schedules: teacher·ta만 생성"
  ON public.schedules FOR INSERT WITH CHECK (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant')
        AND (class_id IS NULL OR ta_has_class_access(class_id)))
  );

CREATE POLICY "schedules: teacher·ta만 수정"
  ON public.schedules FOR UPDATE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant')
        AND (class_id IS NULL OR ta_has_class_access(class_id)))
  );

CREATE POLICY "schedules: teacher·ta만 삭제"
  ON public.schedules FOR DELETE USING (
    get_my_role() = 'teacher'
    OR (get_my_role() IN ('ta_desk', 'ta_assistant')
        AND (class_id IS NULL OR ta_has_class_access(class_id)))
  );

-- ============================================================
-- 18. extra_schedules
-- ============================================================
DROP POLICY IF EXISTS "extra_schedules: 역할별 조회" ON public.extra_schedules;
DROP POLICY IF EXISTS "extra_schedules: 본인만 생성" ON public.extra_schedules;
DROP POLICY IF EXISTS "extra_schedules: 본인만 수정" ON public.extra_schedules;
DROP POLICY IF EXISTS "extra_schedules: 본인만 삭제" ON public.extra_schedules;

CREATE POLICY "extra_schedules: 역할별 조회"
  ON public.extra_schedules FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    OR user_id = auth.uid()
  );

CREATE POLICY "extra_schedules: 본인만 생성"
  ON public.extra_schedules FOR INSERT WITH CHECK (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    AND user_id = auth.uid()
  );

CREATE POLICY "extra_schedules: 본인만 수정"
  ON public.extra_schedules FOR UPDATE USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    AND user_id = auth.uid()
  );

CREATE POLICY "extra_schedules: 본인만 삭제"
  ON public.extra_schedules FOR DELETE USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    AND user_id = auth.uid()
  );

-- ============================================================
-- 19. staff_status
-- ============================================================
DROP POLICY IF EXISTS "staff_status: 본인만 생성" ON public.staff_status;
DROP POLICY IF EXISTS "staff_status: 본인만 수정" ON public.staff_status;
DROP POLICY IF EXISTS "staff_status: 본인만 삭제" ON public.staff_status;

CREATE POLICY "staff_status: 본인만 생성"
  ON public.staff_status FOR INSERT WITH CHECK (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    AND user_id = auth.uid()
  );

CREATE POLICY "staff_status: 본인만 수정"
  ON public.staff_status FOR UPDATE USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    AND user_id = auth.uid()
  );

CREATE POLICY "staff_status: 본인만 삭제"
  ON public.staff_status FOR DELETE USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    AND user_id = auth.uid()
  );

-- ============================================================
-- 20. parent_links
-- ============================================================
DROP POLICY IF EXISTS "parent_links: 역할별 조회" ON public.parent_links;

CREATE POLICY "parent_links: 역할별 조회"
  ON public.parent_links FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant')
    OR (get_my_role() = 'parent'  AND parent_id = auth.uid())
    OR (get_my_role() = 'student' AND student_id = auth.uid())
  );

-- ============================================================
-- 21. textbooks
-- ============================================================
DROP POLICY IF EXISTS "teacher/ta만 등록" ON public.textbooks;
DROP POLICY IF EXISTS "teacher/ta만 삭제" ON public.textbooks;

CREATE POLICY "teacher/ta만 등록"
  ON public.textbooks FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role IN ('teacher', 'ta_desk', 'ta_assistant')
    )
  );

CREATE POLICY "teacher/ta만 삭제"
  ON public.textbooks FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM public.users
      WHERE role IN ('teacher', 'ta_desk', 'ta_assistant')
    )
  );

-- ============================================================
-- 22. tests
-- ============================================================
DROP POLICY IF EXISTS "staff can manage tests" ON public.tests;

CREATE POLICY "staff can manage tests"
  ON public.tests
  USING (get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant'))
  WITH CHECK (get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant'));

GRANT ALL ON public.users TO authenticated, service_role;
