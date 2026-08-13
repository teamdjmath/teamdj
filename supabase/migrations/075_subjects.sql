-- 과목 마스터 테이블 (전체 공용) — textbooks(026)와 동일한 패턴.
-- 교재와 별개로 Q&A 등록 시 "교재 > 과목 > 문항번호" 순으로 선택할 수 있게 한다.
CREATE TABLE IF NOT EXISTS subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "로그인 유저 조회" ON subjects
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "teacher/ta만 등록" ON subjects
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant')
    )
  );

CREATE POLICY "teacher/ta만 삭제" ON subjects
  FOR DELETE USING (
    auth.uid() IN (
      SELECT id FROM public.users WHERE role IN ('teacher', 'ta_desk', 'ta_assistant')
    )
  );

GRANT ALL ON subjects TO authenticated;
GRANT ALL ON subjects TO service_role;

-- qna_questions에 과목 컬럼 추가 (교재와 별개)
ALTER TABLE qna_questions
  ADD COLUMN IF NOT EXISTS subject_id uuid references subjects(id) ON DELETE SET NULL;

-- 기본 과목 시드 (2015/2022 개정 고교 수학 과목명)
INSERT INTO subjects (name) VALUES
  ('수학1'), ('수학2'), ('확률과 통계'), ('미적분'), ('기하'), ('공통수학1'), ('공통수학2')
ON CONFLICT (name) DO NOTHING;

-- 기본 교재(DJ MATERIALS D시리즈) 시드 — 매번 수동 등록하지 않아도 항상 존재하도록
INSERT INTO textbooks (name) VALUES
  ('DEEP'), ('DETAIL'), ('DEVELOP'), ('DERIVE'), ('DEVOTE'), ('DECISIVE'), ('DETERMINE')
ON CONFLICT (name) DO NOTHING;
