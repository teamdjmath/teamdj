-- ═══════════════════════════════════════════════════════════════
-- 특별시험(exam_results) 데모 — 테스트반 학생 10명 + 시험 2회
-- Supabase 대시보드 SQL Editor에서 실행하세요. (반복 실행 안전)
--
-- 하는 일:
--   1. 테스트반을 찾고 (이름에 '테스트' 또는 'test' 포함)
--   2. 홍길동 + 데모 학생 9명을 테스트반에 등록 (없는 사람만 생성)
--   3. 6월/7월 특별시험 점수를 전원에게 입력 (홍길동은 성적 상승 스토리)
--   4. 석차(rank_in_exam)·응시 인원(total_in_exam)을 자동 계산 (auto_rank)
--   5. 홍길동에게 상세 분석·학습 제안 리포트 텍스트 입력
--
-- 확인: /admin/exam-results (평균·석차·분석), 홍길동 학생 계정 리포트 탭
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_class_id uuid;
  v_name text;
  v_sid uuid;
  v_names text[] := ARRAY['홍길동','김민준','이서연','박도윤','최지우','정하준','강수아','조은우','윤채원','임시우'];
  -- 6월 점수 (이름 순서대로) — 홍길동 78점
  v_june int[]  := ARRAY[78, 92, 85, 66, 88, 71, 94, 59, 81, 74];
  -- 7월 점수 — 홍길동 88점 (상승), 전체적으로 소폭 변동
  v_july int[]  := ARRAY[88, 90, 87, 72, 84, 78, 96, 65, 79, 70];
  i int;
BEGIN
  -- 1. 테스트반 찾기
  SELECT id INTO v_class_id
  FROM public.class_groups
  WHERE name ILIKE '%테스트%' OR name ILIKE '%test%'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION '테스트반을 찾을 수 없습니다. 분반 관리에서 먼저 생성해주세요.';
  END IF;

  -- 2. 학생 생성 + 테스트반 등록 (이미 있으면 재사용)
  FOR i IN 1..array_length(v_names, 1) LOOP
    v_name := v_names[i];

    SELECT id INTO v_sid FROM public.users
    WHERE role = 'student' AND name = v_name
    LIMIT 1;

    IF v_sid IS NULL THEN
      INSERT INTO public.users (name, role, school, grade, is_active)
      VALUES (v_name, 'student', '데모고', '3', true)
      RETURNING id INTO v_sid;
    END IF;

    -- 분반 소속 (비활성이면 재활성화)
    INSERT INTO public.class_members (class_id, student_id, is_active)
    VALUES (v_class_id, v_sid, true)
    ON CONFLICT (class_id, student_id) DO UPDATE SET is_active = true;
  END LOOP;

  -- 3. 기존 데모 시험 제거 후 재삽입 (반복 실행 안전)
  DELETE FROM public.exam_results WHERE exam_name IN ('6월 특별시험 (데모)', '7월 특별시험 (데모)');

  FOR i IN 1..array_length(v_names, 1) LOOP
    SELECT id INTO v_sid FROM public.users WHERE role = 'student' AND name = v_names[i] LIMIT 1;

    -- 6월 특별시험
    INSERT INTO public.exam_results
      (student_id, class_id, exam_name, exam_type, exam_date, score, max_score, grade_cuts, study_suggestion, auto_rank)
    VALUES (
      v_sid, v_class_id, '6월 특별시험 (데모)', 'other', '2026-06-15', v_june[i], 100,
      '{"1": 92, "2": 84, "3": 74, "4": 62}'::jsonb,
      CASE WHEN v_names[i] = '홍길동' THEN
        E'[분석 결과]\n수열의 극한(3문항 중 2문항 오답)과 미분법 응용에서 감점이 집중되었습니다. 계산 실수보다 개념 적용 단계에서 막히는 패턴입니다.\n\n[학습 제안]\n1. 수열의 극한 기본 개념 재정리 후 유사 문항 10개 반복\n2. 미분법 응용은 조건 해석 → 식 세우기 단계를 나눠 연습\n3. 다음 특별시험 전까지 오답노트 2회 복습'
      ELSE NULL END,
      true
    );

    -- 7월 특별시험
    INSERT INTO public.exam_results
      (student_id, class_id, exam_name, exam_type, exam_date, score, max_score, grade_cuts, study_suggestion, auto_rank)
    VALUES (
      v_sid, v_class_id, '7월 특별시험 (데모)', 'other', '2026-07-10', v_july[i], 100,
      '{"1": 90, "2": 82, "3": 70, "4": 58}'::jsonb,
      CASE WHEN v_names[i] = '홍길동' THEN
        E'[분석 결과]\n전월 대비 10점 상승 (78→88). 집중 훈련한 수열의 극한 전 문항 정답. 미분법 응용 정답률 50%→80%로 개선. 남은 감점은 고난도 킬러 1문항.\n\n[학습 제안]\n1. 현재 페이스 유지 — 상승 추세가 뚜렷합니다\n2. 킬러 문항 대비: 주 2회 고난도 세트 타임어택 훈련\n3. 8월 시험 목표: 1등급 컷(90점) 안착'
      ELSE NULL END,
      true
    );
  END LOOP;

  -- 4. 석차·응시 인원 자동 계산 (동점자는 같은 석차)
  WITH ranked AS (
    SELECT id,
           RANK() OVER (PARTITION BY exam_name ORDER BY score DESC) AS rnk,
           COUNT(*)  OVER (PARTITION BY exam_name)                  AS total
    FROM public.exam_results
    WHERE exam_name IN ('6월 특별시험 (데모)', '7월 특별시험 (데모)')
  )
  UPDATE public.exam_results e
  SET rank_in_exam = r.rnk, total_in_exam = r.total
  FROM ranked r
  WHERE e.id = r.id;

  RAISE NOTICE '완료: 테스트반(%)에 학생 10명 + 특별시험 2회 데모 입력 (홍길동 6월 78점 → 7월 88점)', v_class_id;
END $$;
