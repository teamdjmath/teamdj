export type CurriculumCourse = {
  name: string;
  goal: string;
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
        name: "공통수학2 심화반",
        goal: "기본 개념의 완전한 정착과 응용 문항 적응을 통한 상위권 진입 기반 마련",
      },
      {
        name: "공통수학2 고난도반",
        goal: "1등급을 위한 고난도 문항 집중 트레이닝, 실전 감각 극대화",
      },
    ],
  },
  {
    category: "고등부",
    grade: "고2",
    color: "bg-zinc-100",
    courses: [
      {
        name: "미적분2 실력+반",
        goal: "실전 개념의 완성과 수능형 사고 훈련을 통한 안정적 점수 확보",
      },
      {
        name: "미적분2 고난도반",
        goal: "최상위권 변별 문항 완전 정복, 압도적 실력 차이를 만드는 훈련",
      },
    ],
  },
  {
    category: "입시부",
    grade: "고3, N수",
    color: "bg-zinc-50",
    courses: [
      {
        name: "27 수능 대비 팀수업 1기/2기",
        goal: "오직 상위권만을 위한 고농축 실전 훈련 및 압도적 성과를 위한 DJ MATERIALS 집중 학습",
      },
      {
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
        name: "차원이 다른 전용 교재",
        goal: "시중에서 볼 수 없는 독보적 퀄리티의 고퀄리티 자체 제작 컨텐츠",
      },
    ],
  },
];
