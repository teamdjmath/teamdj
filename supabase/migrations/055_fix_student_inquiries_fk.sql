-- 055_fix_student_inquiries_fk.sql
-- student_inquiries.user_id가 auth.users(id)를 참조하고 있어서, PostgREST가
-- public.users와의 관계를 스키마 캐시에서 찾지 못해 `users!user_id(...)` embed 쿼리가
-- 항상 PGRST200 에러로 실패하고 있었다 (apps/web/src/app/admin/consultations/page.tsx).
-- 에러를 확인하지 않는 코드라 화면에는 그냥 빈 목록으로 보였음 — 데이터 자체는 삭제된 적 없음.
-- 다른 모든 테이블처럼 public.users(id)를 참조하도록 FK를 교체한다.

ALTER TABLE public.student_inquiries
  DROP CONSTRAINT IF EXISTS student_inquiries_user_id_fkey;

ALTER TABLE public.student_inquiries
  ADD CONSTRAINT student_inquiries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 스태프(teacher/ta_desk/ta_assistant)도 전체 문의를 조회할 수 있도록 정책 추가
-- (기존엔 본인만 조회 가능해서, RLS를 타는 일반 클라이언트로는 스태프가 애초에 못 봤음)
CREATE POLICY "Staff read all inquiries"
  ON public.student_inquiries FOR SELECT
  TO authenticated
  USING (get_my_role() IN ('teacher', 'ta_desk', 'ta_assistant'));
