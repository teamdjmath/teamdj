-- 005_grants.sql의 GRANT ALL ON ALL TABLES는 실행 시점 이후 생성된 테이블에는 적용되지 않음.
-- 아래 테이블들은 005 이후 마이그레이션에서 생성됐으나 service_role 또는 authenticated GRANT가 누락됨.

-- extra_schedules (023): authenticated만 있음, service_role 누락
GRANT ALL ON extra_schedules TO service_role;

-- notifications (024): authenticated만 있음, service_role 누락
GRANT ALL ON notifications TO service_role;

-- textbooks (026): 둘 다 누락
GRANT ALL ON textbooks TO authenticated;
GRANT ALL ON textbooks TO service_role;
