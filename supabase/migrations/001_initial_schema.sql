-- =============================================================
-- TeamDJ 초기 스키마
-- 학원 관리 시스템 (선생님 / TA / 학생 / 학부모)
-- =============================================================

-- uuid 생성 확장 활성화
create extension if not exists "pgcrypto";

-- =============================================================
-- 1. users — 시스템 사용자 (선생님, TA, 학생, 학부모)
-- =============================================================
create table public.users (
  id            uuid        primary key default gen_random_uuid(),
  phone         text        not null unique,                          -- 로그인 ID로 사용되는 전화번호
  name          text        not null,
  role          text        not null check (role in ('teacher', 'ta', 'student', 'parent')),
  password_hash text        not null,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now()
);

comment on table  public.users              is '시스템 사용자 테이블';
comment on column public.users.phone        is '휴대폰 번호 (로그인 ID)';
comment on column public.users.role         is '역할: teacher=선생님, ta=조교, student=학생, parent=학부모';
comment on column public.users.password_hash is 'bcrypt 해시';

alter table public.users enable row level security;


-- =============================================================
-- 2. parent_links — 학부모-학생 연결
-- =============================================================
create table public.parent_links (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid not null references public.users(id) on delete cascade,
  student_id uuid not null references public.users(id) on delete cascade,
  unique (parent_id, student_id)
);

comment on table public.parent_links is '학부모와 학생 간 연결 관계';

alter table public.parent_links enable row level security;


-- =============================================================
-- 3. class_groups — 수업 그룹 (반)
-- =============================================================
create table public.class_groups (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null,                                    -- 반 이름 (예: 수학 A반)
  subject    text        not null,                                    -- 과목
  grade      text        not null,                                    -- 학년 (예: 고1, 고2, 고3)
  schedule   text,                                                    -- 수업 일정 (예: 월수 18:00~20:00)
  teacher_id uuid        not null references public.users(id) on delete restrict,
  is_active  boolean     not null default true,
  created_at timestamptz not null default now()
);

comment on table  public.class_groups            is '수업 반 정보';
comment on column public.class_groups.schedule   is '수업 요일/시간 텍스트 (예: 월수 18:00~20:00)';
comment on column public.class_groups.teacher_id is '담당 선생님';

alter table public.class_groups enable row level security;


