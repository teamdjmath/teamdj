import { AcmeHero } from "@/components/landing/acme-hero";
import { TeacherIntro } from "@/components/landing/teacher-intro";
import { CurriculumSection } from "@/components/landing/curriculum-section";
import { ClosingSection } from "@/components/landing/closing-section";
import { LandingNav } from "@/components/landing/landing-nav";

export const metadata = {
  title: "dongdongmath",
  description: "차세대 학습 플랫폼 TeamDJ LMS",
};

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      <LandingNav />

      {/* 1. 상단: AcmeHero */}
      <div id="intro">
        <AcmeHero />
      </div>

      {/* 2. 중앙: TeacherIntro */}
      <TeacherIntro />

      {/* 3. 하단: CurriculumSection */}
      <CurriculumSection />

      {/* 4. 마무리: ClosingSection */}
      <ClosingSection />

      {/* 푸터 */}
      <footer className="py-12 bg-zinc-50 border-t border-zinc-200">
        <div className="container max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-zinc-400">© 2026 TeamDJ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
