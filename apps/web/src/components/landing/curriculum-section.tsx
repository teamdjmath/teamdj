/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "motion/react";

// 커리큘럼 라인업 표 이미지 준비되면 이 경로에 파일을 두고 문자열을 채우세요 (예: "/curriculum.png").
const CURRICULUM_IMAGE = "";

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
            고3 Curriculum Lineup
          </h2>
          <p className="text-zinc-500 text-lg md:text-xl font-medium leading-loose">
            학년별 맞춤 설계된 정교한 레이스,<br />
            당신의 성적을 뒤집을 유일한 전략입니다.
          </p>
        </motion.div>

        {/* 데스크탑 · 태블릿: 표 이미지 그대로 */}
        <div className="hidden sm:block">
          {CURRICULUM_IMAGE ? (
            <img src={CURRICULUM_IMAGE} alt="커리큘럼 라인업" className="w-full h-auto rounded-2xl border border-zinc-200" />
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-16 text-center text-zinc-400 font-bold text-sm">
              커리큘럼 표 이미지 준비 중
            </div>
          )}
        </div>

        {/* 모바일: 요청으로 임시 비공개, 데스크톱과 동일하게 준비 중 표시만 */}
        <div className="sm:hidden">
          <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-16 text-center text-zinc-400 font-bold text-sm">
            커리큘럼 표 이미지 준비 중
          </div>
        </div>

        <motion.p
          className="mt-12 text-center text-zinc-400 text-sm italic"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          * 고3 과정은 소수 정예 팀수업으로 진행됩니다.
        </motion.p>
      </div>
    </section>
  );
}
