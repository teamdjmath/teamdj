-- =============================================================
-- TeamDJ RLS 정책
-- auth.uid() → public.users.id 로 역할을 판단
-- =============================================================

-- =============================================================
-- 헬퍼 함수 (security definer → RLS 재귀 방지)
-- =============================================================

-- 현재 로그인 유저의 role 반환
create or replace function public.get_my_role()
returns text
language sql security definer stable
set search_path = public
as $$
  select role from public.users where id = auth.uid()
$$;

-- TA가 특정 class_id 에 접근 가능한지 확인
create or replace function public.ta_has_class_access(p_class_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.ta_class_access
    where ta_id = auth.uid()
      and (is_all_classes = true or class_id = p_class_id)
  )
$$;

-- TA가 특정 student_id 에 접근 가능한지 확인 (class_id 없는 테이블용)
create or replace function public.ta_has_student_access(p_student_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  -- is_all_classes = true 이면 모든 학생 접근 허용
  select exists (
    select 1 from public.ta_class_access
    where ta_id = auth.uid() and is_all_classes = true
  )
  -- 또는 학생이 TA 배정 반에 속해 있으면 허용
  or exists (
    select 1
    from public.ta_class_access tca
    join public.class_members cm
      on cm.class_id = tca.class_id
    where tca.ta_id = auth.uid()
      and cm.student_id = p_student_id
      and cm.is_active = true
  )
$$;

-- 현재 유저(학생)가 특정 반에 속해 있는지 확인
create or replace function public.i_am_in_class(p_class_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class_id
      and student_id = auth.uid()
      and is_active = true
  )
$$;

-- 현재 유저(학부모)의 자녀 여부 확인
create or replace function public.is_my_child(p_student_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1 from public.parent_links
    where parent_id = auth.uid()
      and student_id = p_student_id
  )
$$;

-- 현재 유저(학부모)의 자녀가 특정 반에 속해 있는지 확인
create or replace function public.my_child_is_in_class(p_class_id uuid)
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists (
    select 1
    from public.parent_links pl
    join public.class_members cm
      on cm.student_id = pl.student_id
    where pl.parent_id = auth.uid()
      and cm.class_id = p_class_id
      and cm.is_active = true
  )
$$;


-- =============================================================
-- 1. users
-- =============================================================

-- teacher/ta: 전체 조회 | student/parent: 본인만
create policy "users: teacher·ta는 전체 조회, 나머지는 본인만"
  on public.users for select using (
    get_my_role() in ('teacher', 'ta')
    or id = auth.uid()
  );

-- teacher: 전체 수정 | 나머지: 본인만
create policy "users: teacher는 전체 수정, 나머지는 본인만"
  on public.users for update using (
    get_my_role() = 'teacher'
    or id = auth.uid()
  );

-- teacher만 신규 유저 생성
create policy "users: teacher만 생성"
  on public.users for insert with check (
    get_my_role() = 'teacher'
  );

-- teacher만 유저 삭제
create policy "users: teacher만 삭제"
  on public.users for delete using (
    get_my_role() = 'teacher'
  );


-- =============================================================
-- 2. class_groups
-- =============================================================

-- teacher: 전체 | ta: 배정 반 | student/parent: 본인 소속 반
create policy "class_groups: 역할별 조회"
  on public.class_groups for select using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta'      and ta_has_class_access(id))
    or (get_my_role() = 'student' and i_am_in_class(id))
    or (get_my_role() = 'parent'  and my_child_is_in_class(id))
  );

create policy "class_groups: teacher만 생성"
  on public.class_groups for insert with check (get_my_role() = 'teacher');

create policy "class_groups: teacher만 수정"
  on public.class_groups for update using (get_my_role() = 'teacher');

create policy "class_groups: teacher만 삭제"
  on public.class_groups for delete using (get_my_role() = 'teacher');


-- =============================================================
-- 3. class_members
-- =============================================================

-- teacher: 전체 | ta: 배정 반 | student: 본인 row만
create policy "class_members: 역할별 조회"
  on public.class_members for select using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta'      and ta_has_class_access(class_id))
    or (get_my_role() = 'student' and student_id = auth.uid())
    or (get_my_role() = 'parent'  and is_my_child(student_id))
  );

create policy "class_members: teacher만 생성"
  on public.class_members for insert with check (get_my_role() = 'teacher');

create policy "class_members: teacher만 수정"
  on public.class_members for update using (get_my_role() = 'teacher');

