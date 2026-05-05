"use client";

import { motion } from "motion/react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function IntroHero() {
  return (
    <div className="container max-w-5xl mx-auto">
      <header className="relative pt-4">
        <nav className="flex items-center justify-between rounded-xl bg-white py-2 px-4 shadow-lg border border-zinc-200">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-lg font-black tracking-tighter text-zinc-950 uppercase italic">
              TeamDJ
            </Link>
          </div>
          <div className="flex items-center space-x-3">
            <Button asChild className="hidden md:inline-flex h-7 rounded-full bg-zinc-950 px-4 text-sm font-bold text-white hover:bg-zinc-800">
              <Link href="/login">로그인</Link>
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 md:hidden">
                  <Menu className="h-[15px] w-[15px]" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[240px]">
                <nav className="flex flex-col space-y-4 pt-8">
                  <Link href="/login" className="text-sm font-medium">로그인</Link>
                  <Link href="/" className="text-sm text-zinc-500">홈으로</Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      <main className="relative container px-2 mx-auto">
        <section className="w-full pt-20 pb-16 md:pt-24 md:pb-20 lg:pt-32 lg:pb-24">
          <motion.div
            className="flex flex-col items-center space-y-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="px-4 py-1.5 rounded-full bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-widest"
            >
              Platform Overview
            </motion.div>

            <motion.h1
              className="text-4xl font-black tracking-tighter sm:text-6xl md:text-7xl text-zinc-950 break-keep leading-[1.4]"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
            >
              저희 TeamDJ의<br />
              <span className="text-transparent bg-clip-text bg-linear-to-b from-zinc-950 to-zinc-400">
                새로운 차원을 소개합니다.
              </span>
            </motion.h1>

            <motion.p
              className="mx-auto max-w-2xl text-md sm:text-xl text-zinc-500 leading-loose break-keep"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              부가 설명 입력<br />
            </motion.p>
          </motion.div>
        </section>
      </main>
    </div>
  );
}
