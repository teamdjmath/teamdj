-- =============================================================
-- 학습 관련 RLS 정책 보완 (021)
-- 1. lecture_class_access: 학생들이 수강하는 클래스의 강좌 접근 권한을 조회할 수 있도록 함
-- 2. lectures: course_name 기반으로 접근 권한이 있는 강의만 조회할 수 있도록 함
-- =============================================================

-- 1. lecture_class_access 정책
ALTER TABLE "public"."lecture_class_access" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lecture_class_access: 역할별 조회"
  ON "public"."lecture_class_access" FOR SELECT USING (
    get_my_role() = 'teacher'
    OR (get_my_role() = 'ta' AND (class_id IS NULL OR ta_has_class_access(class_id)))
    OR (get_my_role() = 'student' AND (class_id IS NULL OR i_am_in_class(class_id)))
    OR (get_my_role() = 'parent' AND (class_id IS NULL OR my_child_is_in_class(class_id)))
  );

CREATE POLICY "lecture_class_access: teacher만 생성"
  ON "public"."lecture_class_access" FOR INSERT WITH CHECK (get_my_role() = 'teacher');

CREATE POLICY "lecture_class_access: teacher만 수정"
  ON "public"."lecture_class_access" FOR UPDATE USING (get_my_role() = 'teacher');

CREATE POLICY "lecture_class_access: teacher만 삭제"
  ON "public"."lecture_class_access" FOR DELETE USING (get_my_role() = 'teacher');


-- 2. lectures 정책 보완
-- 기존에 class_id 기반으로만 되어 있던 정책을 course_name 기반 접근 권한으로 확장
DROP POLICY IF EXISTS "lectures: 역할별 조회" ON "public"."lectures";

CREATE POLICY "lectures: 역할별 조회"
  ON "public"."lectures" FOR SELECT USING (
    get_my_role() = 'teacher'
    OR (get_my_role() = 'ta' AND EXISTS (
      SELECT 1 FROM public.lecture_class_access lca
      WHERE lca.course_name = lectures.course_name
      AND (lca.class_id IS NULL OR ta_has_class_access(lca.class_id))
    ))
    OR (get_my_role() = 'student' AND EXISTS (
      SELECT 1 FROM public.lecture_class_access lca
      WHERE lca.course_name = lectures.course_name
      AND (lca.class_id IS NULL OR i_am_in_class(lca.class_id))
    ))
    OR (get_my_role() = 'parent' AND EXISTS (
      SELECT 1 FROM public.lecture_class_access lca
      WHERE lca.course_name = lectures.course_name
      AND (lca.class_id IS NULL OR my_child_is_in_class(lca.class_id))
    ))
  );
