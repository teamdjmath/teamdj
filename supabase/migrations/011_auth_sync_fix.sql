-- =============================================================
-- 011: auth.users 삭제 시 public.users 연동 트리거 + 고아 레코드 정리
-- =============================================================

-- ── 1. auth.users DELETE → public.users 자동 삭제 트리거
--    public.users.id가 auth.users를 FK로 참조하지만 ON DELETE CASCADE가
--    없는 경우를 위한 안전망. 이미 CASCADE가 있다면 중복 실행이지만 무해.
CREATE OR REPLACE FUNCTION public.handle_delete_user()
RETURNS trigger AS $$
BEGIN
  DELETE FROM public.users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_delete_user();

-- ── 2. 고아 레코드 정리
--    public.users에는 있지만 auth.users에는 없는 행 삭제
--    (FK 제약이 있으면 이 구문은 실제로 0건이어야 정상)
DELETE FROM public.users
WHERE id NOT IN (SELECT id FROM auth.users);

-- ── 진단용 뷰: 고아 레코드 확인 (실행 후 직접 확인용)
-- SELECT pu.id, pu.name, pu.phone, pu.role, pu.created_at
-- FROM public.users pu
-- LEFT JOIN auth.users au ON au.id = pu.id
-- WHERE au.id IS NULL;
