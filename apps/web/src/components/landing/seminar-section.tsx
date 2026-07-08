"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { SITE_CONFIG } from "@/lib/site-config";

export function SeminarSection() {
  const ctaHref = SITE_CONFIG.kakaoChannelUrl || "/consultation";
  const isExternal = ctaHref.startsWith("http");

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
            <h2 className="text-2xl md:text-4xl font-black tracking-tighter mb-4 break-keep">
              학부모 입시 전략 설명회
            </h2>
            <p className="text-zinc-400 leading-loose break-keep max-w-xl">
              학년별 학습 전략과 입시 로드맵을 안내하는 설명회를 주기적으로 진행합니다.
              <br className="hidden md:block" />
              다음 일정은 확정되는 대로 안내드립니다.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="shrink-0"
          >
            {isExternal ? (
              <a
                href={ctaHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 h-12 md:h-14 px-6 md:px-8 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-sm md:text-base font-bold transition-all"
              >
                설명회 일정 알림 받기
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </a>
            ) : (
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 h-12 md:h-14 px-6 md:px-8 rounded-full bg-white text-zinc-950 hover:bg-zinc-200 text-sm md:text-base font-bold transition-all"
              >
                설명회 일정 알림 받기
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
