-- 018_add_material_url_to_lectures.sql

ALTER TABLE public.lectures ADD COLUMN material_url TEXT;

COMMENT ON COLUMN public.lectures.material_url IS '강의 자료 링크 (PDF, 드라이브 등)';
