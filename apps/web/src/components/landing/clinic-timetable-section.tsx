"use client";

import { motion } from "motion/react";

const ROWS = [
  { days: "월 · 화 · 목 · 금", time: "18:00 ~ 22:00" },
  { days: "토 · 일", time: "12:00 ~ 19:00" },
];

export function ClinicTimetableSection() {
  return (
    <section className="w-full py-14 md:py-24 bg-zinc-50 overflow-hidden border-t border-zinc-100" id="clinic">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div
          className="text-center mb-12 md:mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-emerald-600 font-bold tracking-tight text-sm uppercase mb-4 block">
            Clinic Hours
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 mb-6 break-keep">
            클리닉 시간표
          </h2>
          <p className="text-zinc-500 text-lg md:text-xl font-medium leading-loose break-keep">
            횟수 제한 없이, 필요한 만큼 등원해서 막힌 문항을 바로 첨삭받는 시간입니다.
          </p>
          <p className="text-zinc-400 text-sm mt-2">* 2학기(개학) 기준 · 방학 중에는 시간이 다를 수 있습니다</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4 md:gap-5 max-w-2xl mx-auto">
          {ROWS.map((row, idx) => (
            <motion.div
              key={row.days}
              className="rounded-2xl border border-zinc-200 bg-white p-7 md:p-8 text-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.08 }}
            >
              <p className="text-sm font-bold text-zinc-400 mb-3">{row.days}</p>
              <p className="text-2xl md:text-3xl font-black tracking-tighter text-zinc-950">{row.time}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="mt-8 text-center text-zinc-400 text-sm break-keep"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          정규반 학생은 주 1회 필참, 그 외 학생은 자율적으로 이용할 수 있습니다.
        </motion.p>
      </div>
    </section>
  );
}