-- =============================================================
-- 4. class_members — 반 수강 학생
-- =============================================================
create table public.class_members (
  id          uuid        primary key default gen_random_uuid(),
  class_id    uuid        not null references public.class_groups(id) on delete cascade,
  student_id  uuid        not null references public.users(id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  is_active   boolean     not null default true,
  unique (class_id, student_id)
);

comment on table public.class_members is '반별 수강 학생 목록';

alter table public.class_members enable row level security;


-- =============================================================
-- 5. ta_class_access — TA 반 접근 권한
-- =============================================================
create table public.ta_class_access (
  id              uuid    primary key default gen_random_uuid(),
  ta_id           uuid    not null references public.users(id) on delete cascade,
  class_id        uuid    references public.class_groups(id) on delete cascade, -- null이면 전체 반
  is_all_classes  boolean not null default false,                                -- true면 모든 반 접근
  unique (ta_id, class_id)
);

comment on table  public.ta_class_access                is 'TA의 반 접근 권한';
comment on column public.ta_class_access.class_id       is 'null + is_all_classes=true 이면 전체 반 접근';
comment on column public.ta_class_access.is_all_classes is 'true이면 class_id 무관 전체 반 접근 허용';

alter table public.ta_class_access enable row level security;


-- =============================================================
-- 6. staff_status — 선생님/TA 현재 상태
-- =============================================================
create table public.staff_status (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null unique references public.users(id) on delete cascade,
  status     text        not null default 'offline' check (status in ('online', 'busy', 'offline')),
  updated_at timestamptz not null default now()
);

comment on table  public.staff_status        is '스태프(선생님/TA) 온라인 상태';
comment on column public.staff_status.status is 'online=온라인, busy=상담중, offline=오프라인';

alter table public.staff_status enable row level security;


-- =============================================================
-- 7. attendance_logs — 출결 기록
-- =============================================================
create table public.attendance_logs (
  id             uuid    primary key default gen_random_uuid(),
  class_id       uuid    not null references public.class_groups(id) on delete cascade,
  student_id     uuid    not null references public.users(id) on delete cascade,
  session_date   date    not null,
  status         text    not null check (status in ('present', 'absent', 'late')),
  absence_reason text,                                                -- 결석/지각 사유
  unique (class_id, student_id, session_date)
);

comment on table  public.attendance_logs               is '수업별 출결 기록';
comment on column public.attendance_logs.status        is 'present=출석, absent=결석, late=지각';
comment on column public.attendance_logs.absence_reason is '결석·지각 사유 (선택)';

alter table public.attendance_logs enable row level security;


-- =============================================================
-- 8. lectures — 수업 영상 (YouTube 연동)
-- =============================================================
create table public.lectures (
  id                   uuid        primary key default gen_random_uuid(),
  class_id             uuid        not null references public.class_groups(id) on delete cascade,
  title                text        not null,
  youtube_video_id     text,                                          -- 단일 영상 ID
  youtube_playlist_id  text,                                          -- 재생목록 ID
  order_num            integer     not null default 0,                -- 영상 순서
  synced_at            timestamptz                                    -- YouTube에서 마지막 동기화 시각
);

comment on table  public.lectures                    is '반별 수업 영상 목록 (YouTube 연동)';
comment on column public.lectures.youtube_video_id   is 'YouTube 단일 동영상 ID';
comment on column public.lectures.youtube_playlist_id is 'YouTube 재생목록 ID';
comment on column public.lectures.order_num          is '재생목록 내 영상 순서';

alter table public.lectures enable row level security;


-- =============================================================
-- 9. assignments — 과제
-- =============================================================
create table public.assignments (
  id         uuid    primary key default gen_random_uuid(),
  class_id   uuid    not null references public.class_groups(id) on delete cascade,
  title      text    not null,
  category   text,                                                    -- 과제 유형 (예: 숙제, 복습, 예습)
  due_date   date,
  week_num   integer                                                  -- 주차 번호
);

comment on table  public.assignments          is '반별 과제 목록';
comment on column public.assignments.category is '과제 유형 (예: 숙제/복습/예습)';
comment on column public.assignments.week_num is '몇 주차 과제인지';

alter table public.assignments enable row level security;


-- =============================================================
-- 10. assignment_progress — 과제 진행 현황
-- =============================================================
create table public.assignment_progress (
  id              uuid        primary key default gen_random_uuid(),
  assignment_id   uuid        not null references public.assignments(id) on delete cascade,
  student_id      uuid        not null references public.users(id) on delete cascade,
  completion_pct  integer     not null default 0 check (completion_pct between 0 and 100),
  is_overdue      boolean     not null default false,
  updated_by      uuid        references public.users(id) on delete set null, -- 수정한 스태프
  updated_at      timestamptz not null default now(),
  unique (assignment_id, student_id)
);

comment on table  public.assignment_progress                is '학생별 과제 완료율';
comment on column public.assignment_progress.completion_pct is '완료 퍼센트 (0~100)';
comment on column public.assignment_progress.updated_by     is '마지막으로 수정한 선생님/TA';

alter table public.assignment_progress enable row level security;


-- =============================================================
-- 11. test_scores — 단원/모의 시험 점수
-- =============================================================
create table public.test_scores (
  id           uuid    primary key default gen_random_uuid(),
  class_id     uuid    not null references public.class_groups(id) on delete cascade,
  student_id   uuid    not null references public.users(id) on delete cascade,
  test_date    date    not null,
  score        numeric(5,2) not null,                                 -- 취득 점수
  total_q      integer,                                               -- 전체 문항 수
  obj_q        integer,                                               -- 객관식 문항 수
  subj_q       integer,                                               -- 주관식 문항 수
  difficulty   text,                                                  -- 난이도 (예: 상/중/하)
  input_method text    not null default 'manual' check (input_method in ('omr', 'manual'))
);

comment on table  public.test_scores             is '반별 시험 점수 기록';
comment on column public.test_scores.score       is '취득 점수';
comment on column public.test_scores.total_q     is '전체 문항 수';
comment on column public.test_scores.obj_q       is '객관식 문항 수';
comment on column public.test_scores.subj_q      is '주관식 문항 수';
comment on column public.test_scores.input_method is 'omr=OMR 스캔 입력, manual=수동 입력';

alter table public.test_scores enable row level security;


-- =============================================================
-- 12. exam_results — 수능/모의고사 성적
-- =============================================================
create table public.exam_results (
  id               uuid        primary key default gen_random_uuid(),
  student_id       uuid        not null references public.users(id) on delete cascade,
  exam_name        text        not null,                              -- 시험명 (예: 2024 수능, 6월 모의고사)
  exam_date        date        not null,
  score            numeric(5,2),
  grade_cuts       jsonb,                                             -- 등급 컷 정보 {"1":96,"2":88,...}
  study_suggestion text,                                              -- AI 학습 제안
  created_at       timestamptz not null default now()
);

comment on table  public.exam_results               is '수능/모의고사 성적 관리';
comment on column public.exam_results.grade_cuts    is '등급별 컷 점수 JSON (예: {"1":96,"2":88})';
comment on column public.exam_results.study_suggestion is 'AI가 생성한 학습 방향 제안';

alter table public.exam_results enable row level security;


-- =============================================================
-- 13. qna_questions — Q&A 질문
-- =============================================================
create table public.qna_questions (
  id          uuid        primary key default gen_random_uuid(),
  student_id  uuid        not null references public.users(id) on delete cascade,
  class_id    uuid        references public.class_groups(id) on delete set null,
  content     text        not null,
  image_urls  text[]      not null default '{}',                      -- 첨부 이미지 URL 배열
  status      text        not null default 'open' check (status in ('open', 'in_progress', 'answered')),
  assigned_ta_id uuid     references public.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

comment on table  public.qna_questions             is '학생 Q&A 질문';
comment on column public.qna_questions.image_urls  is '질문 첨부 이미지 URL 배열';
comment on column public.qna_questions.status      is 'open=미답변, in_progress=답변중, answered=답변완료';
comment on column public.qna_questions.assigned_ta_id is '담당 TA';

alter table public.qna_questions enable row level security;


-- =============================================================
-- 14. qna_answers — Q&A 답변
-- =============================================================
create table public.qna_answers (
  id          uuid        primary key default gen_random_uuid(),
  question_id uuid        not null references public.qna_questions(id) on delete cascade,
  ta_id       uuid        not null references public.users(id) on delete restrict,
  content     text        not null,
  media_urls  text[]      not null default '{}',                      -- 답변 첨부 미디어 URL 배열
  is_ai_draft boolean     not null default false,                     -- AI 초안 여부
  answered_at timestamptz not null default now()
);

comment on table  public.qna_answers             is 'Q&A 답변';
comment on column public.qna_answers.media_urls  is '답변 첨부 이미지/영상 URL 배열';
comment on column public.qna_answers.is_ai_draft is 'true이면 AI가 초안 작성 (TA가 검토 필요)';

alter table public.qna_answers enable row level security;


-- =============================================================
-- 15. reports — 학습 리포트
-- =============================================================
create table public.reports (
  id            uuid        primary key default gen_random_uuid(),
  class_id      uuid        not null references public.class_groups(id) on delete cascade,
  student_id    uuid        not null references public.users(id) on delete cascade,
  report_date   date        not null,
  content_json  jsonb       not null default '{}',                    -- 리포트 내용 JSON
  image_url     text,                                                  -- 생성된 이미지 URL
  kakao_sent_at timestamptz,                                          -- 카카오톡 발송 시각
  created_at    timestamptz not null default now()
);

comment on table  public.reports              is '학생 학습 리포트';
comment on column public.reports.content_json is '리포트 구조화 데이터 (출결, 점수, 과제 등)';
comment on column public.reports.image_url    is '카카오톡 전송용 리포트 이미지 URL';
comment on column public.reports.kakao_sent_at is '카카오톡 알림톡 발송 완료 시각';

alter table public.reports enable row level security;


-- =============================================================
-- 16. notices — 공지사항
-- =============================================================
create table public.notices (
  id         uuid        primary key default gen_random_uuid(),
  class_id   uuid        references public.class_groups(id) on delete cascade, -- null이면 전체 공지
  author_id  uuid        not null references public.users(id) on delete restrict,
  title      text        not null,
  content    text        not null,
  is_pinned  boolean     not null default false,
  created_at timestamptz not null default now()
);

comment on table  public.notices          is '공지사항';
comment on column public.notices.class_id is 'null이면 전체 공지, 값이 있으면 해당 반 공지';
comment on column public.notices.is_pinned is '상단 고정 여부';

alter table public.notices enable row level security;


-- =============================================================
-- 17. push_messages — 개별/단체 푸시 메시지
-- =============================================================
create table public.push_messages (
  id                uuid        primary key default gen_random_uuid(),
  sender_id         uuid        not null references public.users(id) on delete restrict,
  target_class_id   uuid        references public.class_groups(id) on delete set null,   -- 반 전체 발송
  target_student_id uuid        references public.users(id) on delete set null,          -- 개인 발송
  message           text        not null,
  sent_at           timestamptz not null default now()
);

comment on table  public.push_messages                 is '푸시 메시지 발송 내역';
comment on column public.push_messages.target_class_id   is '반 전체 발송 시 사용 (null이면 개인 발송)';
comment on column public.push_messages.target_student_id is '개인 발송 시 사용 (null이면 반 전체 발송)';

alter table public.push_messages enable row level security;


-- =============================================================
-- 18. schedules — 학사 일정
-- =============================================================
create table public.schedules (
  id          uuid    primary key default gen_random_uuid(),
  class_id    uuid    references public.class_groups(id) on delete cascade, -- null이면 전체 일정
  title       text    not null,
  target_date date    not null,
  type        text    not null check (type in ('수능', '모의고사', '중간', '기말', '기타')),
  created_at  timestamptz not null default now()
);

comment on table  public.schedules          is '학사 일정 (시험 일정 등)';
comment on column public.schedules.class_id is 'null이면 전체 해당, 값이 있으면 특정 반 일정';
comment on column public.schedules.type     is '일정 유형: 수능/모의고사/중간/기말/기타';

alter table public.schedules enable row level security;


-- =============================================================
-- 인덱스
-- =============================================================

-- 자주 조회되는 외래키 컬럼에 인덱스 추가
create index on public.parent_links     (parent_id);
create index on public.parent_links     (student_id);
create index on public.class_members    (class_id);
create index on public.class_members    (student_id);
create index on public.ta_class_access  (ta_id);
create index on public.attendance_logs  (class_id, session_date);
create index on public.attendance_logs  (student_id);
create index on public.lectures         (class_id, order_num);
create index on public.assignments      (class_id, due_date);
create index on public.assignment_progress (student_id);
create index on public.test_scores      (class_id, test_date);
create index on public.test_scores      (student_id);
create index on public.exam_results     (student_id, exam_date);
create index on public.qna_questions    (student_id, status);
create index on public.qna_questions    (assigned_ta_id);
create index on public.qna_answers      (question_id);
create index on public.reports          (class_id, report_date);
create index on public.reports          (student_id);
create index on public.notices          (class_id, created_at desc);
create index on public.push_messages    (sender_id);
create index on public.schedules        (target_date);
