-- ta_admin → ta_desk 역할명 변경

-- 1. 기존 제약 제거 (ta_admin 허용 중인 상태)
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. 데이터 업데이트 (제약 없는 상태에서 변경)
UPDATE public.users
   SET role = 'ta_desk'
 WHERE role = 'ta_admin';

-- 3. 새 제약 추가 (ta_desk 포함, ta_admin 제외)
ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
    CHECK (role IN ('teacher', 'ta_desk', 'ta_assistant', 'student', 'parent'));

-- 4. auth.users user_metadata 업데이트 (Supabase Auth 세션 토큰)
UPDATE auth.users
   SET raw_user_meta_data = jsonb_set(
     raw_user_meta_data,
     '{role}',
     '"ta_desk"'
   )
 WHERE raw_user_meta_data->>'role' = 'ta_admin';

GRANT ALL ON public.users TO authenticated, service_role;
