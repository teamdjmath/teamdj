"use client";

import { motion } from "motion/react";

export function TeacherIntro() {
  return (
    <section className="w-full py-24 bg-white overflow-hidden">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <span className="text-emerald-600 font-bold tracking-tight text-sm uppercase mb-4 block">
              Teacher&apos;s Philosophy
            </span>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-zinc-950 mb-10 leading-[1.4] break-keep">
              지식 그 이상의,<br />
              페이스메이커.
            </h2>
            <div className="space-y-8 text-zinc-600 leading-loose text-lg break-keep">
              <p>
                수능은 지능의 싸움이 아닙니다. 그것은 <span className="text-zinc-950 font-bold">인내와 전략, 그리고 올바른 습관</span>의 싸움입니다. 
                저는 단순히 문제 풀이 기술을 가르치는 강사가 아닙니다.
              </p>
              <p>
                여러분이 가장 힘든 순간, 포기하고 싶은 그 시점에 끝까지 함께 달릴 페이스메이커가 되겠습니다. 
                모든 커리큘럼은 여러분의 <span className="text-zinc-950 font-bold">실질적인 점수 역전</span>을 목표로 설계되었습니다.
              </p>
            </div>
          </motion.div>

          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="aspect-4/5 rounded-[40px] bg-zinc-100 overflow-hidden relative border border-zinc-200">
               {/* 여기에 선생님 이미지가 들어갈 예정 */}
               <div className="absolute inset-0 flex items-center justify-center text-zinc-400 font-bold italic text-3xl">
                  TEACHER IMAGE
               </div>
               <div className="absolute bottom-8 left-8 right-8 p-6 bg-white/80 backdrop-blur-md rounded-3xl border border-white/20 shadow-xl">
                  <p className="text-zinc-950 font-black text-xl mb-1">TEAM DJ, 이동재T</p>
                  <p className="text-zinc-500 text-sm font-medium">역전의 기회가 찾아올때까지 늘 뒤에서 서포트 하겠습니다</p>
               </div>
            </div>
            {/* 장식적 요소 */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-emerald-50 rounded-full -z-10" />
            <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-zinc-50 rounded-full -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
