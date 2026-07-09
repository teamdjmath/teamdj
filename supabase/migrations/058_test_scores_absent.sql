-- =============================================================
-- 058: 테스트 미응시 기록
-- 점수 입력 화면에서 "미응시"를 선택하면 점수 없이 미응시 여부와
-- 사유를 저장한다. 미응시 행은 평균/최고/최저 계산에서 제외된다.
-- =============================================================

alter table public.test_scores alter column score drop not null;

alter table public.test_scores add column is_absent boolean not null default false;
alter table public.test_scores add column absence_reason text;

-- 미응시면 score는 null, 응시면 score 필수
alter table public.test_scores add constraint test_scores_score_or_absent
  check ((is_absent and score is null) or (not is_absent and score is not null));

comment on column public.test_scores.is_absent      is '미응시 여부 (true면 score는 null)';
comment on column public.test_scores.absence_reason is '미응시 사유 (선택)';
