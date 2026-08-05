/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { LandingNav } from "@/components/landing/landing-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { MATERIAL_LEVELS, type MaterialBook } from "@/lib/materials-data";

export const metadata: Metadata = {
  title: "교재 안내 | TeamDJ",
  description: "TeamDJ 전용 교재 체계 — DEEP, DETAIL, DEVELOP, DERIVE, DEVOTE, DECISIVE, DETERMINE",
};

function BookHero({ book, reverse }: { book: MaterialBook; reverse: boolean }) {
  return (
    <div className={`flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-8 md:gap-14`}>
      <div className="shrink-0">
        {book.img ? (
          <img
            src={book.img}
            alt={`${book.name} 교재 표지`}
            className="w-44 md:w-56 aspect-[3/4] object-cover rounded-xl shadow-xl shadow-zinc-200"
          />
        ) : (
          <div className="w-44 md:w-56 aspect-[3/4] rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center">
            <span className="text-xs font-medium text-zinc-300 text-center px-4 leading-relaxed">
              교재 이미지
              <br />
              준비 중
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 text-center md:text-left">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">{book.role}</p>
        <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-950 mb-3">{book.name}</h3>
        <div className="w-12 h-1 bg-emerald-500 mx-auto md:mx-0 mb-5" />
        <p className="text-zinc-500 leading-relaxed break-keep mb-6">{book.desc}</p>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4 text-left">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">특징</p>
          {book.details && book.details.length > 0 ? (
            <ul className="space-y-1.5">
              {book.details.map((d, i) => (
                <li key={i} className="text-sm text-zinc-600 leading-relaxed break-keep flex gap-2">
                  <span className="text-emerald-600 shrink-0">·</span>
                  {d}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-zinc-300">준비 중입니다.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MaterialsPage() {
  let bookIndex = 0;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <LandingNav />

      <div className="container max-w-3xl mx-auto px-4 py-14 md:py-24">
        <Link
          href="/#system"
          className="text-sm font-bold text-zinc-500 hover:text-zinc-950 transition-colors"
        >
          ← 돌아가기
        </Link>

        <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mt-8 mb-3">
          Materials
        </p>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-zinc-950 mb-8 break-keep">
          TeamDJ 교재 체계
        </h1>
        <p className="text-lg text-zinc-600 leading-loose break-keep mb-14">
          학생의 회독 수와 시기에 맞춘 7종 교재를 소개합니다.
        </p>

        <div className="space-y-20 md:space-y-24">
          {MATERIAL_LEVELS.map((level) => (
            <section key={level.tag}>
              <div className="mb-10">
                <span className="inline-block rounded-full bg-zinc-900 text-white text-sm font-black px-3.5 py-1.5 tracking-wide mb-2">
                  {level.tag}
                </span>
                <p className="text-sm text-zinc-500 break-keep">{level.audience}</p>
              </div>

              <div className="space-y-16 md:space-y-20">
                {level.books.map((book) => {
                  const reverse = bookIndex % 2 === 1;
                  bookIndex += 1;
                  return <BookHero key={book.name} book={book} reverse={reverse} />;
                })}
              </div>
            </section>
          ))}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
