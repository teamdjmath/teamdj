-- Drop existing SELECT policies for qna_questions
DROP POLICY IF EXISTS "qna_questions: 역할별 조회" ON qna_questions;
DROP POLICY IF EXISTS "teacher/ta 전체 조회" ON qna_questions;
DROP POLICY IF EXISTS "staff_select_qna" ON qna_questions;

CREATE POLICY "staff_all_qna_select" ON qna_questions
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
    OR auth.uid() = student_id
    OR EXISTS (
      SELECT 1 FROM class_members cm1
      JOIN class_members cm2 ON cm1.class_id = cm2.class_id
      WHERE cm1.student_id = auth.uid()
      AND cm2.student_id = qna_questions.student_id
    )
  );

-- Drop and recreate qna_answers SELECT policy
DROP POLICY IF EXISTS "qna_answers: 전체 조회" ON qna_answers;

CREATE POLICY "staff_all_qna_answers_select" ON qna_answers
  FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta_admin', 'ta_assistant')
    OR EXISTS (
      SELECT 1 FROM qna_questions
      WHERE id = qna_answers.question_id
      AND student_id = auth.uid()
    )
  );
