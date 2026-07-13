-- =============================================================
-- 064: 061·062 테이블 service_role 권한 누락 보완
-- 이 DB는 기본 권한(default privileges)이 자동 부여되지 않아
-- 관리자 클라이언트(service_role) 조회가 permission denied로 실패함.
-- (034_missing_grants와 동일한 계열의 보완)
-- =============================================================

GRANT ALL ON public.schedule_absences      TO authenticated, service_role;
GRANT ALL ON public.lecture_student_access TO authenticated, service_role;
