CREATE TABLE IF NOT EXISTS public.student_inquiries (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  student_name text       NOT NULL,
  content     text        NOT NULL,
  is_read     boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.student_inquiries ENABLE ROW LEVEL SECURITY;

-- 본인 문의만 조회 가능
CREATE POLICY "Students read own inquiries"
  ON public.student_inquiries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- 본인만 문의 등록 가능
CREATE POLICY "Students insert own inquiries"
  ON public.student_inquiries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT ALL ON public.student_inquiries TO authenticated, service_role;
