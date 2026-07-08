"use client";

import { motion } from "motion/react";

const TESTIMONIALS = [
  { quote: "전교 1등 했어요! ㅋㅋ", rotate: -3, shift: 0, tone: "bg-zinc-50" },
  { quote: "더블 100 확정!!", rotate: 2, shift: 22, tone: "bg-emerald-50/60" },
  { quote: "저 또 수학 1이에요♥", rotate: -5, shift: 8, tone: "bg-white" },
  { quote: "저 다 맞았어요!!", rotate: 4, shift: 30, tone: "bg-zinc-50" },
  { quote: "동재쌤 저 대수미적 둘다 3등이에요..!!", rotate: -2, shift: 10, tone: "bg-white" },
  { quote: "수학 3등!", rotate: 5, shift: 0, tone: "bg-emerald-50/60" },
  { quote: "대수 미적 둘다 전교 3등 했어요!", rotate: -4, shift: 18, tone: "bg-zinc-50" },
  { quote: "전교1등 한명 더 추가요~", rotate: 3, shift: 4, tone: "bg-white" },
  { quote: "객관식 다 맞았어요", rotate: -6, shift: 26, tone: "bg-emerald-50/60" },
];

function Stars() {
  return (
    <div className="flex gap-0.5 mb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 20 20" className="w-4 h-4 fill-emerald-500">
          <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.2 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.2 6.1-.6z" />
        </svg>
      ))}
    </div>
  );
}

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
            수많은 후기가 실력을 증명합니다.
          </p>
        </motion.div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 md:gap-6">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="break-inside-avoid mb-5 md:mb-6"
              style={{ transform: `rotate(${t.rotate}deg)`, marginTop: idx < 3 ? 0 : t.shift }}
            >
              <motion.div
                className={`rounded-2xl border border-zinc-200 p-6 shadow-sm hover:shadow-xl hover:scale-105 hover:rotate-0 transition-all duration-300 ${t.tone}`}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: (idx % 5) * 0.06 }}
              >
                <Stars />
                <p className="text-zinc-900 font-bold text-lg leading-snug break-keep">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </motion.div>
            </div>
          ))}
        </div>

        <motion.p
          className="mt-10 text-center text-zinc-400 text-sm"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          * 실제 학생들이 보내온 메시지를 발췌했습니다.
        </motion.p>
      </div>
    </section>
  );
}
