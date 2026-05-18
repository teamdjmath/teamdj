-- consultations 테이블이 027에서 생성될 때 service_role/authenticated GRANT가 누락됨.
-- 005_grants.sql의 GRANT ALL ON ALL TABLES는 당시 존재하는 테이블에만 적용되므로
-- 이후 마이그레이션으로 생성된 테이블은 별도로 권한을 부여해야 함.
GRANT ALL ON consultations TO authenticated;
GRANT ALL ON consultations TO service_role;
