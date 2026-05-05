import { AcmeHero } from "@/components/landing/acme-hero";
import { TeacherIntro } from "@/components/landing/teacher-intro";
import { CurriculumSection } from "@/components/landing/curriculum-section";
import { ClosingSection } from "@/components/landing/closing-section";

export const metadata = {
  title: "dongdongmath",
  description: "차세대 학습 플랫폼 TeamDJ LMS",
};

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* 1. 상단: AcmeHero (스크롤 없이 바로 나타나는 연출) */}
      <AcmeHero />

      {/* 2. 중앙: TeacherIntro (선생님 소개 및 철학) */}
      <TeacherIntro />
      
      {/* 3. 하단: CurriculumSection (한눈에 보는 커리큘럼 표) */}
      <CurriculumSection />

      {/* 4. 마무리: ClosingSection (마무리 멘트 및 상담 신청) */}
      <ClosingSection />

      {/* 푸터 (심플) */}
      <footer className="py-12 bg-zinc-50 border-t border-zinc-200">
        <div className="container max-w-5xl mx-auto px-4 text-center">
          <p className="text-sm text-zinc-400">© 2026 TeamDJ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
