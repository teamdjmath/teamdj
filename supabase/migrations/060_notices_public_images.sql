-- =============================================================
-- 059: 공지사항 확장 — 홈페이지 공개 공지 + 이미지 첨부
-- is_public=true인 공지는 로그인 없이 보는 공개 공지 페이지(/notices)에 노출된다.
-- =============================================================

alter table public.notices add column is_public boolean not null default false;
alter table public.notices add column image_urls text[] not null default '{}';

comment on column public.notices.is_public   is '홈페이지 공개 공지 여부 (로그인 없이 열람 가능)';
comment on column public.notices.image_urls  is '첨부 이미지 URL 배열';

-- 공지 첨부 이미지용 public 버킷 (qna-images와 동일한 정책)
INSERT INTO storage.buckets (id, name, public)
VALUES ('notice-images', 'notice-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Notice Images Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'notice-images' );

CREATE POLICY "Notice Images Auth Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'notice-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Notice Images Auth Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'notice-images' AND auth.role() = 'authenticated' );
