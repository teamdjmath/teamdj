-- =============================================================
-- 003_alter_tables.sql
-- 앱 코드와 스키마 간 컬럼 차이 보정
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- exam_results: 누락된 컬럼 추가
--   · class_id       분반 연결 (시험 통계 그룹핑용)
--   · exam_type      시험 유형 (mock/midterm/final/other)
--   · max_score      만점 기준점수 (기본 100)
--   · created_by     등록한 스태프 ID
-- ──────────────────────────────────────────────────────────────
alter table public.exam_results
  add column if not exists class_id   uuid        references public.class_groups(id) on delete set null,
  add column if not exists exam_type  text        not null default 'mock'
                                        check (exam_type in ('mock', 'midterm', 'final', 'other')),
  add column if not exists max_score  numeric(5,2) not null default 100,
  add column if not exists created_by uuid        references public.users(id) on delete set null;

comment on column public.exam_results.class_id   is '시험을 치른 분반 (통계 그룹핑용)';
comment on column public.exam_results.exam_type  is 'mock=모의고사, midterm=중간고사, final=기말고사, other=기타';
comment on column public.exam_results.max_score  is '시험 만점 기준 (기본 100)';
comment on column public.exam_results.created_by is '결과를 등록한 선생님/TA';

create index if not exists exam_results_class_id_idx on public.exam_results (class_id);

-- ──────────────────────────────────────────────────────────────
-- push_messages: 컬럼명 앱 코드와 통일
--   target_class_id   → class_id
--   target_student_id → student_id
--   message           → content
--   sent_at           → created_at
-- ──────────────────────────────────────────────────────────────
alter table public.push_messages
  rename column target_class_id   to class_id;

alter table public.push_messages
  rename column target_student_id to student_id;

alter table public.push_messages
  rename column message           to content;

alter table public.push_messages
  rename column sent_at           to created_at;

-- 컬럼 이름 변경 후 기존 RLS 정책은 old 컬럼명을 참조하므로 재생성
drop policy if exists "push_messages: 역할별 조회"    on public.push_messages;
drop policy if exists "push_messages: teacher·ta만 생성" on public.push_messages;
drop policy if exists "push_messages: teacher·ta만 수정" on public.push_messages;
drop policy if exists "push_messages: teacher·ta만 삭제" on public.push_messages;

create policy "push_messages: 역할별 조회"
  on public.push_messages for select using (
    get_my_role() in ('teacher', 'ta')
    or (get_my_role() = 'student' and (
          student_id = auth.uid()
          or (class_id is not null and i_am_in_class(class_id))
        ))
    or (get_my_role() = 'parent' and (
          is_my_child(student_id)
          or (class_id is not null and my_child_is_in_class(class_id))
        ))
  );

create policy "push_messages: teacher·ta만 생성"
  on public.push_messages for insert with check (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and (
          class_id is null
          or ta_has_class_access(class_id)
        ))
  );

create policy "push_messages: teacher·ta만 수정"
  on public.push_messages for update using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and (
          class_id is null
          or ta_has_class_access(class_id)
        ))
  );

create policy "push_messages: teacher·ta만 삭제"
  on public.push_messages for delete using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and (
          class_id is null
          or ta_has_class_access(class_id)
        ))
  );
