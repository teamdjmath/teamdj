export type MaterialBook = {
  name: string;
  role: string;
  desc: string;
  details?: string[];
  img?: string;
};

export type MaterialLevel = {
  tag: string;
  audience: string;
  accent: boolean;
  books: MaterialBook[];
};

// 교재 체계 전체 — 랜딩페이지 SystemSection(요약 카드)과 /materials(상세 페이지)에서 공용으로 사용
// 출처: https://blog.naver.com/dongdong_math/224369027078 (개학 후 교재 & 시스템 안내)
export const MATERIAL_LEVELS: MaterialLevel[] = [
  {
    tag: "LEVEL 1",
    audience: "처음 배우는 학생 ~ 2회독 대상 · 방학교재",
    accent: false,
    books: [
      {
        name: "DEEP",
        role: "수업용 주교재 · 개념 완성",
        desc: "깊이가 다른 시작, 올바른 개념의 본질을 마주합니다. 공식은 증명까지 다뤄 서술형까지 대비하며, 전체 수업의 70~80%가 개념 설명으로 구성됩니다.",
        details: [
          "단원별 반드시 알아야 할 필수 유형 5~15가지로 구성",
          "주로 방학 특강 · 방학 정규수업에서 사용",
          "스파르타 특강에서는 DETERMINE을 대신 사용",
        ],
        img: "/materials/deep.png",
      },
      {
        name: "DETAIL",
        role: "과제용 숙제장 · A형(0~1회독) B형(1~2회독)",
        desc: "개념을 깊게 훈련하는 가장 확실한 반복입니다. 선행 횟수와 문제 해결 능력에 따라 A·B형 중 하나를 선택합니다.",
        details: [
          "A형: RPM~쎈B 수준, 처음 배우거나 1회독 미만 학생 권장",
          "B형: A형보다 높은 난이도, 1~2회독 학생 권장",
        ],
      },
    ],
  },
  {
    tag: "LEVEL 2",
    audience: "1회독 이상 학생 대상 · 개학교재",
    accent: false,
    books: [
      {
        name: "DEVELOP",
        role: "수업용 주교재 · 내신대비 핵심",
        desc: "개념의 확장, 낯선 심화 문항을 풀어내는 정교한 논리를 다룹니다. 실력~고난도 구간의 학교 내신 기출 중 꼭 필요한 문항만 다년간 데이터로 선별했습니다.",
        details: [
          "심화반: 2등급 초반 ~ 1등급 턱걸이 구간 문항",
          "고난도반: 1등급 커트라인 이상 문항",
          "심화+고난도반은 두 구간을 모두 학습",
        ],
        img: "/materials/develop.png",
      },
      {
        name: "DERIVE",
        role: "과제용 숙제장 · A형(실력~심화) B형(심화~고난도)",
        desc: "논리의 흐름을 파고드는 단계별 심화학습입니다. 학생별 맞춤으로 A·B형 중 하나를 과제로 진행합니다.",
        details: [
          "주 1회 수업: 과제 소요시간 4시간 이내로 조절",
          "주 2회 수업: 1회당 2시간 30분 이내로 조절",
          "A·B형 모두 배부되며, 과제 검사는 한 권만 제출",
        ],
      },
    ],
  },
  {
    tag: "LEVEL 3",
    audience: "내신대비 · 시험 3주 전부터 시작",
    accent: false,
    books: [
      {
        name: "DECISIVE",
        role: "공용 내신대비 교재",
        desc: "완벽한 역전의 순간을 결정짓다. 학교 내신 기출 최다빈출 유형만 유형·난이도별로 정리한 공용 내신대비 교재입니다.",
        details: [
          "시험 범위가 가장 긴 학교까지 대비할 수 있도록 구성",
          "시험 주 포함 약 3주간 내신대비 진행",
        ],
        img: "/materials/decisive.png",
      },
      {
        name: "DEVOTE",
        role: "학교별 내신대비 숙제장",
        desc: "반복과 훈련으로 완벽에 몰입하다. 재원생이 있는 모든 학교의 기출·부교재를 반영한 학교별 맞춤 내신대비 숙제장입니다.",
        details: [
          "교과서 유사문항 · 부교재/프린트 유사문항 · 학교별 역대 기출로 구성",
          "재원생 1명 이상인 학교는 모두 제작 (출판 최소수량 미달 시 프린트물로 배부)",
        ],
      },
    ],
  },
  {
    tag: "SPECIAL",
    audience: "스파르타 특강 전용",
    accent: true,
    books: [
      {
        name: "DETERMINE",
        role: "스파르타 특강 전용 교재",
        desc: "결심하는 순간, 결과는 달라진다. 스파르타 특강 전용 교재로, 매 특강 난이도에 맞춰 새로 제작합니다.",
        details: [
          "같은 '실력' 난이도라도 정규반보다 다소 높게 구성",
          "전체 수준은 DEEP과 DEVELOP 중간 단계",
        ],
        img: "/materials/determine.png",
      },
    ],
  },
];
