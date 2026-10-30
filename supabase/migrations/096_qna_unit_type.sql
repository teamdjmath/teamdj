-- QnA 질문에 "몇 권/몇 강"(unit) 정보 추가 — 같은 교재+같은 문항번호라도 권/강이 다르면
-- 완전히 다른 문제인데 지금은 구분할 방법이 없어, 다른 강의/권의 해설이 잘못 자동 연결되는
-- 사고가 생긴다 (질문이 많아질수록 textbook_id+problem_number만으로 충돌할 확률이 커짐).
ALTER TABLE public.qna_questions
  ADD COLUMN IF NOT EXISTS unit_type text CHECK (unit_type IN ('volume', 'lesson')),
  ADD COLUMN IF NOT EXISTS unit_number integer CHECK (unit_number IS NULL OR unit_number > 0);

COMMENT ON COLUMN public.qna_questions.unit_type IS '교재가 몇 권/몇 강 단위로 나뉘는지 — volume(권) 또는 lesson(강)';
COMMENT ON COLUMN public.qna_questions.unit_number IS 'unit_type에 해당하는 번호 (예: 2권이면 2, 5강이면 5)';

-- find_similar_qna_candidates가 unit_type/unit_number도 반환하도록 — 유사도 매칭에서
-- "같은 교재+같은 문항번호여도 권/강이 다르면 다른 문제"를 배제 조건으로 쓸 수 있게 (086과 동일한 이유).
drop function if exists public.find_similar_qna_candidates(text, uuid, int);

create function public.find_similar_qna_candidates(
  p_query text,
  p_exclude_id uuid,
  p_limit int default 20
)
returns table (id uuid, title text, content text, sim real, textbook_id uuid, problem_number text, unit_type text, unit_number integer)
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
         q.unit_number
  from public.qna_questions q
  where q.status = 'answered'
    and q.id <> p_exclude_id
  order by (q.title || ' ' || coalesce(q.content, '')) <-> p_query
  limit p_limit;
$$;

grant execute on function public.find_similar_qna_candidates(text, uuid, int) to authenticated, service_role;
