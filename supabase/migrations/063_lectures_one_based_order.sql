-- =============================================================
-- 063: 강의 번호 1강부터 시작
-- 유튜브 플레이리스트 동기화가 0-기반 position을 그대로 저장해
-- "0강"부터 표시되던 문제 — 0부터 시작하는 강좌만 전체 +1 한다.
-- (이미 1강부터인 강좌는 건드리지 않음)
-- =============================================================

WITH zero_groups AS (
  SELECT coalesce(course_name, class_id::text, 'none') AS grp
  FROM public.lectures
  GROUP BY 1
  HAVING min(order_num) = 0
)
UPDATE public.lectures l
SET order_num = order_num + 1
WHERE coalesce(l.course_name, l.class_id::text, 'none') IN (SELECT grp FROM zero_groups);
