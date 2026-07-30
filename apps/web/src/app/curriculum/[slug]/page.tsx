/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { LandingNav } from "@/components/landing/landing-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { CURRICULUM_DATA, findCurriculumCourse, type CurriculumBook, type ClassInfo } from "@/lib/curriculum-data";

function BookHero({ book, reverse }: { book: CurriculumBook; reverse: boolean }) {
  return (
    <div className={`flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-8 md:gap-14`}>
      {/* 교재 이미지 */}
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

      {/* 텍스트 */}
      <div className="flex-1 text-center md:text-left">
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-2">{book.role}</p>
        <h3 className="text-3xl md:text-4xl font-black tracking-tighter text-zinc-950 mb-3">{book.name}</h3>
        <div className="w-12 h-1 bg-emerald-500 mx-auto md:mx-0 mb-5" />
        <p className="text-zinc-500 leading-relaxed break-keep mb-6">{book.desc}</p>

        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-5 py-4 text-left">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">구성 · 목차</p>
          <p className="text-sm text-zinc-300">준비 중입니다.</p>
        </div>
      </div>
    </div>
  );
}

// "\n"으로 구분된 주요 사실 한 줄 + 보충 설명 한 줄을 별도 줄로 렌더링
function InfoValue({ text }: { text: string }) {
  const [main, note] = text.split("\n");
  return (
    <>
      <p className="text-sm font-bold text-zinc-900 break-keep">{main}</p>
      {note && <p className="text-sm text-zinc-500 break-keep mt-0.5">{note}</p>}
    </>
  );
}

function ClassInfoSummary({ info }: { info: ClassInfo }) {
  return (
    <div className="rounded-2xl border border-zinc-200 p-6 md:p-8 mb-6">
      <dl className="grid sm:grid-cols-2 gap-5 mb-7">
        <div>
          <dt className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">난이도</dt>
          <dd><InfoValue text={info.level} /></dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">개강</dt>
          <dd><InfoValue text={info.startDate} /></dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1.5">과제</dt>
          <dd><InfoValue text={info.homework} /></dd>
        </div>
      </dl>

      <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-3">타임테이블</p>
      <ul className="space-y-3 mb-6">
        {info.timetable.map((t, i) => {
          const [main, note] = t.activity.split("\n");
          return (
            <li key={i} className="flex gap-4 text-sm">
              <span className="shrink-0 w-28 font-bold text-zinc-950">{t.time}</span>
              <span className="text-zinc-500 break-keep">
                {main}
                {note && <span className="block text-zinc-400 text-xs mt-0.5">{note}</span>}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-sm text-emerald-600 font-medium break-keep border-t border-zinc-100 pt-4">
        {info.note}
      </p>
    </div>
  );
}

export function generateStaticParams() {
  return CURRICULUM_DATA.flatMap((cat) => cat.courses.map((c) => ({ slug: c.slug })));
}

export default async function CurriculumDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const found = findCurriculumCourse(slug);
  if (!found) notFound();
  const { category, course } = found;

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <LandingNav />

      <div className="container max-w-3xl mx-auto px-4 py-14 md:py-24">
        <Link
          href="/#curriculum"
          className="text-sm font-bold text-zinc-500 hover:text-zinc-950 transition-colors"
        >
          ← 커리큘럼으로
        </Link>

        <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mt-8 mb-3">
          {category.category} · {category.grade}
        </p>
        <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-zinc-950 mb-8 break-keep">
          {course.name}
        </h1>
        <p className="text-lg text-zinc-600 leading-loose break-keep mb-14">{course.goal}</p>

        <div className="space-y-10">
          <section>
            <h2 className="text-xl font-black tracking-tighter text-zinc-950 mb-10">
              사용 교재
            </h2>
            {course.books ? (
              <div className="space-y-16 md:space-y-20">
                {course.books.map((book, i) => (
                  <BookHero key={book.name} book={book} reverse={i % 2 === 1} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-10 text-center text-zinc-400 font-bold text-sm">
                상세 내용 준비 중
              </div>
            )}
          </section>
          <section>
            <h2 className="text-xl font-black tracking-tighter text-zinc-950 mb-5">수업 내용</h2>
            {course.classInfo && <ClassInfoSummary info={course.classInfo} />}
            {course.blogUrl ? (
              <div className="rounded-3xl bg-zinc-950 text-white p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <p className="font-bold text-lg mb-1.5 break-keep">타임테이블, 난이도, 과제 안내까지</p>
                  <p className="text-zinc-400 text-sm break-keep">
                    이 반의 자세한 수업 안내는 아래 블로그 글에서 확인하실 수 있어요.
                  </p>
                </div>
                <a
                  href={course.blogUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-full bg-white text-zinc-950 font-bold text-sm px-6 py-3 hover:bg-zinc-100 transition-colors"
                >
                  블로그에서 확인하기
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </a>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-10 text-center text-zinc-400 font-bold text-sm">
                상세 내용 준비 중
              </div>
            )}
          </section>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
