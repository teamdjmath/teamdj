-- 1. 출석: absent_video 상태 추가
ALTER TABLE public.attendance_logs
  DROP CONSTRAINT IF EXISTS attendance_logs_status_check;

ALTER TABLE public.attendance_logs
  ADD CONSTRAINT attendance_logs_status_check
    CHECK (status IN ('present', 'absent', 'late', 'absent_video'));

-- 2. 과제 진행도: NULL 허용 (NULL = 미지참)
ALTER TABLE public.assignment_progress
  DROP CONSTRAINT IF EXISTS assignment_progress_completion_pct_check;

ALTER TABLE public.assignment_progress
  ALTER COLUMN completion_pct DROP NOT NULL;

ALTER TABLE public.assignment_progress
  ADD CONSTRAINT assignment_progress_completion_pct_check
    CHECK (completion_pct IS NULL OR (completion_pct >= 0 AND completion_pct <= 100));
