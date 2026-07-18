-- 070_exam_estimated_grade.sql
-- 특별시험 "예상 등급" — 학원 내부 등수/등급컷과는 별개로, 해당 시험 응시자 집단의
-- 점수 분포(평균·표준편차)를 정규분포로 근사해 산출한 전국/학교 단위 등급 추정치.
-- "등수 자동 산정"(autoRankExam) 실행 시 함께 계산·저장되며, 학생에게는 반드시
-- "추정치이며 실제 등급과 다를 수 있다"는 고지와 함께 노출한다.

ALTER TABLE public.exam_results
  ADD COLUMN IF NOT EXISTS estimated_grade      text,
  ADD COLUMN IF NOT EXISTS estimated_percentile numeric(5,2);

COMMENT ON COLUMN public.exam_results.estimated_grade
  IS '정규분포 근사 기반 추정 등급 (예: "3등급") — 학원 등급컷(grade_cuts)과 별개, 고지 필수';
COMMENT ON COLUMN public.exam_results.estimated_percentile
  IS '추정 백분위(상위 %) — z-score를 표준정규분포 CDF에 대입해 산출';

GRANT ALL ON public.exam_results TO authenticated, service_role;
