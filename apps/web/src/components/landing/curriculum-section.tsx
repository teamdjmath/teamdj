"use client";

import { motion } from "motion/react";

const CURRICULUM_DATA = [
  {
    category: "고등부",
    grade: "고1, 2",
    courses: [
      { name: "고1 심화/고난도", goal: "상위권 진입을 위한 완벽한 개념 체계화 및 고난도 문항 적응" },
      { name: "고2 대수/미적1 심화", goal: "실전 개념의 완성, 수능형 사고의 기틀을 마련하는 전략적 심화" }
    ],
    color: "bg-zinc-100"
  },
  {
    category: "입시부",
    grade: "고3, N수",
    courses: [
      { name: "27 수능 대비 팀수업 1기/2기", goal: "오직 상위권만을 위한 고농축 실전 훈련 및 압도적 성과를 위한 DJ MATERIALS 집중 학습" }
    ],
    color: "bg-zinc-50"
  },
  {
    category: "SPECIAL",
    grade: "DJ MATERIALS",
    courses: [
      { name: "차원이 다른 전용 교재", goal: "시중에서 볼 수 없는 독보적 퀄리티의 고퀄리티 자체 제작 컨텐츠" }
    ],
    color: "bg-emerald-50/30"
  }
];

export function CurriculumSection() {
  return (
    <section className="py-24 bg-white overflow-hidden" id="curriculum">
      <div className="container max-w-5xl mx-auto px-4">
        <motion.div 
          className="text-center mb-20"
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

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border-spacing-0">
            <thead>
              <tr className="border-t-2 border-zinc-950">
                <th className="py-6 px-4 text-left text-sm font-black uppercase tracking-widest text-zinc-950 w-1/4">구분</th>
                <th className="py-6 px-4 text-left text-sm font-black uppercase tracking-widest text-zinc-950 w-1/4">강좌</th>
                <th className="py-6 px-4 text-left text-sm font-black uppercase tracking-widest text-zinc-950">전략적 가치</th>
              </tr>
            </thead>
            <tbody>
              {CURRICULUM_DATA.map((item, idx) => (
                <tr key={idx} className={`border-t border-zinc-200 ${item.color}`}>
                  <td className="py-10 px-4 align-top">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-emerald-600 block">{item.category}</span>
                      <span className="text-xl font-black text-zinc-950 block">{item.grade}</span>
                    </div>
                  </td>
                  <td className="py-10 px-4 align-top">
                    <div className="space-y-6">
                      {item.courses.map((course, cIdx) => (
                        <div key={cIdx} className="text-lg font-bold text-zinc-900 break-keep">
                          {course.name}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-10 px-4 align-top">
                    <div className="space-y-6">
                      {item.courses.map((course, cIdx) => (
                        <div key={cIdx} className="text-md text-zinc-500 leading-loose break-keep">
                          {course.goal}
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-zinc-950"></tr>
            </tbody>
          </table>
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
