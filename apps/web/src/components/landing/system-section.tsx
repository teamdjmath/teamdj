"use client";

import { motion } from "motion/react";

const LEVELS = [
  {
    tag: "LEVEL 1",
    audience: "0~2회독 학생 대상 · 방학교재",
    accent: false,
    books: [
      { name: "DEEP", role: "수업용 주교재", desc: "깊이가 다른 시작, 올바른 개념의 본질을 마주하다" },
      { name: "DETAIL", role: "과제용 부교재 (A·B형)", desc: "개념을 깊게 훈련하는 가장 확실한 반복. A·B형 중 선택해 과제 수행, 배부는 두 유형 모두 진행" },
    ],
  },
  {
    tag: "LEVEL 2",
    audience: "1회독 이상 학생 대상 · 개학교재",
    accent: false,
    books: [
      { name: "DEVELOP", role: "수업용 주교재", desc: "개념의 확장, 낯선 심화 문항을 풀어내는 정교한 논리" },
      { name: "DERIVE", role: "과제용 부교재", desc: "논리의 흐름을 파고드는 단계별 심화학습" },
    ],
  },
  {
    tag: "LEVEL 3",
    audience: "내신대비 · 시험 3~4주 전 시작",
    accent: false,
    books: [
      { name: "DEVOTE", role: "공용 내신대비 교재", desc: "최근 3개년 내신 기출 중 최다 빈출 유형만 재편. 내신대비 참여 학생 전원 배부" },
      { name: "DECISIVE", role: "학교별 내신대비 교재", desc: "학교별 부교재·프린트물·교과서·역대 기출까지 학교 맞춤 자료로 구성" },
    ],
  },
  {
    tag: "SPECIAL",
    audience: "스파르타 특강 전용",
    accent: true,
    books: [
      { name: "DETERMINE", role: "특강용 교재", desc: "가장 많은 문항으로 필수 유형을 반복 훈련. 난이도보다 절대량과 타이트한 훈련에 집중" },
    ],
  },
];

const SYSTEMS = [
  {
    title: "출결 시스템",
    points: [
      "본 수업·클리닉 등원 시 패드로 본인 번호 입력",
      "등원 확인 문자, 학부모님께 실시간 발송",
      "수업 시작 15분 후 미등원 학생은 학부모님께 즉시 연락",
    ],
  },
  {
    title: "학습결과 및 과제 검사",
    points: [
      "매 수업, 지난 시간 숙제장 제출 후 다음 숙제장 배부",
      "누적 과제검사 : 미완료 과제는 100% 완료할 때까지 계속 확인",
    ],
  },
  {
    title: "클리닉 운영",
    points: [
      "월·화·목·금 17:30 ~ 22:00",
      "토·일 12:00 ~ 19:00",
      "밀린 과제를 클리닉에서 완료하면, 다음 시간부터 갱신된 학습결과가 발송됩니다",
    ],
  },
];

export function SystemSection() {
  return (
    <section className="w-full py-14 md:py-24 bg-white overflow-hidden border-t border-zinc-100" id="system">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-emerald-600 font-bold tracking-tight text-sm uppercase mb-4 block">
            Materials &amp; System
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 mb-6 break-keep">
            교재 체계 &amp; 관리 시스템
          </h2>
          <p className="text-zinc-500 text-lg md:text-xl font-medium leading-loose break-keep">
            학생의 회독 수와 시기에 맞춘 7종 교재, 그리고 학생을 놓치지 않는 밀착 관리.
          </p>
        </motion.div>

        {/* 교재 체계 */}
        <div className="grid sm:grid-cols-2 gap-4 md:gap-5 mb-16 md:mb-24">
          {LEVELS.map((lvl, idx) => (
            <motion.div
              key={lvl.tag}
              className={`rounded-2xl border p-6 md:p-7 ${
                lvl.accent
                  ? "bg-zinc-950 border-zinc-900 text-white"
                  : "bg-white border-zinc-200"
              }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
            >
              <div className="flex items-baseline gap-2 mb-1">
                <span className={`text-xs font-black uppercase tracking-widest ${lvl.accent ? "text-emerald-400" : "text-emerald-600"}`}>
                  {lvl.tag}
                </span>
              </div>
              <p className={`text-sm mb-5 break-keep ${lvl.accent ? "text-zinc-400" : "text-zinc-400"}`}>
                {lvl.audience}
              </p>

              <div className="space-y-4">
                {lvl.books.map((b) => (
                  <div key={b.name}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className={`font-black tracking-tight ${lvl.accent ? "text-white" : "text-zinc-950"}`}>
                        {b.name}
                      </span>
                      <span className={`text-xs font-medium ${lvl.accent ? "text-zinc-500" : "text-zinc-400"}`}>
                        {b.role}
                      </span>
                    </div>
                    <p className={`text-sm leading-relaxed break-keep ${lvl.accent ? "text-zinc-300" : "text-zinc-500"}`}>
                      {b.desc}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* 관리 시스템 */}
        <motion.h3
          className="text-2xl md:text-3xl font-black tracking-tighter text-zinc-950 mb-8 text-center break-keep"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          학생들을 보다 타이트하게, 밀착 관리합니다
        </motion.h3>

        <div className="grid sm:grid-cols-3 gap-4 md:gap-5">
          {SYSTEMS.map((sys, idx) => (
            <motion.div
              key={sys.title}
              className="rounded-2xl border border-zinc-200 bg-zinc-50 p-6 md:p-7"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
            >
              <p className="font-bold text-zinc-950 mb-4 break-keep">{sys.title}</p>
              <ul className="space-y-2">
                {sys.points.map((p, i) => (
                  <li key={i} className="text-sm text-zinc-500 leading-relaxed break-keep flex gap-2">
                    <span className="text-emerald-600 shrink-0">·</span>
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
