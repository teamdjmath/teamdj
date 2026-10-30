-- 같은 교재 이름이 여러 과목에서 공용으로 쓰인다 (실제 데이터 확인: DEVELOP 등 7개 교재 중 4개가
-- 이미 2개 이상의 과목 질문에서 쓰이는 중). textbook_id+problem_number+unit만으로는 과목이 다른
-- "같은 교재 같은 권/강 같은 번호" 문제가 섞일 수 있어, subject_id도 반환해 배제 조건에 쓴다.
drop function if exists public.find_similar_qna_candidates(text, uuid, int);

create function public.find_similar_qna_candidates(
  p_query text,
  p_exclude_id uuid,
  p_limit int default 20
)
returns table (id uuid, title text, content text, sim real, textbook_id uuid, problem_number text, unit_type text, unit_number integer, subject_id uuid)
language sql
stable
as $$
  select q.id,
         q.title,
         q.content,
         similarity(q.title || ' ' || coalesce(q.content, ''), p_query) as sim,
         q.textbook_id,
         q.problem_number,
         q.unit_type,
         q.unit_number,
         q.subject_id
  from public.qna_questions q
  where q.status = 'answered'
    and q.id <> p_exclude_id
  order by (q.title || ' ' || coalesce(q.content, '')) <-> p_query
  limit p_limit;
$$;

grant execute on function public.find_similar_qna_candidates(text, uuid, int) to authenticated, service_role;
