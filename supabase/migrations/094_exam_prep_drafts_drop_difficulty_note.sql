-- 모의고사 성적 추이(그래프/표)를 안 쓰기로 하면서 난이도·시험지 특이사항 입력 자체가
-- 필요 없어졌다 (시험명/점수만 사용). 임시저장 테이블에서도 해당 컬럼을 제거한다.
ALTER TABLE public.exam_prep_drafts
  DROP COLUMN IF EXISTS mock_difficulty,
  DROP COLUMN IF EXISTS mock_note;