create policy "class_members: teacher만 삭제"
  on public.class_members for delete using (get_my_role() = 'teacher');


-- =============================================================
-- 4. ta_class_access
-- =============================================================

-- teacher: 전체 | ta: 본인 row만
create policy "ta_class_access: 역할별 조회"
  on public.ta_class_access for select using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_id = auth.uid())
  );

create policy "ta_class_access: teacher만 생성"
  on public.ta_class_access for insert with check (get_my_role() = 'teacher');

create policy "ta_class_access: teacher만 수정"
  on public.ta_class_access for update using (get_my_role() = 'teacher');

create policy "ta_class_access: teacher만 삭제"
  on public.ta_class_access for delete using (get_my_role() = 'teacher');


-- =============================================================
-- 5. attendance_logs
-- =============================================================

-- teacher: 전체 | ta: 배정 반 | student: 본인 | parent: 자녀
create policy "attendance_logs: 역할별 조회"
  on public.attendance_logs for select using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta'      and ta_has_class_access(class_id))
    or (get_my_role() = 'student' and student_id = auth.uid())
    or (get_my_role() = 'parent'  and is_my_child(student_id))
  );

-- teacher/ta(배정 반)만 CRUD
create policy "attendance_logs: teacher·ta만 생성"
  on public.attendance_logs for insert with check (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );

create policy "attendance_logs: teacher·ta만 수정"
  on public.attendance_logs for update using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );

create policy "attendance_logs: teacher·ta만 삭제"
  on public.attendance_logs for delete using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );


-- =============================================================
-- 6. lectures
-- =============================================================

-- teacher: 전체 | ta: 배정 반 | student: 소속 반 | parent: 자녀 반
create policy "lectures: 역할별 조회"
  on public.lectures for select using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta'      and ta_has_class_access(class_id))
    or (get_my_role() = 'student' and i_am_in_class(class_id))
    or (get_my_role() = 'parent'  and my_child_is_in_class(class_id))
  );

create policy "lectures: teacher·ta만 생성"
  on public.lectures for insert with check (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );

create policy "lectures: teacher·ta만 수정"
  on public.lectures for update using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );

create policy "lectures: teacher·ta만 삭제"
  on public.lectures for delete using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );


-- =============================================================
-- 7. assignments
-- =============================================================

create policy "assignments: 역할별 조회"
  on public.assignments for select using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta'      and ta_has_class_access(class_id))
    or (get_my_role() = 'student' and i_am_in_class(class_id))
    or (get_my_role() = 'parent'  and my_child_is_in_class(class_id))
  );

create policy "assignments: teacher·ta만 생성"
  on public.assignments for insert with check (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );

create policy "assignments: teacher·ta만 수정"
  on public.assignments for update using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );

create policy "assignments: teacher·ta만 삭제"
  on public.assignments for delete using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );


-- =============================================================
-- 8. assignment_progress
-- =============================================================

-- assignment_id → assignments.class_id 경유 접근 판단
create policy "assignment_progress: 역할별 조회"
  on public.assignment_progress for select using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and exists (
          select 1 from public.assignments a
          where a.id = assignment_id
            and ta_has_class_access(a.class_id)
        ))
    or (get_my_role() = 'student' and student_id = auth.uid())
    or (get_my_role() = 'parent'  and is_my_child(student_id))
  );

create policy "assignment_progress: teacher·ta만 생성"
  on public.assignment_progress for insert with check (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and exists (
          select 1 from public.assignments a
          where a.id = assignment_id
            and ta_has_class_access(a.class_id)
        ))
  );

create policy "assignment_progress: teacher·ta만 수정"
  on public.assignment_progress for update using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and exists (
          select 1 from public.assignments a
          where a.id = assignment_id
            and ta_has_class_access(a.class_id)
        ))
  );

create policy "assignment_progress: teacher·ta만 삭제"
  on public.assignment_progress for delete using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and exists (
          select 1 from public.assignments a
          where a.id = assignment_id
            and ta_has_class_access(a.class_id)
        ))
  );


-- =============================================================
-- 9. test_scores
-- =============================================================

create policy "test_scores: 역할별 조회"
  on public.test_scores for select using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta'      and ta_has_class_access(class_id))
    or (get_my_role() = 'student' and student_id = auth.uid())
    or (get_my_role() = 'parent'  and is_my_child(student_id))
  );

create policy "test_scores: teacher·ta만 생성"
  on public.test_scores for insert with check (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );

