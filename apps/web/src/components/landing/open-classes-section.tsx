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
    gradeLabel: "예비고1",
    title: "공통수학 내신 집중 팀수업",
    teacher: "이동재T + TeamDJ 클리닉팀",
    courses: [
      {
        name: "공통수학 내신 집중 팀수업",
        tag: "A반 · 월목",
        startDate: "1/4 (월·목)",
        time: "PM 6:00-10:00",
        bullets: [
          "대상: 공통수학을 2회독 한 학생",
          "교재: 감마(심화) — 월목반은 심화개념 60% + 문제풀이 40%",
          "화금반과 교재는 동일하나 다루는 난이도가 다름 (화금반이 더 어려운 문항 위주) — 월목·화금 모든 녹화본 제공",
        ],
      },
      {
        name: "공통수학 내신 집중 팀수업",
        tag: "B반 · 화금",
        startDate: "1/5 (화·금)",
        time: "PM 6:00-10:00",
        bullets: [
          "대상: 공통수학을 2회독 한 학생",
          "교재: 감마(심화) — 화금반은 심화개념 40% + 문제풀이 60% (더 어려운 문항 위주)",
          "모든 클리닉에 이동재T가 직접 참여, 학생별 추가 심화·기본 문항 제공",
        ],
      },
    ],
  },
  {
    gradeLabel: "예비고2",
    title: "내신 집중 팀수업",
    teacher: "이동재T + TeamDJ 클리닉팀",
    courses: [
      {
        name: "대수 내신 집중 팀수업",
        tag: "오전",
        startDate: "12/19 (토)",
        time: "AM 9:00-13:00",
        bullets: [
          "개학 후 내신 1등급 완성을 위한 모든 개념 강의, 개념+심화개념 60% + 문제풀이 40%",
          "교재: 베타(실력) + 방학특강용 감마(심화) 문항 30% 추가, 오전·오후반 난이도 차이 없이 동일 수업",
          "해당 과목이 완전히 처음이면 평일 오후 '실력+ 특강 팀수업' 권장",
          "10강 완성 (설 연휴 2/6·2/7 휴강), 2월 말 진도 완료 후 3월부터 '내신 완성 팀수업'으로 연계",
        ],
      },
      {
        name: "대수 내신 집중 팀수업",
        tag: "오후",
        startDate: "12/19 (토)",
        time: "PM 1:30-5:30",
        bullets: ["오전반과 난이도 차이 없이 동일한 수업으로 진행"],
      },
      {
        name: "미적분1 내신 집중 팀수업",
        tag: "오전",
        startDate: "12/20 (일)",
        time: "AM 9:00-13:00",
        bullets: ["대수반과 동일한 방식으로 진행"],
      },
      {
        name: "미적분1 내신 집중 팀수업",
        tag: "오후",
        startDate: "12/20 (일)",
        time: "PM 1:30-5:30",
        bullets: ["대수반과 동일한 방식으로 진행"],
      },
      {
        name: "확률과통계 내신 집중 팀수업",
        tag: "예비고2,3",
        startDate: "12/19 (토)",
        time: "PM 6:00-10:00",
        bullets: ["대수·미적분1반과 동일한 방식으로 진행"],
      },
    ],
  },
  {
    gradeLabel: "예비고1,2",
    title: "특강 팀수업 '실력+'",
    teacher: "이동재T + TeamDJ 클리닉팀",
    courses: [
      {
        name: "대수 특강 팀수업",
        tag: "실력+",
        startDate: "1/4 (월·목)",
        time: "PM 1:30-5:30",
        bullets: [
          "내신에 필요한 모든 개념을 꼼꼼히 진행, 모든 필수유형 문제풀이 연습을 팀수업 내에서 진행",
          "교재: 베타(실력) + 방학특강용 문항 30% 추가, 14강 완성",
          "2학년 내신 대비 수업 — 1학년은 입반 테스트를 우수한 성적으로 통과한 경우에만 상담 후 수강 가능",
          "2/1·2/2·2/3·2/8·2/9 휴강 (2/4·2/5는 정상 진행), 2월 말 진도 완료 후 3월부터 내신대비반 연계",
        ],
      },
      {
        name: "미적분1 특강 팀수업",
        tag: "실력+",
        startDate: "1/5 (화·금)",
        time: "PM 1:30-5:30",
        bullets: ["대수반과 동일한 방식으로 진행, 14강 완성"],
      },
      {
        name: "확통 특강 팀수업",
        tag: "실력+",
        startDate: "1/6 (수)",
        time: "PM 1:30-5:30",
        bullets: ["대수반과 동일한 방식으로 진행, 7강 완성"],
      },
    ],
  },
  {
    gradeLabel: "예비고2,3",
    title: "미적분2 특강 팀수업 '기본+'",
    teacher: "이동재T + TeamDJ 클리닉팀",
    courses: [
      {
        name: "미적분2 특강 팀수업",
        tag: "기본+",
        startDate: "1/5 (화·목)",
        time: "AM 9:00-13:00",
        bullets: [
          "내신에 필요한 모든 개념을 꼼꼼히 진행, 모든 필수유형 문제풀이 연습을 팀수업 내에서 진행",
          "교재: 베타(실력) + 알파(기초) 문항 40% 추가, 14강 완성 (2/1·2/8 휴강)",
          "예비고3은 개학 후 2028 수능대비 팀수업에서 내신기간에 미적분2 내신대비 자료 제공 및 첨삭 진행",
        ],
      },
    ],
  },
  {
    gradeLabel: "예비고3",
    title: "2028 수능대비 고3 팀 스파르타 3기",
    teacher: "이동재T + TeamDJ 클리닉팀",
    courses: [
      {
        name: "2028 수능대비 고3 팀 스파르타 3기",
        tag: "전 시즌",
        startDate: "[12월] 12/20",
        time: "[12월] 일 18:00-22:00 · [1,2월 방학] 월수금 9:00-13:00 (+일 18-22 클리닉) · [3월~] 일 18:00-22:00",
        bullets: [
          "12/20·12/27 일요일 18-22시에 1·2강 진행, 1·2월 방학기간은 월수금 오전에 수업",
          "방학기간 매주 일요일 18-22시 고3 전용 클리닉, 개학 후에도 일요일 18-22시 수업 진행",
          "총 23강, 2월 말까지 최근 7개년 모의고사 4점 기출 1회독 (2/1·2/3·2/8 휴강)",
          "시즌1(~3월 모평) 4점 전체 1회독 · 시즌2(~6월 모평) 준킬러·킬러 2회독 · 시즌3(~9월 모평) 6월 평가원 경향 반영 · 시즌4(~수능) 파이널",
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
