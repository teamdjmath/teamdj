"use client";

import { motion } from "motion/react";

export function SeminarSection() {
  return (
    <section className="w-full py-14 md:py-20 bg-zinc-950 text-white overflow-hidden">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-emerald-400 font-bold tracking-tight text-sm uppercase mb-3 block">
              Seminar
            </span>
            <h2 className="text-2xl md:text-4xl font-black tracking-tighter break-keep">
              비공개 학부모 설명회
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="shrink-0"
          >
            <span className="inline-flex items-center gap-2 h-12 md:h-14 px-6 md:px-8 rounded-full bg-white/10 text-white text-sm md:text-base font-bold">
              추후 오픈
            </span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
