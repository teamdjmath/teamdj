-- RLS 성능 인덱스: auth.uid() 필터링 컬럼에 인덱스 추가
-- auth.uid()로 필터링하는 모든 테이블에 해당 컬럼 인덱스가 없으면
-- 데이터 10건일 때는 빠르지만 수만 건이 쌓이면 Full Table Scan이 됨

-- attendance_logs: student_id (출석 조회 시 학생별 필터)
CREATE INDEX IF NOT EXISTS idx_attendance_logs_student_id
  ON public.attendance_logs (student_id);

-- attendance_logs: class_id + session_date (강사가 수업일별 조회)
CREATE INDEX IF NOT EXISTS idx_attendance_logs_class_session
  ON public.attendance_logs (class_id, session_date);

-- assignment_progress: student_id (학생별 과제 완료율 조회)
CREATE INDEX IF NOT EXISTS idx_assignment_progress_student_id
  ON public.assignment_progress (student_id);

-- assignment_progress: assignment_id (과제별 전체 완료율 집계)
CREATE INDEX IF NOT EXISTS idx_assignment_progress_assignment_id
  ON public.assignment_progress (assignment_id);

-- notifications: user_id (알림 수신자별 조회)
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications (user_id);

-- notifications: user_id + is_read (읽지 않은 알림 필터)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read)
  WHERE is_read = false;

-- test_scores: student_id (학생별 점수 조회)
CREATE INDEX IF NOT EXISTS idx_test_scores_student_id
  ON public.test_scores (student_id);

-- test_scores: test_id (시험별 점수 집계)
CREATE INDEX IF NOT EXISTS idx_test_scores_test_id
  ON public.test_scores (test_id);

-- reports: student_id (학생별 리포트 조회)
CREATE INDEX IF NOT EXISTS idx_reports_student_id
  ON public.reports (student_id);

-- reports: class_id + report_date (분반+날짜별 조회)
CREATE INDEX IF NOT EXISTS idx_reports_class_date
  ON public.reports (class_id, report_date);

-- class_members: student_id (학생이 속한 분반 조회 — learning 페이지 핵심)
CREATE INDEX IF NOT EXISTS idx_class_members_student_id
  ON public.class_members (student_id)
  WHERE is_active = true;

-- qna_questions: student_id (학생별 질문 조회)
CREATE INDEX IF NOT EXISTS idx_qna_questions_student_id
  ON public.qna_questions (student_id);

-- notices: class_id (분반별 공지 필터)
CREATE INDEX IF NOT EXISTS idx_notices_class_id
  ON public.notices (class_id);

GRANT ALL ON public.attendance_logs TO authenticated, service_role;
GRANT ALL ON public.assignment_progress TO authenticated, service_role;
GRANT ALL ON public.notifications TO authenticated, service_role;
GRANT ALL ON public.test_scores TO authenticated, service_role;
GRANT ALL ON public.reports TO authenticated, service_role;
GRANT ALL ON public.class_members TO authenticated, service_role;
GRANT ALL ON public.qna_questions TO authenticated, service_role;
GRANT ALL ON public.notices TO authenticated, service_role;
