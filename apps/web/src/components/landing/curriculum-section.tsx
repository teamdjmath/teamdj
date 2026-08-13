/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "motion/react";
import { CURRICULUM_DATA } from "@/lib/curriculum-data";

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

        {/* 모바일: 이미지 대신 블록으로 나열 + 이미지 다운로드 버튼 */}
        <div className="sm:hidden space-y-8">
          {CURRICULUM_DATA.map((cat) => (
            <div key={`${cat.category}-${cat.grade}`}>
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">
                  {cat.category}
                </span>
                <span className="text-lg font-black text-zinc-950">{cat.grade}</span>
              </div>
              <div className="space-y-2.5">
                {cat.courses.map((course) => (
                  <div key={course.name} className={`rounded-xl border border-zinc-200 ${cat.color} px-4 py-3.5`}>
                    <p className="font-bold text-zinc-900 text-sm break-keep mb-1">{course.name}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed break-keep">{course.goal}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {CURRICULUM_IMAGE && (
            <a
              href={CURRICULUM_IMAGE}
              download
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 py-3 text-sm font-bold text-zinc-700"
            >
              커리큘럼 표 이미지 다운로드
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12l4.5 4.5m0 0l4.5-4.5m-4.5 4.5V3" />
              </svg>
            </a>
          )}
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
