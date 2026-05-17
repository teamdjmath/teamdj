"use client";

import Link from "next/link";
import { motion } from "motion/react";

export function ClosingSection() {
  return (
    <section className="w-full py-32 bg-white text-zinc-950 overflow-hidden border-t border-zinc-100">
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
            className="mt-16"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <Link
              href="/consultation"
              className="inline-flex items-center gap-3 h-16 px-12 rounded-full bg-zinc-950 text-white hover:bg-zinc-800 text-xl font-bold transition-all shadow-2xl"
            >
              상담 신청하기
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
