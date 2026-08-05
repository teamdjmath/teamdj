"use client";

import { motion } from "motion/react";

// 이번학기 개설반 목록/모집상태 데이터 소스가 정해지면 채웁니다.
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

        <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-white p-16 text-center text-zinc-400 font-bold text-sm">
          개설반 안내 준비 중
        </div>
      </div>
    </section>
  );
}
