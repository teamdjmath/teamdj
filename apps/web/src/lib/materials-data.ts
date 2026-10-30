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
export const MATERIAL_LEVELS: MaterialLevel[] = [
  {
    tag: "LEVEL 1",
    audience: "기초를 다지는 기본서",
    accent: false,
    books: [
      {
        name: "알파",
        role: "기본서 · 기초",
        desc: "개념을 처음부터 탄탄하게 세우는 기본서입니다.",
      },
    ],
  },
  {
    tag: "LEVEL 2",
    audience: "실력을 다지는 유형서",
    accent: false,
    books: [
      {
        name: "베타",
        role: "유형서 · 실력",
        desc: "기본 개념을 다양한 유형에 적용하며 실력을 키우는 유형서입니다.",
      },
    ],
  },
  {
    tag: "LEVEL 3",
    audience: "심화 · 고난도를 다지는 유형서",
    accent: false,
    books: [
      {
        name: "감마",
        role: "유형서 · 심화",
        desc: "심화 난이도 문항으로 사고력을 확장하는 유형서입니다.",
      },
      {
        name: "오메가",
        role: "유형서 · 고난도",
        desc: "최고난도 문항까지 다루는 유형서입니다.",
      },
    ],
  },
  {
    tag: "SPECIAL",
    audience: "내신대비서",
    accent: true,
    books: [
      {
        name: "ATO",
        role: "내신대비서",
        desc: "학교별 내신을 대비하는 전용 교재입니다.",
      },
    ],
  },
];
