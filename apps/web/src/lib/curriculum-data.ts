export type CurriculumBook = {
  name: string;
  role: string;
  desc: string;
  img?: string;
};

export type ClassInfo = {
  level: string;
  startDate: string;
  homework: string;
  timetable: { time: string; activity: string }[];
  note: string;
};

export type CurriculumCourse = {
  slug: string;
  name: string;
  goal: string;
  books?: CurriculumBook[];
  blogUrl?: string;
  classInfo?: ClassInfo;
};

export type CurriculumCategory = {
  category: string;
  grade: string;
  color: string;
  courses: CurriculumCourse[];
};

export const CURRICULUM_DATA: CurriculumCategory[] = [
  {
    category: "고등부",
    grade: "고1",
    color: "bg-zinc-100",
    courses: [
      {
        slug: "g1-simhwa",
        name: "공통수학2 심화반",
        goal: "기본 개념의 완전한 정착과 응용 문항 적응을 통한 상위권 진입 기반 마련",
        blogUrl: "https://blog.naver.com/dongdong_math/224361768880",
        books: [
          { name: "DEVELOP", role: "수업용 주교재", desc: "개념의 확장. 낯선 심화 문항을 풀어내는 정교한 논리를 다룹니다." },
          { name: "DERIVE", role: "과제용 부교재 (A형)", desc: "논리의 흐름을 파고드는 단계별 심화학습입니다." },
          { name: "DEVOTE", role: "내신대비 공용 교재", desc: "최근 3개년 내신 기출에서 가장 많이 등장한 유형을 재편했습니다." },
          { name: "DECISIVE", role: "내신대비 학교별 교재", desc: "학교별 부교재·프린트물·기출까지 학교 맞춤으로 구성했습니다." },
        ],
        classInfo: {
          level: "심화\n5~6 문항 수준으로 수업을 진행합니다",
          startDate: "8월 13일 (목) 개강\n개강 후 진도는 처음부터 중간고사 범위까지 나갑니다",
          homework: "DERIVE 공통수학2 A형\n1회 수업당 예상 소요시간 2~3시간",
          timetable: [
            { time: "18:00까지", activity: "등원 (학교가 매우 먼 경우 19:00까지)" },
            { time: "18:00 ~ 19:00", activity: "과제 클리닉 (질의응답)" },
            { time: "19:05 ~ 19:55", activity: "모의중간고사 응시 (중간고사 범위)\n회차가 거듭될수록 난이도 상향" },
            { time: "20:00 ~ 22:00", activity: "내신대비 진도 진행" },
          ],
          note: "시험 3주 전까지 진도 완성 후 내신대비 집중기간 시작 (LEVEL 3 교재 사용)",
        },
      },
      {
        slug: "g1-godanhdo",
        name: "공통수학2 고난도반",
        goal: "1등급을 위한 고난도 문항 집중 트레이닝, 실전 감각 극대화",
        blogUrl: "https://blog.naver.com/dongdong_math/224361768880",
        books: [
          { name: "DEVELOP", role: "수업용 주교재", desc: "개념의 확장. 낯선 심화 문항을 풀어내는 정교한 논리를 다룹니다." },
          { name: "DERIVE", role: "과제용 부교재 (B형)", desc: "논리의 흐름을 파고드는 단계별 심화학습입니다." },
          { name: "DEVOTE", role: "내신대비 공용 교재", desc: "최근 3개년 내신 기출에서 가장 많이 등장한 유형을 재편했습니다." },
          { name: "DECISIVE", role: "내신대비 학교별 교재", desc: "학교별 부교재·프린트물·기출까지 학교 맞춤으로 구성했습니다." },
        ],
        classInfo: {
          level: "고난도\n6 이상 문항 수준으로 수업을 진행합니다",
          startDate: "8월 14일 (금) 개강\n개강 후 진도는 처음부터 중간고사 범위까지 나갑니다",
          homework: "DERIVE 공통수학2 B형\n1회 수업당 예상 소요시간 2~3시간",
          timetable: [
            { time: "18:00까지", activity: "등원 (학교가 매우 먼 경우 19:00까지)" },
            { time: "18:00 ~ 19:00", activity: "과제 클리닉 (질의응답)" },
            { time: "19:05 ~ 19:55", activity: "모의중간고사 응시 (중간고사 범위)\n회차가 거듭될수록 난이도 상향" },
            { time: "20:00 ~ 22:00", activity: "내신대비 진도 진행" },
          ],
          note: "시험 3주 전까지 진도 완성 후 내신대비 집중기간 시작 (LEVEL 3 교재 사용)",
        },
      },
    ],
  },
  {
    category: "고등부",
    grade: "고2",
    color: "bg-zinc-100",
    courses: [
      {
        slug: "g2-sillyeok-plus",
        name: "미적분2 실력+반",
        goal: "실전 개념의 완성과 수능형 사고 훈련을 통한 안정적 점수 확보",
        books: [
          { name: "DEVELOP", role: "수업용 주교재", desc: "개념의 확장. 낯선 심화 문항을 풀어내는 정교한 논리를 다룹니다." },
          { name: "DERIVE", role: "과제용 부교재", desc: "논리의 흐름을 파고드는 단계별 심화학습입니다." },
          { name: "DEVOTE", role: "내신대비 공용 교재", desc: "최근 3개년 내신 기출에서 가장 많이 등장한 유형을 재편했습니다." },
          { name: "DECISIVE", role: "내신대비 학교별 교재", desc: "학교별 부교재·프린트물·기출까지 학교 맞춤으로 구성했습니다." },
        ],
      },
      {
        slug: "g2-godanhdo",
        name: "미적분2 고난도반",
        goal: "최상위권 변별 문항 완전 정복, 압도적 실력 차이를 만드는 훈련",
        books: [
          { name: "DEVELOP", role: "수업용 주교재", desc: "개념의 확장. 낯선 심화 문항을 풀어내는 정교한 논리를 다룹니다." },
          { name: "DERIVE", role: "과제용 부교재", desc: "논리의 흐름을 파고드는 단계별 심화학습입니다." },
          { name: "DEVOTE", role: "내신대비 공용 교재", desc: "최근 3개년 내신 기출에서 가장 많이 등장한 유형을 재편했습니다." },
          { name: "DECISIVE", role: "내신대비 학교별 교재", desc: "학교별 부교재·프린트물·기출까지 학교 맞춤으로 구성했습니다." },
        ],
      },
    ],
  },
  {
    category: "입시부",
    grade: "고3, N수",
    color: "bg-zinc-50",
    courses: [
      {
        slug: "g3-team-class",
        name: "27 수능 대비 팀수업 1기/2기",
        goal: "오직 상위권만을 위한 고농축 실전 훈련 및 압도적 성과를 위한 DJ MATERIALS 집중 학습",
      },
      {
        slug: "mds-jaesu-jonghap",
        name: "MDS 재수종합반 출강",
        goal: "재수생 전문 종합 커리큘럼, 이동재T 수학 담당 출강 (2026.06.01~)",
      },
    ],
  },
  {
    category: "SPECIAL",
    grade: "DJ MATERIALS",
    color: "bg-emerald-50/30",
    courses: [
      {
        slug: "dj-materials",
        name: "차원이 다른 전용 교재",
        goal: "시중에서 볼 수 없는 독보적 퀄리티의 고퀄리티 자체 제작 컨텐츠",
      },
    ],
  },
];

export function findCurriculumCourse(slug: string) {
  for (const category of CURRICULUM_DATA) {
    const course = category.courses.find((c) => c.slug === slug);
    if (course) return { category, course };
  }
  return null;
}
