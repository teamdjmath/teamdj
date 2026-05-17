-- 교재 마스터 테이블 (전체 공용)
CREATE TABLE IF NOT EXISTS textbooks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- RLS
ALTER TABLE textbooks ENABLE ROW LEVEL SECURITY;

-- 모든 로그인 유저 조회 가능
CREATE POLICY "로그인 유저 조회" ON textbooks
  FOR SELECT USING (auth.role() = 'authenticated');

-- teacher/ta만 등록 가능
CREATE POLICY "teacher/ta만 등록" ON textbooks
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('teacher', 'ta')
    )
  );

-- teacher/ta만 삭제 가능
CREATE POLICY "teacher/ta만 삭제" ON textbooks
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM users WHERE role IN ('teacher', 'ta')
    )
  );

-- qna_questions 교재 컬럼 추가 (FK)
ALTER TABLE qna_questions
  ADD COLUMN IF NOT EXISTS textbook_id uuid references textbooks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS problem_number text;

-- 기존 qna_questions SELECT policy 삭제 후 분반 전체 조회로 확장
DROP POLICY IF EXISTS "qna_questions: 역할별 조회" ON qna_questions;

CREATE POLICY "qna_questions: 역할별 조회"
  ON public.qna_questions FOR SELECT USING (
    get_my_role() IN ('teacher', 'ta')
    OR (
      get_my_role() = 'student'
      AND (
        -- 본인 질문
        student_id = auth.uid()
        OR
        -- 같은 분반 학생 질문
        EXISTS (
          SELECT 1 FROM class_members cm1
          JOIN class_members cm2 ON cm1.class_id = cm2.class_id
          WHERE cm1.student_id = auth.uid()
            AND cm2.student_id = qna_questions.student_id
        )
      )
    )
    OR (get_my_role() = 'parent' AND is_my_child(student_id))
  );
