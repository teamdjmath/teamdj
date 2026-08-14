-- 080_qna_ai_answer.sql
-- 질문 등록 시 AI가 1차 답변 초안을 자동으로 작성해 qna_answers에 바로 저장한다.
-- AI가 작성한 시점엔 아직 사람 조교가 배정되지 않으므로 ta_id를 nullable로 바꾼다.
alter table public.qna_answers alter column ta_id drop not null;

comment on column public.qna_answers.ta_id is
  'null이면 AI가 작성한 미확정 초안(is_ai_draft=true) — 조교가 확정/수정하면 그 조교 id로 채워짐';

-- 학생이 "조교님께 추가 답변 요청하기"를 누른 시각 — 뱃지 표시 및 조교 대기열 구분용.
-- 조교가 답변을 확정(qna_questions.status='answered')하면 다시 null로 돌아간다.
alter table public.qna_questions add column if not exists additional_requested_at timestamptz;

comment on column public.qna_questions.additional_requested_at is
  '학생이 AI 초안에 만족하지 못해 조교 답변을 요청한 시각 (null이면 요청 안 함)';
