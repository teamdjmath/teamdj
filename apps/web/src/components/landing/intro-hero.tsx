"use client";

import { motion } from "motion/react";
import Link from "next/link";

export function IntroHero() {
  return (
    <div className="container max-w-5xl mx-auto">
      <header className="relative pt-4">
        <nav className="flex items-center justify-between rounded-xl bg-white py-2 px-4 shadow-lg border border-zinc-200">
          <Link href="/" className="text-lg font-black tracking-tighter text-zinc-950 uppercase italic">
            TeamDJ
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-zinc-950 px-4 py-1.5 text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
          >
            로그인
          </Link>
        </nav>
      </header>

      <main className="relative px-2 mx-auto">
        <section className="w-full pt-20 pb-16 md:pt-28 md:pb-20 lg:pt-36 lg:pb-28">
          <motion.div
            className="flex flex-col items-center space-y-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="px-4 py-1.5 rounded-full bg-zinc-100 text-zinc-600 text-[11px] font-bold uppercase tracking-widest"
            >
              TeamDJ 플랫폼 소개
            </motion.div>

            <motion.h1
              className="text-5xl font-black tracking-tighter sm:text-6xl md:text-7xl text-zinc-950 break-keep leading-[1.35]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7, ease: "easeOut" }}
            >
              학원 학습 관리,<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-zinc-700 to-zinc-300">
                하나로 연결됩니다.
              </span>
            </motion.h1>

            <motion.p
              className="mx-auto max-w-xl text-base sm:text-lg text-zinc-500 leading-loose break-keep"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              학부모님께는 <strong className="text-zinc-700 font-bold">맞춤형 학습 리포트</strong>로,
              학생에게는 <strong className="text-zinc-700 font-bold">출결·과제·성적·질의응답</strong>을
              한 곳에서 제공하는 학원 전용 플랫폼입니다.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center justify-center gap-3 pt-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <a
                href="#for-parents"
                className="rounded-full bg-zinc-950 px-7 py-3.5 text-sm font-bold text-white hover:bg-zinc-800 transition-colors"
              >
                기능 살펴보기 ↓
              </a>
            </motion.div>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
