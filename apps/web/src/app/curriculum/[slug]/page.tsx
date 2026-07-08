import Link from "next/link";
import { notFound } from "next/navigation";
import { LandingNav } from "@/components/landing/landing-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { CURRICULUM_DATA, findCurriculumCourse } from "@/lib/curriculum-data";

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
            <h2 className="text-xl font-black tracking-tighter text-zinc-950 mb-3">
              자체 제작 교재
            </h2>
            <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-10 text-center text-zinc-400 font-bold text-sm">
              상세 내용 준비 중
            </div>
          </section>
          <section>
            <h2 className="text-xl font-black tracking-tighter text-zinc-950 mb-3">수업 내용</h2>
            <div className="rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 p-10 text-center text-zinc-400 font-bold text-sm">
              상세 내용 준비 중
            </div>
          </section>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
