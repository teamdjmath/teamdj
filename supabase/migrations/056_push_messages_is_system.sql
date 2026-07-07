-- 056_push_messages_is_system.sql
-- "질문에 답변 등록됨", "[공지] ..." 같은 시스템 자동 알림과, 조교/선생님이 직접 작성해서
-- 보내는 쪽지가 같은 push_messages 테이블에 섞여 있어서, "쪽지 발송 내역"(sender_id 기준
-- 내가 보낸 것 조회)에 시스템 알림까지 같이 떠서 답변한 TA 개인의 발송함이 지저분해짐.
-- 누가 실제로 답변/공지했는지 기록(sender_id)은 그대로 남기되, 시스템 알림 여부만 구분해서
-- "내 발송함" 화면에서는 시스템 알림을 제외한다.

ALTER TABLE public.push_messages
  ADD COLUMN IF NOT EXISTS is_system boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.push_messages.is_system IS
  '시스템이 자동 생성한 알림이면 true (예: 답변 등록, 공지 등록). sender_id는 그대로 실제 처리자를 가리키지만, "내 발송함" 조회 시 제외 대상.';
