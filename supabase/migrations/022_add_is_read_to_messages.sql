-- =============================================================
-- push_messages 테이블에 읽음 상태 컬럼 추가
-- =============================================================

ALTER TABLE public.push_messages
ADD COLUMN is_read boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.push_messages.is_read IS '메시지 읽음 여부';

-- RLS 정책 업데이트 (학생이 자신의 메시지를 읽음 처리할 수 있도록 update 권한 추가)
CREATE POLICY "push_messages: 학생 본인 메시지 읽음 처리"
  ON public.push_messages FOR UPDATE
  USING ( student_id = auth.uid() )
  WITH CHECK ( student_id = auth.uid() );
