-- 016_grant_permissions.sql

-- student_todos 테이블 권한 부여
GRANT ALL ON public.student_todos TO authenticated;
GRANT ALL ON public.student_todos TO service_role;

-- assignment_categories 테이블 권한 부여
GRANT ALL ON public.assignment_categories TO authenticated;
GRANT ALL ON public.assignment_categories TO service_role;

-- RLS는 이미 015에서 활성화되었으나, 권한 문제가 발생할 수 있으므로 다시 확인
-- (Supabase에서는 기본적으로 authenticated 역할에 권한이 부여되지만 명시적으로 추가)
