-- 시험 난이도/특이사항 메모 — 관리자가 아는 실제 맥락(학교별 시험 특성, 난이도 등)을
-- 짧게 남겨두면 AI 분석 생성 시 참고해 좀 더 구체적인 피드백을 만든다.
alter table public.exam_results add column if not exists exam_difficulty text;

comment on column public.exam_results.exam_difficulty is '시험 난이도/특이사항 메모 (관리자 입력, 선택) — AI 분석 생성 시 참고용';

grant all on public.exam_results to authenticated, service_role;
