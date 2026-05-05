"use client";

import { motion } from "motion/react";
import { BarChart3, MessageSquare, CalendarRange } from "lucide-react";

const FEATURES = [
  {
    title: "학습 리포트",
    description: "데이터로 증명하는 나의 성장. 매주 발행되는 상세 성적 리포트로 약점을 정확히 타격합니다.",
    icon: <BarChart3 className="w-6 h-6 text-zinc-950" />,
    color: "bg-blue-50",
    mockup: (
      <div className="w-full h-full p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-24 bg-zinc-200 rounded-full animate-pulse" />
          <div className="h-6 w-12 bg-zinc-950 rounded-lg" />
        </div>
        <div className="flex-1 flex items-end gap-2 px-2">
          <div className="w-1/4 h-[40%] bg-zinc-200 rounded-t-lg" />
          <div className="w-1/4 h-[70%] bg-zinc-300 rounded-t-lg" />
          <div className="w-1/4 h-[90%] bg-zinc-950 rounded-t-lg" />
          <div className="w-1/4 h-[55%] bg-zinc-200 rounded-t-lg" />
        </div>
      </div>
    )
  },
  {
    title: "실시간 Q&A",
    description: "모르는 것은 바로바로. 선생님과 조교가 실시간으로 답변하며 학습의 맥을 짚어줍니다.",
    icon: <MessageSquare className="w-6 h-6 text-zinc-950" />,
    color: "bg-orange-50",
    mockup: (
      <div className="w-full h-full p-4 flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="w-8 h-8 rounded-full bg-zinc-200" />
          <div className="flex-1 h-12 bg-zinc-100 rounded-2xl rounded-tl-none" />
        </div>
        <div className="flex gap-2 flex-row-reverse">
          <div className="w-8 h-8 rounded-full bg-zinc-950" />
          <div className="flex-1 h-16 bg-zinc-950 rounded-2xl rounded-tr-none flex items-center px-4">
             <div className="h-2 w-full bg-white/20 rounded-full" />
          </div>
        </div>
      </div>
    )
  },
  {
    title: "학습 스케줄러",
    description: "수능까지 남은 시간, 완벽한 몰입. 개인화된 스케줄링으로 단 1분도 낭비하지 않게 관리합니다.",
    icon: <CalendarRange className="w-6 h-6 text-zinc-950" />,
    color: "bg-zinc-50",
    mockup: (
      <div className="w-full h-full p-4 space-y-4">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className={`h-6 rounded-md ${i === 8 ? 'bg-zinc-950' : 'bg-zinc-100'}`} />
          ))}
        </div>
        <div className="space-y-2">
          <div className="h-10 w-full border border-zinc-200 rounded-xl flex items-center px-3">
            <div className="h-2 w-24 bg-zinc-200 rounded-full" />
          </div>
          <div className="h-10 w-full bg-zinc-950 rounded-xl flex items-center px-3">
            <div className="h-2 w-32 bg-white/30 rounded-full" />
          </div>
        </div>
      </div>
    )
  }
];

export function FeatureShowcase() {
  return (
    <section className="w-full py-24 bg-zinc-50/50">
      <div className="container max-w-6xl mx-auto px-4">
        <div className="mb-16">
          <motion.h2 
            className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950"
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            오직 학생만을 생각하며.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              className="group relative flex flex-col h-[480px] bg-white rounded-[32px] border border-zinc-200 overflow-hidden hover:shadow-2xl hover:shadow-zinc-200/50 transition-all duration-500"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="p-8 pb-0">
                <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-100 group-hover:bg-zinc-950 group-hover:text-white transition-colors duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-zinc-950 mb-3">
                  {feature.title}
                </h3>
                <p className="text-zinc-500 text-sm leading-[1.7] break-keep">
                  {feature.description}
                </p>
              </div>

              <div className="mt-auto p-6 pt-0">
                <div className={`w-full h-48 ${feature.color} rounded-2xl border border-zinc-100 overflow-hidden`}>
                   {feature.mockup}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
