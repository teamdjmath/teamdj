"use client";

import { motion } from "motion/react";

const STATS = [
  "2025년 하계 특강 전 타임 마감",
  "고1 공통수학2 · 고2 미적분 마감",
  "월목 고1반 1등급 60% · 화금 고1반 1등급 80% 배출",
];

const REGULAR_CLASSES_G2 = [
  {
    no: "01",
    name: "미적분 정규 A",
    time: "토·일 09:00~11:50 (주2회 · 개학 후 주1회)",
    detail: "7/11~8/9 10강 완성 · B반 교차 가능",
  },
  {
    no: "02",
    name: "미적분 정규 B",
    time: "토·일 16:00~18:50 (주2회 · 개학 후 주1회)",
    detail: "7/11~8/9 10강 완성 · A반 교차 가능",
  },
  {
    no: "03",
    name: "확률과 통계 정규 A",
    time: "토 13:00~15:50 (주1회 · 개학 후 주1회)",
    detail: "7/11~8/8 11강 완성 · B반 교차 가능",
  },
  {
    no: "04",
    name: "확률과 통계 정규 B",
    time: "일 13:00~15:50 (주1회 · 개학 후 주1회)",
    detail: "7/12~8/9 11강 완성 · A반 교차 가능",
    extra: "7/20~8/7 방학 기간은 월·목 16:00~18:50 추가 (주3회)",
  },
  {
    no: "05",
    name: "미적분1 정규",
    time: "토 19:00~21:50 (주1회 · 개학 후 주1회)",
    detail: "7/11~8/8 11강 완성",
    extra: "7/20~8/7 방학 기간은 화·금 16:00~18:50 추가 (주3회)",
  },
];

const SPARTA_COURSES = [
  {
    grade: "고2",
    title: "미적분2 스파르타 특강",
    schedule: [
      { day: "월·화·목·금", time: "09:00~11:50", label: "오전 클리닉 (테스트 포함)" },
      { day: "수", time: "이동재T", label: "직접클리닉" },
      { day: "월·화·목·금", time: "12:40~15:30", label: "오후 진도수업" },
    ],
    follow: [
      "토요일 오전 9시 또는 16시 분반 → 미적분2 실력+",
      "일요일 오전 9시 또는 16시 분반 → 미적분2 고난도",
    ],
  },
  {
    grade: "고1",
    title: "공통수학2 스파르타 특강",
    schedule: [
      { day: "월·화·목·금", time: "09:00~11:50", label: "진도 수업" },
      { day: "수", time: "이동재T", label: "직접클리닉" },
      { day: "월·화·목·금", time: "12:40~15:30", label: "오후 클리닉 (테스트 포함)" },
    ],
    follow: [
      "월·목요일 → 공통수학2 심화반",
      "화·금요일 → 공통수학2 고난도반",
    ],
  },
];

export function SpecialLectureSection() {
  return (
    <section className="w-full py-14 md:py-24 bg-zinc-50 overflow-hidden border-y border-zinc-100" id="special-lecture">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div
          className="text-center mb-10 md:mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-emerald-600 font-bold tracking-tight text-sm uppercase mb-4 block">
            Special Lecture
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 mb-4 break-keep">
            2026 여름방학 특강 안내
          </h2>
          <p className="text-zinc-500 text-lg font-medium">
            TEAM DJ, 이동재T &middot; 現 다원 MDS &middot; 前 고3 전문 투혼교육 2023년 최우수 강사
          </p>
        </motion.div>

        {/* 실적 하이라이트 */}
        <motion.div
          className="flex flex-wrap justify-center gap-3 mb-14 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          {STATS.map((stat) => (
            <span
              key={stat}
              className="px-5 py-3 rounded-full bg-zinc-950 text-white text-sm md:text-base font-bold break-keep"
            >
              {stat}
            </span>
          ))}
        </motion.div>

        {/* 고2 */}
        <div className="mb-16 md:mb-24">
          <motion.h3
            className="text-2xl md:text-3xl font-black tracking-tighter text-zinc-950 mb-8 flex items-center gap-3"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-emerald-600">고2</span> 방학 커리큘럼
          </motion.h3>

          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <p className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-4">
              방학 중 정규반
            </p>
            <div className="grid gap-3">
              {REGULAR_CLASSES_G2.map((c) => (
                <div
                  key={c.no}
                  className="flex gap-4 md:gap-6 items-start bg-white rounded-2xl border border-zinc-200 p-5 md:p-6"
                >
                  <span className="text-emerald-600 font-black text-lg shrink-0">{c.no}</span>
                  <div className="space-y-1">
                    <p className="font-bold text-zinc-950 break-keep">{c.name}</p>
                    <p className="text-sm text-zinc-500 break-keep">{c.time}</p>
                    <p className="text-sm text-zinc-400 break-keep">{c.detail}</p>
                    {c.extra && (
                      <p className="text-sm text-emerald-600 font-medium break-keep">{c.extra}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <SpartaCard course={SPARTA_COURSES[0]} />
        </div>

        {/* 고1 */}
        <div>
          <motion.h3
            className="text-2xl md:text-3xl font-black tracking-tighter text-zinc-950 mb-8 flex items-center gap-3"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-emerald-600">고1</span> 방학 커리큘럼
          </motion.h3>

          <SpartaCard course={SPARTA_COURSES[1]} />
        </div>

        {/* 전체 시간표 이미지 삽입 자리 — 실제 주간 시간표 그래픽 준비되면 아래 자리에 교체 */}
        <motion.div
          className="mt-16 md:mt-20 rounded-3xl border-2 border-dashed border-zinc-300 bg-white p-10 md:p-16 flex items-center justify-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <p className="text-zinc-400 font-bold text-sm md:text-base">
            전체 주간 시간표 이미지 (준비 중)
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function SpartaCard({ course }: { course: (typeof SPARTA_COURSES)[number] }) {
  return (
    <motion.div
      className="rounded-3xl bg-zinc-950 text-white p-6 md:p-10"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
        <h4 className="text-xl md:text-2xl font-black tracking-tighter break-keep">
          {course.title}
        </h4>
        <span className="text-emerald-400 text-sm font-bold">7/21(화) ~ 8/7(금) · 3주간</span>
      </div>
      <p className="text-zinc-400 text-sm mb-8">월·화·목·금 · 11강 진행 · 자체 제작 교재</p>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {course.schedule.map((s, i) => (
          <div key={i} className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-xs text-zinc-400 mb-1">{s.day}</p>
            <p className="text-sm font-bold text-white mb-1">{s.time}</p>
            <p className="text-xs text-zinc-300 break-keep">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-500 mb-8">
        * 학습이 부족할 경우 16:00~19:00 추가클리닉 진행
      </p>

      <div className="border-t border-white/10 pt-6">
        <p className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-3">
          특강 이후 연계반 (개학 후)
        </p>
        <div className="space-y-2">
          {course.follow.map((f, i) => (
            <p key={i} className="text-sm md:text-base text-zinc-200 break-keep">
              {f}
            </p>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
