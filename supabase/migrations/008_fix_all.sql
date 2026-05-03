-- =============================================================
-- 008_fix_all.sql
-- 1. users 컬럼 nullable 보장 (004, 007에서 처리됐지만 idempotent)
-- 2. handle_new_user: ON CONFLICT DO NOTHING → DO UPDATE
--    - adminSupabase.auth.admin.createUser() 호출 시 트리거가 먼저 INSERT,
--      이후 앱 코드의 upsert가 충돌하는 버그 수정
-- =============================================================

ALTER TABLE public.users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE public.users ALTER COLUMN phone        DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, name, role, phone, is_active, created_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    NEW.raw_user_meta_data->>'phone',
    true,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    name  = COALESCE(EXCLUDED.name,  public.users.name),
    role  = COALESCE(EXCLUDED.role,  public.users.role),
    phone = COALESCE(EXCLUDED.phone, public.users.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
