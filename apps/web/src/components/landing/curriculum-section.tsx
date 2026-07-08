"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { CURRICULUM_DATA } from "@/lib/curriculum-data";

export function CurriculumSection() {
  return (
    <section className="py-14 md:py-24 bg-white overflow-hidden" id="curriculum">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div
          className="text-center mb-12 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 mb-6 uppercase">
            Curriculum Lineup
          </h2>
          <p className="text-zinc-500 text-lg md:text-xl font-medium leading-loose">
            학년별 맞춤 설계된 정교한 레이스,<br />
            당신의 성적을 뒤집을 유일한 전략입니다.
          </p>
        </motion.div>

        <div className="space-y-10 md:space-y-14">
          {CURRICULUM_DATA.map((cat, idx) => (
            <motion.div
              key={`${cat.category}-${cat.grade}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="flex items-baseline gap-3 mb-5 md:mb-6">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                  {cat.category}
                </span>
                <span className="text-xl font-black text-zinc-950">{cat.grade}</span>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 md:gap-5">
                {cat.courses.map((course) => (
                  <Link
                    key={course.slug}
                    href={`/curriculum/${course.slug}`}
                    className={`group flex flex-col justify-between rounded-2xl border border-zinc-200 ${cat.color} p-6 md:p-7 hover:border-zinc-950 transition-colors`}
                  >
                    <div>
                      <p className="text-lg md:text-xl font-bold text-zinc-900 mb-3 break-keep">
                        {course.name}
                      </p>
                      <p className="text-sm text-zinc-500 leading-relaxed break-keep">
                        {course.goal}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 mt-6 text-sm font-bold text-zinc-950">
                      바로가기
                      <svg
                        className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </span>
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="mt-12 text-center text-zinc-400 text-sm italic"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          * 고3 과정은 소수 정예 팀수업으로 진행되며, DJ MATERIALS가 공통 제공됩니다.
        </motion.p>
      </div>
    </section>
  );
}
