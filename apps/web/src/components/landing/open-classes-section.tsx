"use client";

import { motion } from "motion/react";

type Course = {
  name: string;
  tag: string;
  startDate: string;
  time: string;
  bullets: string[];
};

type ClassGroup = {
  gradeLabel: string;
  title: string;
  teacher: string;
  courses: Course[];
};

const GROUPS: ClassGroup[] = [
  {
    gradeLabel: "고2",
    title: "고2 수학 내신 대비반",
    teacher: "이동재T + TeamDJ 클리닉팀",
    courses: [
      {
        name: "미적분1",
        tag: "심화+",
        startDate: "8/15 (토)",
        time: "PM 7:00-9:50",
        bullets: [
          "교재: D 시리즈 STEP2 DEVELOP 미적분1",
          "숙제장: DERIVE 미적분1 A·B (권장)",
          "개념의 확장. 낯선 심화 문항을 풀어내는 정교한 논리를 정립하고 응용하는 수업",
        ],
      },
      {
        name: "미적분2 A",
        tag: "심화+",
        startDate: "8/15 (토)",
        time: "AM 9:00-11:50",
        bullets: [
          "교재: D 시리즈 STEP2 DEVELOP 미적분2",
          "숙제장: DERIVE 미적분2 A·B (권장)",
          "개념의 확장. 낯선 심화 문항을 풀어내는 정교한 논리를 정립하고 응용하는 수업",
        ],
      },
      {
        name: "미적분2 B",
        tag: "심화+",
        startDate: "8/15 (토)",
        time: "PM 4:00-6:50",
        bullets: [
          "교재: D 시리즈 STEP2 DEVELOP 미적분2",
          "숙제장: DERIVE 미적분2 A·B (권장)",
          "개념의 확장. 낯선 심화 문항을 풀어내는 정교한 논리를 정립하고 응용하는 수업",
        ],
      },
      {
        name: "확률과 통계 A",
        tag: "심화+고난도",
        startDate: "8/15 (토)",
        time: "PM 1:00-3:50",
        bullets: [
          "교재: D 시리즈 STEP2 DEVELOP 확률과 통계",
          "숙제장: DERIVE 확률과통계 A·B (권장)",
          "개념의 확장. 낯선 심화 문항을 풀어내는 정교한 논리를 정립하고 응용하는 수업",
        ],
      },
      {
        name: "확률과 통계 B",
        tag: "심화+고난도",
        startDate: "8/16 (일)",
        time: "PM 1:00-3:50",
        bullets: [
          "교재: D 시리즈 STEP2 DEVELOP 확률과 통계",
          "숙제장: DERIVE 확률과통계 A·B (권장)",
          "개념의 확장. 낯선 심화 문항을 풀어내는 정교한 논리를 정립하고 응용하는 수업",
        ],
      },
      {
        name: "확률과 통계 C",
        tag: "실력+심화",
        startDate: "8/16 (일)",
        time: "PM 4:00-6:50",
        bullets: [
          "교재: D 시리즈 STEP2 DEVELOP 확률과 통계 (A·B반과 동일 교재)",
          "개념 설명 비중을 A·B반보다 늘려 더 자세히 다루고, 고난도 문항 풀이 비중은 줄인 구성",
          "숙제장: DERIVE 확률과통계 A · DETAIL 확률과통계 B",
        ],
      },
    ],
  },
  {
    gradeLabel: "고1",
    title: "고1 수학 내신대비반",
    teacher: "이동재T + TeamDJ 클리닉팀",
    courses: [
      {
        name: "공통수학2",
        tag: "고난도",
        startDate: "8/14 (화·금)",
        time: "PM 7:00-10:00",
        bullets: [
          "대상: 공통수학2를 최소 2회독 이상 완료한 학생",
          "심화/고난도 개념 + 적용연습, 교재: 자체교재(DEVELOP)",
          "1등급 커트라인을 돌파하는 구간의 문항 — 고난도 난이도(1등급 정착구간) 이상 수업 진행",
          "두 반 모두의 녹화본 제공",
        ],
      },
      {
        name: "공통수학2",
        tag: "심화",
        startDate: "8/13 (월·목)",
        time: "PM 7:00-10:00",
        bullets: [
          "대상: 공통수학2를 1회독 이상 완료한 학생",
          "심화개념 + 적용연습, 교재: 자체교재(DEVELOP)",
          "1등급 커트라인을 돌파하는 구간의 문항 — 심화 난이도(2등급 초~1등급 진입구간) 수업 진행",
          "두 반 모두의 녹화본 제공",
        ],
      },
    ],
  },
];

function CourseBullets({ bullets }: { bullets: string[] }) {
  return (
    <ul className="space-y-1">
      {bullets.map((b, i) => (
        <li key={i} className="flex gap-1.5 text-[13px] leading-relaxed text-zinc-500 break-keep">
          <span className="text-emerald-600 shrink-0">·</span>
          {b}
        </li>
      ))}
    </ul>
  );
}

function GroupBlock({ group, idx }: { group: ClassGroup; idx: number }) {
  return (
    <motion.div
      className="mb-10 last:mb-0"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: idx * 0.08 }}
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-2.5">
          <span className="rounded-full bg-zinc-950 px-2.5 py-1 text-xs font-black text-white tracking-wide">
            {group.gradeLabel}
          </span>
          <h3 className="text-lg md:text-xl font-black tracking-tight text-zinc-950 break-keep">{group.title}</h3>
        </div>
        <span className="text-xs font-medium text-zinc-400">담당: {group.teacher}</span>
      </div>

      {/* 데스크톱 — 표 형식 */}
      <div className="hidden md:block overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50">
              <th className="w-[15%] px-5 py-3 text-xs font-semibold text-zinc-500">강좌명</th>
              <th className="w-[20%] px-5 py-3 text-xs font-semibold text-zinc-500">일정</th>
              <th className="px-5 py-3 text-xs font-semibold text-zinc-500">소개</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {group.courses.map((c, i) => (
              <tr key={i} className="align-top">
                <td className="px-5 py-4">
                  <p className="font-bold text-zinc-900 text-sm break-keep">{c.name}</p>
                  <span className="mt-1 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                    {c.tag}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-semibold text-zinc-800 tabular-nums">{c.startDate} 개강</p>
                  <p className="mt-0.5 text-xs text-zinc-500 tabular-nums">{c.time}</p>
                </td>
                <td className="px-5 py-4">
                  <CourseBullets bullets={c.bullets} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 모바일 — 카드 형식 */}
      <div className="md:hidden space-y-3">
        {group.courses.map((c, i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-bold text-zinc-900 text-sm break-keep">{c.name}</p>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                {c.tag}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold text-zinc-700 tabular-nums">
              {c.startDate} 개강 · {c.time}
            </p>
            <div className="mt-3 border-t border-zinc-100 pt-3">
              <CourseBullets bullets={c.bullets} />
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export function OpenClassesSection() {
  return (
    <section className="w-full py-14 md:py-24 bg-zinc-50 overflow-hidden border-t border-zinc-100" id="open-classes">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-emerald-600 font-bold tracking-tight text-sm uppercase mb-4 block">
            This Semester
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 mb-6 break-keep">
            이번학기 개설반 안내
          </h2>
        </motion.div>

        {GROUPS.map((group, idx) => (
          <GroupBlock key={group.title} group={group} idx={idx} />
        ))}
      </div>
    </section>
  );
}
