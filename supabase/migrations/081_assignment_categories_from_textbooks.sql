-- 081_assignment_categories_from_textbooks.sql
-- 과제 카테고리 기본값을 질문 등록에 쓰는 교재 목록으로 채운다 (+ 기존 '기타' 유지).
-- 일회성 시드일 뿐 이후 자동 동기화는 아님 — 과제 카테고리는 계속 별도로 추가/삭제 가능.
insert into public.assignment_categories (name)
select t.name from public.textbooks t
on conflict (name) do nothing;
