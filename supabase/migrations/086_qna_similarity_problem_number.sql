-- find_similar_qna_candidates가 textbook_id/problem_number를 안 돌려줘서, 앱 쪽에서
-- "같은 교재인데 문항번호가 다르면 다른 문제"라는 확실한 신호를 전혀 못 썼다. 그 결과 같은
-- 챕터를 다루는 질문끼리(예: 둘 다 "수열의 극한", 둘 다 "일반항을 구하다" 언급) 실제로는
-- 전혀 다른 문항인데도 텍스트 유사도만으로 오매칭되는 사고가 있었다 (91번 문제에 98번 문제
-- 질문이 자동 연결됨). 반환 컬럼을 추가해 앱에서 문항번호 불일치를 강한 배제 신호로 쓰게 한다.
drop function if exists public.find_similar_qna_candidates(text, uuid, int);

create function public.find_similar_qna_candidates(
  p_query text,
  p_exclude_id uuid,
  p_limit int default 20
)
returns table (id uuid, title text, content text, sim real, textbook_id uuid, problem_number text)
language sql
stable
as $$
  select q.id,
         q.title,
         q.content,
         similarity(q.title || ' ' || coalesce(q.content, ''), p_query) as sim,
         q.textbook_id,
         q.problem_number
  from public.qna_questions q
  where q.status = 'answered'
    and q.id <> p_exclude_id
  order by (q.title || ' ' || coalesce(q.content, '')) <-> p_query
  limit p_limit;
$$;

grant execute on function public.find_similar_qna_candidates(text, uuid, int) to authenticated, service_role;
