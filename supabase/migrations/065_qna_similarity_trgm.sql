-- Q&A 유사 질문 검색: pg_trgm 기반 후보 선별
-- 기존에는 최근 300건만 앱에서 비교했으나, trigram 인덱스로 전체 이력에서
-- 상위 후보를 뽑고 최종 판정은 앱(similarityScore)이 수행한다.

create extension if not exists pg_trgm;

-- KNN 정렬(<-> 연산자)을 쓰기 위해 GiST 인덱스 사용.
-- siglen을 키워 긴 본문에서도 선별 정확도를 확보한다.
create index if not exists idx_qna_questions_title_content_trgm
  on public.qna_questions
  using gist ((title || ' ' || coalesce(content, '')) gist_trgm_ops(siglen=256));

-- 답변 완료된 질문 중 주어진 텍스트와 가장 비슷한 후보 상위 N건
create or replace function public.find_similar_qna_candidates(
  p_query text,
  p_exclude_id uuid,
  p_limit int default 20
)
returns table (id uuid, title text, content text, sim real)
language sql
stable
as $$
  select q.id,
         q.title,
         q.content,
         similarity(q.title || ' ' || coalesce(q.content, ''), p_query) as sim
  from public.qna_questions q
  where q.status = 'answered'
    and q.id <> p_exclude_id
  order by (q.title || ' ' || coalesce(q.content, '')) <-> p_query
  limit p_limit;
$$;

-- 이 DB는 default privileges가 없어 명시적 grant 필요 (034, 064와 동일)
grant execute on function public.find_similar_qna_candidates(text, uuid, int) to authenticated, service_role;
