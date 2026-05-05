"use client";

import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { motion } from "motion/react";
import Link from "next/link";

export function AcmeHero() {
  return (
    <div className="container max-w-5xl mx-auto">
      <header className="relative pt-4">
        <nav className="flex items-center justify-between rounded-xl bg-white py-2 px-4 shadow-lg border border-zinc-200">
          <div className="flex items-center space-x-6">
            <Link href="/" className="text-lg font-black tracking-tighter text-zinc-950 uppercase italic">
              TeamDJ
            </Link>
            <div className="hidden md:flex items-center space-x-6">
              <a href="/intro" className="text-sm text-zinc-500 hover:text-zinc-950 transition-colors">
                소개
              </a>
            </div>
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
                  <a href="/intro" className="text-sm text-zinc-500">소개</a>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      <main className="relative container px-2 mx-auto">
        <section className="w-full pt-12 pb-24 md:pt-16 md:pb-32 lg:pt-20 lg:pb-36">
          <motion.div
            className="flex flex-col items-center space-y-6 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-3 py-0.5 text-[10px] font-bold text-zinc-950 shadow-sm"
            >
              <span className="relative flex h-2 w-2 mr-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              2027학년도 수강생 모집 중
            </motion.div>

            <motion.h1
              className="text-4xl font-black tracking-tighter sm:text-6xl md:text-7xl lg:text-7xl/[1.4] text-zinc-950 break-keep"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              결국, 승부는<br />끝에서 뒤집힙니다.
            </motion.h1>
            <motion.p
              className="mx-auto max-w-2xl text-md sm:text-lg text-zinc-500 leading-loose tracking-tight break-keep"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              11월의 기초공사부터 수능 날의 마지막 스퍼트까지.<br />
              당신의 <span className="font-bold text-zinc-950 tracking-tighter">&apos;1등급 역전극&apos;</span>, 저희 TeamDJ가 함께합니다.
            </motion.p>

          </motion.div>
        </section>
      </main>
    </div>
  );
}
