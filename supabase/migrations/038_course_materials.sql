CREATE TABLE IF NOT EXISTS public.course_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name text NOT NULL,
  title text NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

GRANT ALL ON public.course_materials TO authenticated, service_role;
