-- 모의고사를 하루에 여러 개 입력할 수 있게 되면서, 임시저장도 단일 컬럼(mock_status/label/score)
-- 대신 목록(jsonb)으로 보관한다. 기존 임시저장은 1건짜리 목록으로 옮긴다.
ALTER TABLE public.exam_prep_drafts
  ADD COLUMN IF NOT EXISTS mock_exams jsonb NOT NULL DEFAULT '[]';

UPDATE public.exam_prep_drafts
SET mock_exams = jsonb_build_array(
  jsonb_build_object('examLabel', mock_exam_label, 'status', mock_status, 'score', mock_score)
)
WHERE mock_status IN ('attended', 'absent');

ALTER TABLE public.exam_prep_drafts
  DROP COLUMN IF EXISTS mock_status,
  DROP COLUMN IF EXISTS mock_exam_label,
  DROP COLUMN IF EXISTS mock_score;
