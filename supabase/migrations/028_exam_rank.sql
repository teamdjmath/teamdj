ALTER TABLE exam_results
  ADD COLUMN IF NOT EXISTS rank_in_exam int,
  ADD COLUMN IF NOT EXISTS total_in_exam int,
  ADD COLUMN IF NOT EXISTS auto_rank boolean default false;