create policy "test_scores: teacher·ta만 수정"
  on public.test_scores for update using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );

create policy "test_scores: teacher·ta만 삭제"
  on public.test_scores for delete using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );


-- =============================================================
-- 10. exam_results (class_id 없음 → student_id 기준 접근)
-- =============================================================

create policy "exam_results: 역할별 조회"
  on public.exam_results for select using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta'      and ta_has_student_access(student_id))
    or (get_my_role() = 'student' and student_id = auth.uid())
    or (get_my_role() = 'parent'  and is_my_child(student_id))
  );

create policy "exam_results: teacher·ta만 생성"
  on public.exam_results for insert with check (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_student_access(student_id))
  );

-- teacher/ta + 학생 본인 수정 가능
create policy "exam_results: teacher·ta·본인 수정"
  on public.exam_results for update using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta'      and ta_has_student_access(student_id))
    or (get_my_role() = 'student' and student_id = auth.uid())
  );

create policy "exam_results: teacher·ta만 삭제"
  on public.exam_results for delete using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_student_access(student_id))
  );


-- =============================================================
-- 11. qna_questions
-- =============================================================

-- teacher/ta: 전체 | student: 본인 | parent: 자녀
create policy "qna_questions: 역할별 조회"
  on public.qna_questions for select using (
    get_my_role() in ('teacher', 'ta')
    or (get_my_role() = 'student' and student_id = auth.uid())
    or (get_my_role() = 'parent'  and is_my_child(student_id))
  );

-- 학생만 본인 질문 등록
create policy "qna_questions: 학생만 생성"
  on public.qna_questions for insert with check (
    get_my_role() = 'student'
    and student_id = auth.uid()
  );

-- 학생: 본인 질문 수정 | teacher/ta: 전체 수정 (상태 변경 등)
create policy "qna_questions: 본인·teacher·ta 수정"
  on public.qna_questions for update using (
    get_my_role() in ('teacher', 'ta')
    or (get_my_role() = 'student' and student_id = auth.uid())
  );

-- 학생: 본인 질문 삭제 | teacher: 전체 삭제
create policy "qna_questions: 본인·teacher 삭제"
  on public.qna_questions for delete using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'student' and student_id = auth.uid())
  );


-- =============================================================
-- 12. qna_answers
-- =============================================================

-- 모든 역할 조회 가능 (질문자 및 관련자)
create policy "qna_answers: 전체 조회"
  on public.qna_answers for select using (
    get_my_role() in ('teacher', 'ta')
    -- 학생: 본인 질문의 답변만
    or (get_my_role() = 'student' and exists (
          select 1 from public.qna_questions q
          where q.id = question_id and q.student_id = auth.uid()
        ))
    -- 학부모: 자녀 질문의 답변만
    or (get_my_role() = 'parent' and exists (
          select 1 from public.qna_questions q
          where q.id = question_id and is_my_child(q.student_id)
        ))
  );

create policy "qna_answers: teacher·ta만 생성"
  on public.qna_answers for insert with check (
    get_my_role() in ('teacher', 'ta')
  );

create policy "qna_answers: teacher·ta만 수정"
  on public.qna_answers for update using (
    get_my_role() in ('teacher', 'ta')
  );

create policy "qna_answers: teacher·ta만 삭제"
  on public.qna_answers for delete using (
    get_my_role() in ('teacher', 'ta')
  );


-- =============================================================
-- 13. reports
-- =============================================================

create policy "reports: 역할별 조회"
  on public.reports for select using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta'      and ta_has_class_access(class_id))
    or (get_my_role() = 'student' and student_id = auth.uid())
    or (get_my_role() = 'parent'  and is_my_child(student_id))
  );

create policy "reports: teacher·ta만 생성"
  on public.reports for insert with check (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );

create policy "reports: teacher·ta만 수정"
  on public.reports for update using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );

create policy "reports: teacher·ta만 삭제"
  on public.reports for delete using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and ta_has_class_access(class_id))
  );


-- =============================================================
-- 14. notices
-- =============================================================

-- student/parent: 소속 반 공지 + 전체 공지(class_id IS NULL)
create policy "notices: 역할별 조회"
  on public.notices for select using (
    get_my_role() in ('teacher', 'ta')
    or (get_my_role() = 'student' and (
          class_id is null
          or i_am_in_class(class_id)
        ))
    or (get_my_role() = 'parent' and (
          class_id is null
          or my_child_is_in_class(class_id)
        ))
  );

