-- =============================================================
-- QnA 첨부 이미지 저장을 위한 public 버킷 생성
-- =============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('qna-images', 'qna-images', true)
ON CONFLICT (id) DO NOTHING;

-- 버킷 접근 권한 설정 (선택사항, 이미 정책이 있다면 무방하나 public 읽기 및 인증된 사용자 쓰기 권한 추가 권장)
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'qna-images' );

CREATE POLICY "Auth Insert" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'qna-images' AND auth.role() = 'authenticated' );

CREATE POLICY "Auth Delete" 
ON storage.objects FOR DELETE 
USING ( bucket_id = 'qna-images' AND auth.role() = 'authenticated' );
