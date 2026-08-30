-- =============================================================
-- 089: 쪽지 이미지 첨부 (1:1 문의 답장 등에서 이미지 첨부 가능하도록)
-- =============================================================

alter table public.push_messages add column image_urls text[] not null default '{}';
comment on column public.push_messages.image_urls is '첨부 이미지 URL 배열';

-- 쪽지 첨부 이미지용 public 버킷 (notice-images와 동일한 정책)
INSERT INTO storage.buckets (id, name, public)
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Message Images Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'message-images' );

CREATE POLICY "Message Images Auth Insert"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'message-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Message Images Auth Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'message-images' AND auth.role() = 'authenticated' );
