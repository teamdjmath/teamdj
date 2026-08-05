/* eslint-disable @next/next/no-img-element */
"use client";

import { motion } from "motion/react";

// 카카오톡 학부모 후기 캡처본 — public/reviews/ 에 이미지 넣고 파일명만 채우면 됩니다.
const KAKAO_REVIEW_IMAGES: string[] = [
  // "/reviews/review-01.png",
  // "/reviews/review-02.png",
];

export function TestimonialSection() {
  return (
    <section className="w-full py-14 md:py-24 bg-white overflow-hidden" id="testimonial">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div
          className="text-center mb-14 md:mb-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-emerald-600 font-bold tracking-tight text-sm uppercase mb-4 block">
            Proven Results
          </span>
          <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 mb-6 break-keep">
            검증된 실력
          </h2>
          <p className="text-zinc-500 text-lg md:text-xl font-medium leading-loose break-keep">
            학부모님들이 직접 보내주신 이야기입니다.
          </p>
        </motion.div>

        {KAKAO_REVIEW_IMAGES.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-16 text-center text-zinc-400 font-bold text-sm">
            후기 캡처본 준비 중
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 md:gap-6">
            {KAKAO_REVIEW_IMAGES.map((src, idx) => (
              <motion.div
                key={src}
                className="break-inside-avoid mb-5 md:mb-6 rounded-2xl border border-zinc-200 overflow-hidden shadow-sm"
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: (idx % 6) * 0.06 }}
              >
                <img src={src} alt={`학부모 후기 ${idx + 1}`} className="w-full h-auto" />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
