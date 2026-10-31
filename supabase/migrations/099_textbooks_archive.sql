-- 교재를 삭제하면 사용 중인 QnA 질문이 있을 때 deleteTextbook이 막아버려서(참조 무결성은
-- 안전) 교재 개편 때마다 옛 교재가 목록에 영원히 쌓인다. 삭제 대신 "보관" 처리할 수 있게
-- is_active를 추가 — false면 학생 QnA 등록 드롭다운에서만 숨기고, 기존 질문 데이터/연결은
-- 그대로 유지한다.
alter table public.textbooks
  add column if not exists is_active boolean not null default true;

comment on column public.textbooks.is_active is '사용 중지(보관) 여부 — false면 학생 QnA 등록 교재 선택지에서 숨김';

drop policy if exists "teacher/ta만 수정" on public.textbooks;

create policy "teacher/ta만 수정"
  on public.textbooks for update using (
    auth.uid() in (
      select id from public.users where role in ('teacher', 'ta_desk', 'ta_assistant')
    )
  ) with check (
    auth.uid() in (
      select id from public.users where role in ('teacher', 'ta_desk', 'ta_assistant')
    )
  );