create policy "notices: teacher·ta만 생성"
  on public.notices for insert with check (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and (
          class_id is null
          or ta_has_class_access(class_id)
        ))
  );

create policy "notices: teacher·ta만 수정"
  on public.notices for update using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and (
          class_id is null
          or ta_has_class_access(class_id)
        ))
  );

create policy "notices: teacher·ta만 삭제"
  on public.notices for delete using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and (
          class_id is null
          or ta_has_class_access(class_id)
        ))
  );


-- =============================================================
-- 15. push_messages
-- =============================================================

-- student: 본인 대상 or 소속 반 대상 메시지
-- parent: 자녀 대상 or 자녀 소속 반 대상 메시지
create policy "push_messages: 역할별 조회"
  on public.push_messages for select using (
    get_my_role() in ('teacher', 'ta')
    or (get_my_role() = 'student' and (
          target_student_id = auth.uid()
          or (target_class_id is not null and i_am_in_class(target_class_id))
        ))
    or (get_my_role() = 'parent' and (
          is_my_child(target_student_id)
          or (target_class_id is not null and my_child_is_in_class(target_class_id))
        ))
  );

create policy "push_messages: teacher·ta만 생성"
  on public.push_messages for insert with check (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and (
          target_class_id is null
          or ta_has_class_access(target_class_id)
        ))
  );

create policy "push_messages: teacher·ta만 수정"
  on public.push_messages for update using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and (
          target_class_id is null
          or ta_has_class_access(target_class_id)
        ))
  );

create policy "push_messages: teacher·ta만 삭제"
  on public.push_messages for delete using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and (
          target_class_id is null
          or ta_has_class_access(target_class_id)
        ))
  );


-- =============================================================
-- 16. schedules
-- =============================================================

-- student/parent: 소속 반 일정 + 전체 일정(class_id IS NULL)
create policy "schedules: 역할별 조회"
  on public.schedules for select using (
    get_my_role() in ('teacher', 'ta')
    or (get_my_role() = 'student' and (
          class_id is null
          or i_am_in_class(class_id)
        ))
    or (get_my_role() = 'parent' and (
          class_id is null
          or my_child_is_in_class(class_id)
        ))
  );

create policy "schedules: teacher·ta만 생성"
  on public.schedules for insert with check (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and (
          class_id is null
          or ta_has_class_access(class_id)
        ))
  );

create policy "schedules: teacher·ta만 수정"
  on public.schedules for update using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and (
          class_id is null
          or ta_has_class_access(class_id)
        ))
  );

create policy "schedules: teacher·ta만 삭제"
  on public.schedules for delete using (
    get_my_role() = 'teacher'
    or (get_my_role() = 'ta' and (
          class_id is null
          or ta_has_class_access(class_id)
        ))
  );


-- =============================================================
-- 17. staff_status
-- =============================================================

-- 모든 역할 전체 조회 가능 (온라인 상태 표시용)
create policy "staff_status: 전체 조회"
  on public.staff_status for select using (true);

-- teacher/ta: 본인 상태만 생성·수정
create policy "staff_status: 본인만 생성"
  on public.staff_status for insert with check (
    get_my_role() in ('teacher', 'ta')
    and user_id = auth.uid()
  );

create policy "staff_status: 본인만 수정"
  on public.staff_status for update using (
    get_my_role() in ('teacher', 'ta')
    and user_id = auth.uid()
  );

create policy "staff_status: 본인만 삭제"
  on public.staff_status for delete using (
    get_my_role() in ('teacher', 'ta')
    and user_id = auth.uid()
  );


-- =============================================================
-- 18. parent_links
-- =============================================================

-- teacher/ta: 전체 | parent: 본인 row | student: 본인 관련 row
create policy "parent_links: 역할별 조회"
  on public.parent_links for select using (
    get_my_role() in ('teacher', 'ta')
    or (get_my_role() = 'parent'  and parent_id = auth.uid())
    or (get_my_role() = 'student' and student_id = auth.uid())
  );

-- teacher만 연결 생성/수정/삭제
create policy "parent_links: teacher만 생성"
  on public.parent_links for insert with check (get_my_role() = 'teacher');

create policy "parent_links: teacher만 수정"
  on public.parent_links for update using (get_my_role() = 'teacher');

create policy "parent_links: teacher만 삭제"
  on public.parent_links for delete using (get_my_role() = 'teacher');
