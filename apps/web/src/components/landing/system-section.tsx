"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { MATERIAL_LEVELS } from "@/lib/materials-data";
import { AttendanceKioskGraphic } from "./attendance-kiosk-graphic";

const SYSTEMS = [
  {
    title: "출결관리",
    icon: "attendance" as const,
    points: [
      <>등원 시 강의실 입구 패드에 번호를 입력하면 출결 체크 완료!</>,
      <>등원 여부는 학부모님께 바로 문자로 발송</>,
      <>수업 시작 15분이 지나도 학생이 없으면, 사무팀이 직접 연락해 결석 여부를 확인합니다</>,
    ],
  },
  {
    title: "과제 관리 & 학습결과 발송",
    icon: "homework" as const,
    img: "/report-sample.png",
    imgWidth: 840,
    imgHeight: 1584,
    points: [
      <>매 수업 누적 과제 검사. 밀린 과제는 <b className="text-zinc-900 font-bold">완료할 때까지 끝까지</b> 확인합니다</>,
      <>숙제장을 잃어버려도 걱정 마세요, 다시 챙겨드립니다</>,
      <>그날의 학습내용과 테스트 문항 수·점수·평균·표준편차까지 담아 발송</>,
      <>특이사항과 공지사항도 함께 전달됩니다</>,
    ],
  },
  {
    title: "클리닉",
    icon: "clinic" as const,
    img: "/clinic.jpg",
    imgWidth: 4032,
    imgHeight: 3024,
    points: [
      <>월·화·목·금 18:00~22:00, 토·일 12:00~19:00 상시 운영</>,
      <>정규반 학생은 주 1회 필참. 과제에서 막힌 문항을 바로 첨삭받는 시간입니다</>,
      <>횟수 제한 없이, 필요한 만큼 등원하면 됩니다</>,
      <>내신대비 기간에는 본 강의실에서 자료 배부와 질문 첨삭이 함께 진행되며, 등하원 시간과 학습내용은 동일하게 발송됩니다</>,
    ],
  },
  {
    title: "내신대비 기간",
    icon: "exam" as const,
    points: [
      <>시험 치는 주를 포함해 약 3주 전부터 시작됩니다</>,
      <>참여 여부는 학생이 직접 선택하며, 내신대비 교재는 참여 학생만 구매할 수 있습니다</>,
      <>참여 학생에게는 DECISIVE(공용 내신대비 교재)와 DEVOTE(학교별 내신대비 숙제장)가 배부되고, 평소보다 많은 조교진과 이동재T가 직접 첨삭합니다</>,
      <>학교별 작년 시험지의 난이도·문항 수를 그대로 재현하고 올해 부교재·프린트물까지 반영한 학교별 모의기말고사로 실전 감각까지 훈련합니다</>,
    ],
  },
];

type SystemIconType = (typeof SYSTEMS)[number]["icon"];

function SystemIcon({ type, className }: { type: SystemIconType; className?: string }) {
  const common = {
    className,
    fill: "none" as const,
    stroke: "currentColor" as const,
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };
  if (type === "attendance") {
    return (
      <svg {...common}>
        <rect x="4" y="3" width="16" height="18" rx="2" />
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="18.5" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (type === "homework") {
    return (
      <svg {...common}>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 3h6a1 1 0 0 1 1 1v1H8V4a1 1 0 0 1 1-1Z" />
        <path d="M8 11h8M8 15h8M8 19h5" />
      </svg>
    );
  }
  if (type === "clinic") {
    return (
      <svg {...common}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
        <path d="M12 9.3a1.5 1.5 0 0 1 3 0c0 1.5-2 1.5-2 3" />
        <path d="M13.5 15.8h.01" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" />
      <path d="M14 3v6h6" />
      <circle cx="12" cy="15" r="3" />
      <path d="M12 14v1.3l1 .5" />
    </svg>
  );
}

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
        <div className="grid sm:grid-cols-2 gap-4 md:gap-5 mb-10">
          {MATERIAL_LEVELS.map((lvl, idx) => (
            <motion.div
              key={lvl.tag}
              className={`rounded-2xl border p-6 md:p-7 ${lvl.accent
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

        <motion.div
          className="flex justify-center mb-16 md:mb-24"
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Link
            href="/materials"
            className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-bold text-zinc-700 hover:border-zinc-950 hover:text-zinc-950 transition-colors"
          >
            교재 더 알아보기
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </motion.div>

        {/* 관리 시스템 */}
        <motion.h3
          className="text-2xl md:text-3xl font-black tracking-tighter text-zinc-950 mb-8 text-center break-keep"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          학생들을 보다 타이트하게, 밀착 관리합니다
        </motion.h3>

        <div className="space-y-14 md:space-y-20">
          {SYSTEMS.map((sys, idx) => (
            <motion.div
              key={sys.title}
              className={`flex flex-col items-center gap-6 md:gap-14 ${idx % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"
                }`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.06 }}
            >
              {/* 사진 (실제 사진 준비되면 이 자리에 교체) */}
              <div className="w-full md:w-2/5 shrink-0">
                {"img" in sys && sys.img ? (
                  <div className="flex justify-center">
                    <Image
                      src={sys.img}
                      alt={`${sys.title} 예시`}
                      width={sys.imgWidth}
                      height={sys.imgHeight}
                      sizes="(min-width: 768px) 40vw, 90vw"
                      className="max-h-[420px] w-auto rounded-3xl border border-zinc-200 object-contain"
                    />
                  </div>
                ) : sys.icon === "attendance" ? (
                  <div className="aspect-4/3 p-3">
                    <AttendanceKioskGraphic />
                  </div>
                ) : (
                  <div className="aspect-4/3 rounded-3xl bg-zinc-50 border border-zinc-200 flex items-center justify-center">
                    <SystemIcon type={sys.icon} className="w-14 h-14 md:w-16 md:h-16 text-zinc-300" />
                  </div>
                )}
              </div>

              {/* 설명 */}
              <div className="w-full md:w-3/5">
                <span className="text-emerald-600 font-black text-sm tracking-widest mb-2 block">
                  0{idx + 1}
                </span>
                <h4 className="text-xl md:text-2xl font-black tracking-tight text-zinc-950 mb-4 break-keep">
                  {sys.title}
                </h4>
                <ul className="space-y-2.5">
                  {sys.points.map((p, i) => (
                    <li key={i} className="text-sm md:text-base text-zinc-500 leading-relaxed break-keep flex gap-2">
                      <span className="text-emerald-600 shrink-0">·</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
