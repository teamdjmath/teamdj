"use client";

import { useState } from "react";
import { motion } from "motion/react";

const TEACHER_PHONE = "010-9205-6541";
const CLINIC_TEAM_PHONE = "053-214-4365";

export function ClosingSection() {
  const [revealed, setRevealed] = useState(false);

  return (
    <section id="consultation" className="w-full py-20 md:py-32 bg-white text-zinc-950 overflow-hidden border-t border-zinc-100">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="flex flex-col items-center text-center relative">
          {/* 큰 따옴표 디자인 요소 */}
          <div className="text-zinc-100 text-[180px] font-serif absolute -top-24 left-0 leading-none select-none pointer-events-none opacity-50">
            &ldquo;
          </div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="space-y-10 relative z-10"
          >
            <h2 className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.6] break-keep">
              숨이 턱 끝까지 차오르는 순간,<br />
              <span className="text-emerald-600">진짜 수학</span>이 시작됩니다.
            </h2>
            <p className="text-zinc-500 text-lg md:text-2xl font-medium leading-loose break-keep max-w-3xl mx-auto">
              지금, 그 짜릿한 역전의 레이스에 합류하세요.
            </p>
          </motion.div>

          <div className="text-zinc-100 text-[180px] font-serif absolute -bottom-24 right-0 leading-none select-none pointer-events-none opacity-50">
            &rdquo;
          </div>

          <motion.div
            className="mt-16 w-full max-w-md"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {!revealed ? (
              <button
                type="button"
                onClick={() => setRevealed(true)}
                className="inline-flex items-center gap-3 h-14 md:h-16 px-8 md:px-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-lg md:text-xl font-bold transition-all shadow-2xl"
              >
                상담 신청하기
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </button>
            ) : (
              <div className="space-y-3 text-left">
                <a
                  href={`tel:${TEACHER_PHONE.replace(/-/g, "")}`}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/50 px-6 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div>
                    <p className="text-xs font-medium text-zinc-400">이동재T</p>
                    <p className="text-lg font-bold text-zinc-950">{TEACHER_PHONE}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">전화 걸기 →</span>
                </a>
                <a
                  href={`tel:${CLINIC_TEAM_PHONE.replace(/-/g, "")}`}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-zinc-50/50 px-6 py-4 hover:bg-zinc-50 transition-colors"
                >
                  <div>
                    <p className="text-xs font-medium text-zinc-400">클리닉팀</p>
                    <p className="text-lg font-bold text-zinc-950">{CLINIC_TEAM_PHONE}</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-600">전화 걸기 →</span>
                </a>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
