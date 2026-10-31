"use client";

import { motion } from "motion/react";

export function SeminarSection() {
  return (
    <section className="w-full py-14 md:py-20 bg-zinc-950 text-white overflow-hidden">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-emerald-400 font-bold tracking-tight text-sm uppercase mb-3 block">
            Seminar
          </span>
          <h2 className="text-2xl md:text-4xl font-black tracking-tighter break-keep mb-4">
            비공개 학부모 설명회
          </h2>
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed break-keep max-w-xl">
            에이티오 에듀에서는 이동재T 수업 재원생 학부모님을 대상으로,
            <br />
            연 2~3회 비공개 간담회를 정기적으로 진행합니다.
            <br />
            비공개 간담회에서는 입시에 필요한 정보들을 얻을 수 있습니다.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
