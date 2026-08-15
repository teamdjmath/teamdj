-- 추가 답변 요청 후 20시간 경과 미답변 시 선생님께 카카오 리마인드 — 매시 정각 cron이 스캔하므로
-- 같은 건을 반복 발송하지 않도록 발송 여부를 기록한다. 새 추가 요청 사이클이 시작되면(재요청)
-- null로 리셋해 다시 알림 대상이 되게 한다.
alter table public.qna_questions add column if not exists reminder_sent_at timestamptz;
comment on column public.qna_questions.reminder_sent_at is
  '추가 답변 요청 후 20시간 경과 리마인드를 이미 보냈으면 그 시각 (null이면 미발송) — additional_requested_at이 갱신되면 함께 null로 리셋';
